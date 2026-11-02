package org.sbolcanvas.utils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.sbml.jsbml.Reaction;
import org.sbolstandard.core2.AccessType;
import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.DirectionType;
import org.sbolstandard.core2.Interaction;
import org.sbolstandard.core2.ModuleDefinition;
import org.sbolstandard.core2.Participation;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLReader;
import org.sbolstandard.core2.SystemsBiologyOntology;
import org.sbolcanvas.data.GlyphInfo;
import org.sbolcanvas.data.Info;
import org.sbolcanvas.data.InteractionInfo;
import org.sbolcanvas.data.ModuleInfo;

import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Simulation values on species, interactions and edges survive SBOL save, reopen and SBML export. */
class SimulationValueRoundTripTest {

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void annotatedValuesKeepTheirTypes(boolean reversible) throws Exception {
        SBOLDocument doc = SBOLTestSupport.loadSbol("sbolcanvas_biochemical-edge_sbol.xml");
        ComponentDefinition protein = null;
        for (ComponentDefinition component : doc.getComponentDefinitions()) {
            if (component.getTypes().contains(ComponentDefinition.PROTEIN)) protein = component;
        }
        assertNotNull(protein);
        Hashtable<String, Object> speciesData = new Hashtable<>();
        speciesData.put("initialAmount", 10.5);
        speciesData.put("boundaryCondition", reversible);
        SBOLTestSupport.writeAnnotatedSimulationData(protein, speciesData, protein.getDisplayId());
        Interaction interaction = interaction(doc);
        Hashtable<String, Object> reactionData = new Hashtable<>();
        reactionData.put("Kc_f", 0.125);
        reactionData.put("reversible", reversible);
        SBOLTestSupport.writeAnnotatedSimulationData(interaction, reactionData, interaction.getDisplayId());

        SBOLDocument reread = SBOLTestSupport.serializeAndReread(doc);
        SBOLToMx converter = SBOLTestSupport.convertToGraph(reread);
        GlyphInfo imported = (GlyphInfo) converter.infoDict.get(protein.getIdentity().toString());
        assertEquals(10.5, imported.getSimulationData().get("initialAmount"));
        assertEquals(reversible, imported.getSimulationData().get("boundaryCondition"));
        InteractionInfo importedReaction = converter.interactionDict.values().iterator().next();
        assertEquals(0.125, importedReaction.getSimulationData().get("Kc_f"));
        assertEquals(reversible, importedReaction.getSimulationData().get("reversible"));

        mxGraphModel graph = importModel(reread);
        org.sbml.jsbml.Model sbml = GraphModelSupport.toSbmlModel(graph);
        assertEquals(reversible, sbml.getReaction(0).getReversible());
        assertEquals(reversible, sbml.getSpecies("luxI").getBoundaryCondition());

        SBOLDocument exported = exportSbol(graph);
        Map<String, Object> values = SBOLTestSupport.modelEntries(exported, interaction(exported).getIdentity());
        assertEquals(Boolean.valueOf(reversible), values.get("reversible"));
        assertEquals(0.125, values.get("Kc_f"));
        Reaction reaction = GraphModelSupport.toSbmlModel(importModel(exported)).getReaction(0);
        assertEquals(reversible, reaction.getReversible());
        assertEquals(0.125, reaction.getKineticLaw().getLocalParameter("k").getValue());
    }

