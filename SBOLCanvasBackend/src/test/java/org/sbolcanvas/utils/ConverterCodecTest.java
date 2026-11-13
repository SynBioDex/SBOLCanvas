package org.sbolcanvas.utils;

import java.util.Hashtable;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.GenericTopLevel;

import com.mxgraph.io.mxCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.util.mxXmlUtils;
import com.mxgraph.view.mxGraph;

import org.w3c.dom.Document;
import org.w3c.dom.Node;

import org.sbolcanvas.data.GlyphInfo;
import org.sbolcanvas.data.InteractionInfo;
import org.sbolcanvas.data.EventInfo;

/** Tests for mxCodec encode/decode of data model classes and SBOL annotations. */
class ConverterCodecTest {

    @BeforeAll
    static void ensureCodecsRegistered() throws Exception {
        Class.forName("org.sbolcanvas.utils.Converter");
    }

    private static String encodeCellValueToXml(Object value) {
        mxGraph graph = new mxGraph();
        mxGraphModel model = (mxGraphModel) graph.getModel();

        model.beginUpdate();
        try {
            mxCell cell = (mxCell) model.getCell("1");
            cell.setValue(value);
        } finally {
            model.endUpdate();
        }

        mxCodec encoder = new mxCodec();
        Node encodedNode = encoder.encode(model);
        return mxXmlUtils.getXml(encodedNode);
    }

    private static Object encodeDecodeCellValue(Object value) {
        String xml = encodeCellValueToXml(value);

        Document doc = mxXmlUtils.parseXml(xml);
        mxCodec decoder = new mxCodec(doc);
        mxGraphModel decoded = new mxGraphModel();
        decoder.decode(doc.getDocumentElement(), decoded);

        mxCell decodedCell = (mxCell) decoded.getCell("1");
        assertNotNull(decodedCell, "Decoded graph should have cell '1'");
        return decodedCell.getValue();
    }

    @Nested
    @DisplayName("GlyphInfo Codec")
    class GlyphInfoCodec {

        @Test
        @DisplayName("simulationData survives encode/decode as Hashtable")
        void simulationDataPreservedAsHashtable() {
            GlyphInfo original = new GlyphInfo();
            Hashtable<String, Object> simData = new Hashtable<>();
            simData.put("initialAmount", 100.0);
            simData.put("boundaryCondition", Boolean.FALSE);
            original.setSimulationData(simData);

            Object decoded = encodeDecodeCellValue(original);
            assertInstanceOf(GlyphInfo.class, decoded, "Decoded value should be GlyphInfo");
            GlyphInfo decodedGlyph = (GlyphInfo) decoded;

            Hashtable<String, Object> decodedSimData = decodedGlyph.getSimulationData();
            assertNotNull(decodedSimData, "simulationData should not be null after decode");
            assertInstanceOf(Hashtable.class, decodedSimData,
                    "simulationData should be Hashtable, not ArrayList");
            assertEquals(100.0, decodedSimData.get("initialAmount"));
            assertEquals(Boolean.FALSE, decodedSimData.get("boundaryCondition"));
        }

    }

    @Nested
    @DisplayName("InteractionInfo Codec")
    class InteractionInfoCodec {

        @Test
        @DisplayName("simulationData survives encode/decode as Hashtable")
        void simulationDataPreservedAsHashtable() {
            InteractionInfo original = new InteractionInfo();
            original.setInteractionType("Inhibition");
            Hashtable<String, Object> simData = new Hashtable<>();
            simData.put("Kr_f", 0.5);
            simData.put("Kr_r", 1.0);
            simData.put("cooperativity", 2.0);
            original.setSimulationData(simData);

            Object decoded = encodeDecodeCellValue(original);
            assertInstanceOf(InteractionInfo.class, decoded);
            InteractionInfo decodedInfo = (InteractionInfo) decoded;

            Hashtable<String, Object> decodedSimData = decodedInfo.getSimulationData();
            assertNotNull(decodedSimData, "simulationData should not be null after decode");
            assertInstanceOf(Hashtable.class, decodedSimData,
                    "simulationData should be Hashtable, not ArrayList");
            assertEquals(3, decodedSimData.size());
            assertEquals(0.5, decodedSimData.get("Kr_f"));
            assertEquals(1.0, decodedSimData.get("Kr_r"));
            assertEquals(2.0, decodedSimData.get("cooperativity"));
        }

    }

    @Nested
    @DisplayName("EventInfo Codec")
    class EventInfoCodec {

        @Test
        @DisplayName("name, description, and simulationData all survive encode/decode")
        void nameDescriptionAndSimulationDataPreserved() {
            EventInfo original = new EventInfo();
            original.setName("IPTG_High");
            original.setDescription("IPTG set to high level");
            Hashtable<String, Object> simData = new Hashtable<>();
            simData.put("targetSpecies", "https://sbolcanvas.org/LacI/1");
            simData.put("delay", 100.0);
            simData.put("assignmentValue", 50.0);
            original.setSimulationData(simData);

            Object decoded = encodeDecodeCellValue(original);
            assertInstanceOf(EventInfo.class, decoded);
            EventInfo decodedInfo = (EventInfo) decoded;

            assertEquals("IPTG_High", decodedInfo.getName(),
                    "name field should survive encode/decode");
            assertEquals("IPTG set to high level", decodedInfo.getDescription(),
                    "description field should survive encode/decode");

            Hashtable<String, Object> decodedSimData = decodedInfo.getSimulationData();
            assertNotNull(decodedSimData, "simulationData should not be null after decode");
            assertInstanceOf(Hashtable.class, decodedSimData,
                    "simulationData should be Hashtable, not ArrayList");
            assertEquals("https://sbolcanvas.org/LacI/1", decodedSimData.get("targetSpecies"));
            assertEquals(100.0, decodedSimData.get("delay"));
            assertEquals(50.0, decodedSimData.get("assignmentValue"));
        }

    }