    @Test
    void repeatedSpeciesEdgesKeepTheirCoefficients() throws Exception {
        GraphModelSupport.ensureCodecsRegistered();
        GlyphInfo protein = GraphModelSupport.glyphInfo("protein", "Protein");
        ModuleInfo module = GraphModelSupport.moduleInfo("module");
        InteractionInfo reaction = GraphModelSupport.interactionInfo("reaction", "Biochemical Reaction");
        reaction.getSimulationData().put("reversible", true);
        mxGraphModel graph = new mxGraphModel();
        GraphModelSupport.install(graph, GraphModelSupport.dataContainer(Arrays.<Info>asList(protein, module),
                Collections.singletonList(reaction)));
        mxCell view = GraphModelSupport.moduleViewCell(graph, module.getFullURI());
        mxCell species = GraphModelSupport.species(graph, view, protein.getFullURI());
        mxCell node = GraphModelSupport.interactionNode(graph, view, reaction.getFullURI());
        mxCell reactant = GraphModelSupport.processEdge(graph, view, reaction.getFullURI(), species, node);
        mxCell modifier = GraphModelSupport.processEdge(graph, view, reaction.getFullURI(), species, node);
        mxCell product = GraphModelSupport.processEdge(graph, view, reaction.getFullURI(), node, species);
        reaction.getSourceCoefficient().put(reactant.getId(), 2.0);
        reaction.getSourceRefinement().put(modifier.getId(), "Modifier");
        reaction.getTargetCoefficient().put(product.getId(), 7.0);

        SBOLDocument doc = exportSbol(graph);
        Set<Double> coefficients = new HashSet<>();
        Set<URI> participants = new HashSet<>();
        int modifiers = 0;
        for (Participation participation : interaction(doc).getParticipations()) {
            participants.add(participation.getParticipantURI());
            Object coefficient = SBOLTestSupport.modelEntries(doc, participation.getIdentity()).get("coefficient");
            if (coefficient != null) coefficients.add((Double) coefficient);
            if (participation.getRoles().contains(SystemsBiologyOntology.MODIFIER)) modifiers++;
        }
        assertEquals(new HashSet<>(Arrays.asList(2.0, 7.0)), coefficients);
        assertEquals(1, participants.size());
        assertEquals(1, modifiers);

        InteractionInfo restored = GraphModelSupport.importedInteraction(
                importModel(SBOLTestSupport.serializeAndReread(doc)), "reaction");
        assertEquals(Collections.singleton(2.0), new HashSet<>(restored.getSourceCoefficient().values()));
        assertEquals(Collections.singleton(7.0), new HashSet<>(restored.getTargetCoefficient().values()));
    }

    @Test
    void selfEdgeKeepsBothCoefficients() throws Exception {
        GraphModelSupport.ensureCodecsRegistered();
        GlyphInfo protein = GraphModelSupport.glyphInfo("protein", "Protein");
        ModuleInfo module = GraphModelSupport.moduleInfo("module");
        InteractionInfo reaction = GraphModelSupport.interactionInfo("reaction", "Process");
        reaction.getSimulationData().put("reversible", true);
        mxGraphModel graph = new mxGraphModel();
        GraphModelSupport.install(graph, GraphModelSupport.dataContainer(Arrays.<Info>asList(protein, module),
                Collections.singletonList(reaction)));
        mxCell view = GraphModelSupport.moduleViewCell(graph, module.getFullURI());
        mxCell species = GraphModelSupport.species(graph, view, protein.getFullURI());
        mxCell edge = GraphModelSupport.processEdge(graph, view, reaction.getFullURI(), species, species);
        reaction.getSourceCoefficient().put(edge.getId(), 3.0);
        reaction.getTargetCoefficient().put(edge.getId(), 7.0);
        for (mxGraphModel model : Arrays.asList(graph, GraphModelSupport.sbolRoundTrip(graph))) {
            Reaction emitted = GraphModelSupport.toSbmlModel(model).getReaction(0);
            assertEquals(3.0, emitted.getReactant(0).getStoichiometry());
            assertEquals(7.0, emitted.getProduct(0).getStoichiometry());
        }
    }

    @Test
    void edgeCoefficientsFollowDistinctInstances() throws Exception {
        GraphModelSupport.ensureCodecsRegistered();
        GlyphInfo protein = GraphModelSupport.glyphInfo("protein", "Protein");
        ModuleInfo module = GraphModelSupport.moduleInfo("module");
        InteractionInfo reaction = GraphModelSupport.interactionInfo("reaction", "Biochemical Reaction");
        mxGraphModel graph = new mxGraphModel();
        GraphModelSupport.install(graph, GraphModelSupport.dataContainer(Arrays.<Info>asList(protein, module),
                Collections.singletonList(reaction)));
        mxCell view = GraphModelSupport.moduleViewCell(graph, module.getFullURI());
        mxCell first = GraphModelSupport.species(graph, view, protein.getFullURI());
        first.getGeometry().setX(10);
        mxCell second = GraphModelSupport.species(graph, view, protein.getFullURI());
        second.getGeometry().setX(500);
        mxCell edge = GraphModelSupport.processEdge(graph, view, reaction.getFullURI(), first, second);
        reaction.getSourceCoefficient().put(edge.getId(), 2.0);
        reaction.getTargetCoefficient().put(edge.getId(), 5.0);

        mxGraphModel imported = GraphModelSupport.sbolRoundTrip(graph);
        InteractionInfo restored = GraphModelSupport.importedInteraction(imported, "reaction");
        mxCell restoredEdge = GraphModelSupport.cellWithValue(imported, restored.getFullURI());
        assertNotNull(restoredEdge);
        assertTrue(restoredEdge.isEdge());
        assertEquals(10.0, ((mxCell) restoredEdge.getSource()).getGeometry().getX());
        assertEquals(500.0, ((mxCell) restoredEdge.getTarget()).getGeometry().getX());
        assertEquals(2.0, restored.getSourceCoefficient().get(restoredEdge.getId()));
        assertEquals(5.0, restored.getTargetCoefficient().get(restoredEdge.getId()));
        Reaction emitted = GraphModelSupport.toSbmlModel(imported).getReaction(0);
        assertEquals(2.0, emitted.getReactant(0).getStoichiometry());
        assertEquals(5.0, emitted.getProduct(0).getStoichiometry());
        assertFalse(emitted.getReactant(0).getSpecies().equals(emitted.getProduct(0).getSpecies()));
    }

    @Test
    void nodeCoefficientsStayOnTheirEdgesAfterDeleteAndResave() throws Exception {
        GraphModelSupport.ensureCodecsRegistered();
        GlyphInfo protein = GraphModelSupport.glyphInfo("protein", "Protein");
        ModuleInfo module = GraphModelSupport.moduleInfo("module");
        InteractionInfo reaction = GraphModelSupport.interactionInfo("reaction", "Biochemical Reaction");
        mxGraphModel graph = new mxGraphModel();
        GraphModelSupport.install(graph, GraphModelSupport.dataContainer(Arrays.<Info>asList(protein, module),
                Collections.singletonList(reaction)));
        mxCell view = GraphModelSupport.moduleViewCell(graph, module.getFullURI());
        mxCell node = GraphModelSupport.interactionNode(graph, view, reaction.getFullURI());
        double[] xs = {10, 100, 200, 300};
        double[] coefficients = {2.0, 3.0, 5.0, 7.0};
        for (int i = 0; i < xs.length; i++) {
            mxCell species = GraphModelSupport.species(graph, view, protein.getFullURI());
            species.getGeometry().setX(xs[i]);
            boolean product = i == xs.length - 1;
            mxCell edge = GraphModelSupport.processEdge(graph, view, reaction.getFullURI(),
                    product ? node : species, product ? species : node);
            (product ? reaction.getTargetCoefficient() : reaction.getSourceCoefficient()).put(edge.getId(), coefficients[i]);
        }

        mxGraphModel reopened = GraphModelSupport.sbolRoundTrip(graph);
        reopened.remove(edgeFromSpeciesAt(reopened, 10));
        mxGraphModel resaved = GraphModelSupport.sbolRoundTrip(reopened);

        InteractionInfo restored = GraphModelSupport.importedInteraction(resaved, "reaction");
        assertNull(edgeFromSpeciesAt(resaved, 10));
        for (int i = 1; i < xs.length; i++) {
            mxCell edge = edgeFromSpeciesAt(resaved, xs[i]);
            assertNotNull(edge);
            boolean product = i == xs.length - 1;
            assertEquals(coefficients[i],
                    (product ? restored.getTargetCoefficient() : restored.getSourceCoefficient()).get(edge.getId()),
                    "coefficient of the edge at x=" + xs[i]);
        }
    }

    @Test
    void unknownInteractionKeyIsKeptAndDoesNotFailExport() throws Exception {
        GraphModelSupport.ensureCodecsRegistered();
        InteractionInfo reaction = GraphModelSupport.interactionInfo("reaction", "Biochemical Reaction");
        reaction.getSimulationData().put("unknown", 2.0);
        mxGraphModel graph = new mxGraphModel();
        GraphModelSupport.install(graph, GraphModelSupport.dataContainer(Collections.<Info>emptyList(),
                Collections.singletonList(reaction)));
        GraphModelSupport.viewCell(graph);
        byte[] xml = GraphModelSupport.encodeModel(graph).getBytes("UTF-8");
        new MxToSBML().toSBML(new ByteArrayInputStream(xml), new ByteArrayOutputStream());
        InteractionInfo kept = GraphModelSupport.importedInteraction(
                GraphModelSupport.loadedModel(GraphModelSupport.encodeModel(graph)), "reaction");
        assertNotNull(kept);
        assertEquals(2.0, kept.getSimulationData().get("unknown"));
    }