    @Test
    void loadingTypesParametersAndCoefficients() throws Exception {
        GlyphInfo protein = GraphModelSupport.glyphInfo("protein", "Protein");
        protein.setSimulationData(new Hashtable<String, Object>());
        protein.getSimulationData().put("initialAmount", 2.5);
        protein.getSimulationData().put("boundaryCondition", Boolean.TRUE);
        InteractionInfo reaction = GraphModelSupport.interactionInfo("reaction", "Biochemical Reaction");
        reaction.getSimulationData().put("Kc_f", 0.05);
        reaction.getSimulationData().put("reversible", Boolean.FALSE);
        mxGraphModel graph = new mxGraphModel();
        java.util.ArrayList<Object> container = GraphModelSupport.dataContainer(
                java.util.Collections.<org.sbolcanvas.data.Info>singletonList(protein),
                java.util.Collections.singletonList(reaction));
        GraphModelSupport.install(graph, container);
        mxCell view = GraphModelSupport.viewCell(graph);
        mxCell species = GraphModelSupport.species(graph, view, protein.getFullURI());
        mxCell edge = GraphModelSupport.processEdge(graph, view, reaction.getFullURI(), species, species);
        reaction.getSourceCoefficient().put(edge.getId(), 3.5);
        reaction.getTargetCoefficient().put(edge.getId(), 7.0);
        reaction.getSourceRefinement().put(edge.getId(), "Modifier");
        MxToSBML converter = new MxToSBML();
        converter.loadGraphAndDictionaries(new java.io.ByteArrayInputStream(
                GraphModelSupport.encodeModel(graph).getBytes("UTF-8")));
        GlyphInfo decoded = (GlyphInfo) converter.infoDict.get(protein.getFullURI());
        assertEquals(2.5, decoded.getSimulationData().get("initialAmount"));
        assertEquals(true, decoded.getSimulationData().get("boundaryCondition"));
        InteractionInfo decodedReaction = converter.interactionDict.get(reaction.getFullURI());
        assertEquals(0.05, decodedReaction.getSimulationData().get("Kc_f"));
        assertEquals(false, decodedReaction.getSimulationData().get("reversible"));
        assertEquals(3.5, decodedReaction.getSourceCoefficient().get(edge.getId()));
        assertEquals(7.0, decodedReaction.getTargetCoefficient().get(edge.getId()));
        assertEquals(reaction.getSourceRefinement(), decodedReaction.getSourceRefinement());
        }

    @Test
    void explicitZeroAndFalseSurviveLoadWithoutDefaults() throws Exception {
        GlyphInfo protein = GraphModelSupport.glyphInfo("protein", "Protein");
        protein.setName("explicit name");
        protein.setSimulationData(new Hashtable<String, Object>());
        protein.getSimulationData().put("initialAmount", 0.0);
        protein.getSimulationData().put("boundaryCondition", Boolean.FALSE);
        InteractionInfo reaction = GraphModelSupport.interactionInfo("reaction", "Biochemical Reaction");
        reaction.getSimulationData().put("Kc_f", 0.0);
        reaction.getSimulationData().put("reversible", Boolean.FALSE);
        mxGraphModel graph = new mxGraphModel();
        java.util.ArrayList<Object> container = GraphModelSupport.dataContainer(
                java.util.Collections.<org.sbolcanvas.data.Info>singletonList(protein),
                java.util.Collections.singletonList(reaction));
        GraphModelSupport.install(graph, container);
        mxCell view = GraphModelSupport.viewCell(graph);
        mxCell species = GraphModelSupport.species(graph, view, protein.getFullURI());
        mxCell edge = GraphModelSupport.processEdge(graph, view, reaction.getFullURI(), species, species);
        reaction.getSourceCoefficient().put(edge.getId(), 0.0);
        MxToSBML converter = new MxToSBML();
        converter.loadGraphAndDictionaries(new java.io.ByteArrayInputStream(
                GraphModelSupport.encodeModel(graph).getBytes("UTF-8")));
        GlyphInfo decodedGlyph = (GlyphInfo) converter.infoDict.get(protein.getFullURI());
        assertEquals(0.0, decodedGlyph.getSimulationData().get("initialAmount"));
        assertEquals(Boolean.FALSE, decodedGlyph.getSimulationData().get("boundaryCondition"));
        assertEquals("explicit name", decodedGlyph.getName());
        assertEquals(2, decodedGlyph.getSimulationData().size());
        InteractionInfo decodedReaction = converter.interactionDict.get(reaction.getFullURI());
        assertEquals(0.0, decodedReaction.getSimulationData().get("Kc_f"));
        assertEquals(Boolean.FALSE, decodedReaction.getSimulationData().get("reversible"));
        assertEquals(0.0, decodedReaction.getSourceCoefficient().get(edge.getId()));
        assertFalse(decodedReaction.getSimulationData().containsKey("Kc_r"));
    }

}