    @Test
    void unknownAnnotatedKeysSurviveSaveAndReopen() throws Exception {
        SBOLDocument source = new SBOLDocument();
        source.setDefaultURIprefix(Converter.URI_PREFIX);
        ComponentDefinition protein = source.createComponentDefinition("protein", "1", ComponentDefinition.PROTEIN);
        ModuleDefinition module = source.createModuleDefinition("module", "1");
        module.createFunctionalComponent("instance", AccessType.PUBLIC, protein.getIdentity(), DirectionType.INOUT);
        protein.createAnnotation(Converter.createQName("simulationData"),
                Converter.createQName("SimulationData"), "data", Arrays.asList(
                        new Annotation(Converter.createQName("initialAmount"), "2.5"),
                        new Annotation(Converter.createQName("extensionNumber"), "0.125"),
                        new Annotation(Converter.createQName("extensionBoolean"), "false"),
                        new Annotation(Converter.createQName("extensionText"), "custom")));

        SBOLDocument saved = exportSbol(importModel(source));
        SBOLToMx reopened = SBOLTestSupport.convertToGraph(SBOLTestSupport.serializeAndReread(saved));
        GlyphInfo reloaded = (GlyphInfo) reopened.infoDict.get(protein.getIdentity().toString());
        Map<String, Object> expected = new HashMap<>();
        expected.put("initialAmount", 2.5);
        expected.put("extensionNumber", "0.125");
        expected.put("extensionBoolean", "false");
        expected.put("extensionText", "custom");
        assertEquals(expected, reloaded.getSimulationData());
    }

    @Test
    void promoterAndUnknownKeysOnSpeciesSurviveSaveAndReopen() throws Exception {
        GraphModelSupport.ensureCodecsRegistered();
        GlyphInfo protein = GraphModelSupport.glyphInfo("protein", "Protein");
        protein.setPartRole("CDS (Coding Sequence)");
        protein.setSimulationData(new Hashtable<String, Object>());
        protein.getSimulationData().put("initialAmount", 4.0);
        protein.getSimulationData().put("ng", 2.0);
        protein.getSimulationData().put("unknown", 1.0);
        ModuleInfo module = GraphModelSupport.moduleInfo("module");
        mxGraphModel graph = new mxGraphModel();
        GraphModelSupport.install(graph, GraphModelSupport.dataContainer(
                Arrays.<Info>asList(protein, module), Collections.<InteractionInfo>emptyList()));
        mxCell view = GraphModelSupport.moduleViewCell(graph, module.getFullURI());
        GraphModelSupport.species(graph, view, protein.getFullURI());
        byte[] xml = GraphModelSupport.encodeModel(graph).getBytes("UTF-8");
        new MxToSBML().toSBML(new ByteArrayInputStream(xml), new ByteArrayOutputStream());

        SBOLDocument doc = exportSbol(graph);
        ComponentDefinition definition = doc.getComponentDefinitions().iterator().next();
        assertTrue(definition.getTypes().contains(ComponentDefinition.PROTEIN), "the SBOL type is unchanged");
        assertFalse(definition.getRoles().contains(SBOLData.roles.getValue("Pro (Promoter)")),
                "the SBOL role is unchanged");
        GlyphInfo reloaded = (GlyphInfo) SBOLTestSupport.convertToGraph(SBOLTestSupport.serializeAndReread(doc))
                .infoDict.get(definition.getIdentity().toString());
        assertEquals(4.0, reloaded.getSimulationData().get("initialAmount"));
        assertEquals(2.0, reloaded.getSimulationData().get("ng"));
        assertEquals(1.0, reloaded.getSimulationData().get("unknown"));
    }

    private static mxCell edgeFromSpeciesAt(mxGraphModel model, double x) {
        for (Object value : model.getCells().values()) {
            mxCell cell = (mxCell) value;
            if (!cell.isEdge()) continue;
            for (Object end : new Object[] {cell.getSource(), cell.getTarget()}) {
                mxCell species = (mxCell) end;
                if (species != null && species.getStyle() != null
                        && species.getStyle().contains(Converter.STYLE_MOLECULAR_SPECIES)
                        && species.getGeometry().getX() == x)
                    return cell;
            }
        }
        return null;
    }

    private static Interaction interaction(SBOLDocument doc) {
        return doc.getRootModuleDefinitions().iterator().next().getInteractions().iterator().next();
    }

    private static SBOLDocument exportSbol(mxGraphModel graph) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        new MxToSBOL(new HashMap<String, String>()).toSBOL(
                new ByteArrayInputStream(GraphModelSupport.encodeModel(graph).getBytes("UTF-8")), out);
        return SBOLReader.read(new ByteArrayInputStream(out.toByteArray()));
    }

    private static mxGraphModel importModel(SBOLDocument doc) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        new SBOLToMx().toGraph(doc, out);
        return GraphModelSupport.decodeModel(out.toString("UTF-8"));
    }
}
