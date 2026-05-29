package org.sbolcanvas.utils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Hashtable;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.sbml.jsbml.ASTNode;
import org.sbml.jsbml.Compartment;
import org.sbml.jsbml.Model;
import org.sbml.jsbml.Reaction;
import org.sbml.jsbml.KineticLaw;
import org.sbml.jsbml.SBMLDocument;
import org.sbml.jsbml.Species;

import com.mxgraph.model.mxCell;

import org.sbolcanvas.data.GlyphInfo;
import org.sbolcanvas.data.InteractionInfo;

/** MxToSBML formula AST vs iBioSim reference exports across the seven regulator variants. */
class KineticLawBaselineTest {

    private MxToSBML converter;
    private Model sbmlModel;

    @BeforeEach
    void setup() {
        converter = new MxToSBML();

        SBMLDocument doc = new SBMLDocument(3, 2);
        sbmlModel = doc.createModel("test");
        Compartment c = sbmlModel.createCompartment("Cell");
        c.setConstant(true);
        c.setSize(1);
    }

    private static ASTNode getExpectedAst(String resourceName) {
        SBMLDocument doc = SBMLAssertions.loadFromClasspath(resourceName);
        Reaction r = doc.getModel().getReaction("Production_P0");
        return r.getKineticLaw().getMath();
    }

    private static GlyphInfo createPromoterInfo() {
        GlyphInfo info = new GlyphInfo();
        Hashtable<String, Object> simData = new Hashtable<>();
        simData.put("ko", 0.05);
        simData.put("kb", 0.0001);
        simData.put("ka", 0.25);
        simData.put("ko_f", 0.033);
        simData.put("ko_r", 1.0);
        simData.put("kao_f", 1.0);
        simData.put("kao_r", 1.0);
        simData.put("nr", 30.0);
        info.setSimulationData(simData);
        return info;
    }

    private mxCell createRegulatorEdge(String speciesId, String edgeKey,
            String interactionType, Hashtable<String, Object> edgeSimData) {
        Species species = sbmlModel.getSpecies(speciesId);
        if (species == null) {
            species = sbmlModel.createSpecies(speciesId);
            species.setCompartment("Cell");
            species.setInitialAmount(0);
            species.setBoundaryCondition(false);
            species.setConstant(false);
            species.setHasOnlySubstanceUnits(true);
        }

        String glyphKey = "glyph_" + speciesId;
        converter.glyphToSpeciesData.put(glyphKey,
                new MxToSBML.SpeciesData(species, null));

        mxCell sourceCell = new mxCell(glyphKey);

        mxCell edge = new mxCell(edgeKey);
        edge.setSource(sourceCell);

        InteractionInfo interactionInfo = new InteractionInfo();
        interactionInfo.setInteractionType(interactionType);
        if (edgeSimData != null) {
            interactionInfo.setSimulationData(edgeSimData);
        }
        converter.interactionDict.put(edgeKey, interactionInfo);

        return edge;
    }

    private static Hashtable<String, Object> defaultRepressorSimData() {
        Hashtable<String, Object> simData = new Hashtable<>();
        simData.put("kr_f", 0.5);
        simData.put("kr_r", 1.0);
        simData.put("nc", 2.0);
        return simData;
    }

    private static Hashtable<String, Object> defaultActivatorSimData() {
        Hashtable<String, Object> simData = new Hashtable<>();
        simData.put("ka_f", 0.0033);
        simData.put("ka_r", 1.0);
        simData.put("nc", 2.0);
        return simData;
    }

    private static ASTNode getActualAst(Reaction reaction) {
        KineticLaw law = reaction.getKineticLaw();
        assertNotNull(law, "Reaction should have kinetic law after formula builder runs");
        ASTNode math = law.getMath();
        assertNotNull(math, "Kinetic law should have math");
        return math;
    }

    @Nested
    @DisplayName("buildRepressionFormula")
    class RepressionTests {

        @Test
        @DisplayName("0 repressors (constitutive) matches ibiosim_constitutive_promoter.xml")
        void zeroRepressorsMatchesConstitutiveBaseline() {
            ASTNode expected = getExpectedAst("ibiosim_constitutive_promoter.xml");

            Reaction reaction = sbmlModel.createReaction("Production_P0");
            reaction.setReversible(false);

            converter.buildRepressionFormula(reaction, "P0", createPromoterInfo(),
                    Collections.emptyList());

            ASTAssertions.assertAstEquals(expected, getActualAst(reaction),
                    "Repression with 0 repressors should match constitutive baseline");
        }

        @Test
        @DisplayName("1 repressor matches ibiosim_single_repressor.xml")
        void singleRepressor() {
            ASTNode expected = getExpectedAst("ibiosim_single_repressor.xml");

            Reaction reaction = sbmlModel.createReaction("Production_P0");
            reaction.setReversible(false);

            mxCell rep = createRegulatorEdge("S0", "inh_S0",
                    "Inhibition", defaultRepressorSimData());

            List<mxCell> repressors = new ArrayList<>();
            repressors.add(rep);
            converter.buildRepressionFormula(reaction, "P0", createPromoterInfo(), repressors);

            ASTNode actualGlobalized = ASTAssertions.rewriteParamNames(getActualAst(reaction), "S0");
            ASTAssertions.assertAstEquals(expected, actualGlobalized,
                    "Repression with 1 repressor should match single repressor baseline (globalized)");
        }

        @Test
        @DisplayName("2 repressors matches ibiosim_two_repressors.xml")
        void twoRepressors() {
            ASTNode expected = getExpectedAst("ibiosim_two_repressors.xml");

            Reaction reaction = sbmlModel.createReaction("Production_P0");
            reaction.setReversible(false);

            mxCell rep0 = createRegulatorEdge("S0", "inh_S0",
                    "Inhibition", defaultRepressorSimData());
            mxCell rep1 = createRegulatorEdge("S1", "inh_S1",
                    "Inhibition", defaultRepressorSimData());

            List<mxCell> repressors = new ArrayList<>();
            repressors.add(rep0);
            repressors.add(rep1);
            converter.buildRepressionFormula(reaction, "P0", createPromoterInfo(), repressors);

            ASTNode actualGlobalized = ASTAssertions.rewriteParamNames(getActualAst(reaction), "S0", "S1");
            ASTAssertions.assertAstEquals(expected, actualGlobalized,
                    "Repression with 2 repressors should match two repressors baseline (globalized)");
        }
    }

    @Nested
    @DisplayName("buildActivationFormula")
    class ActivationTests {

        @Test
        @DisplayName("1 activator matches ibiosim_single_activator.xml")
        void singleActivator() {
            ASTNode expected = getExpectedAst("ibiosim_single_activator.xml");

            Reaction reaction = sbmlModel.createReaction("Production_P0");
            reaction.setReversible(false);

            mxCell act = createRegulatorEdge("S0", "stim_S0",
                    "Stimulation", defaultActivatorSimData());

            List<mxCell> activators = new ArrayList<>();
            activators.add(act);
            converter.buildActivationFormula(reaction, "P0", createPromoterInfo(),
                    activators, Collections.emptyList());

            ASTNode actualGlobalized = ASTAssertions.rewriteParamNames(getActualAst(reaction), "S0");
            ASTAssertions.assertAstEquals(expected, actualGlobalized,
                    "Activation with 1 activator should match single activator baseline (globalized)");
        }

        @Test
        @DisplayName("2 activators matches ibiosim_two_activators.xml")
        void twoActivators() {
            ASTNode expected = getExpectedAst("ibiosim_two_activators.xml");

            Reaction reaction = sbmlModel.createReaction("Production_P0");
            reaction.setReversible(false);

            mxCell act0 = createRegulatorEdge("S0", "stim_S0",
                    "Stimulation", defaultActivatorSimData());
            mxCell act1 = createRegulatorEdge("S1", "stim_S1",
                    "Stimulation", defaultActivatorSimData());

            List<mxCell> activators = new ArrayList<>();
            activators.add(act0);
            activators.add(act1);
            converter.buildActivationFormula(reaction, "P0", createPromoterInfo(),
                    activators, Collections.emptyList());

            ASTNode actualGlobalized = ASTAssertions.rewriteParamNames(getActualAst(reaction), "S0", "S1");
            ASTAssertions.assertAstEquals(expected, actualGlobalized,
                    "Activation with 2 activators should match two activators baseline (globalized)");
        }

        @Test
        @DisplayName("1 activator + 1 repressor matches ibiosim_mixed_regulation.xml")
        void mixedRegulation() {
            ASTNode expected = getExpectedAst("ibiosim_mixed_regulation.xml");

            Reaction reaction = sbmlModel.createReaction("Production_P0");
            reaction.setReversible(false);

            mxCell act = createRegulatorEdge("S0", "stim_S0",
                    "Stimulation", defaultActivatorSimData());
            mxCell rep = createRegulatorEdge("S1", "inh_S1",
                    "Inhibition", defaultRepressorSimData());

            List<mxCell> activators = new ArrayList<>();
            activators.add(act);
            List<mxCell> repressors = new ArrayList<>();
            repressors.add(rep);
            converter.buildActivationFormula(reaction, "P0", createPromoterInfo(),
                    activators, repressors);

            ASTNode actualGlobalized = ASTAssertions.rewriteParamNames(getActualAst(reaction), "S0", "S1");
            ASTAssertions.assertAstEquals(expected, actualGlobalized,
                    "Activation mixed regulation should match mixed baseline (globalized)");
        }

        @Test
        @DisplayName("Same species dual role matches ibiosim_same_species_regulation.xml")
        void sameSpeciesRegulation() {
            ASTNode expected = getExpectedAst("ibiosim_same_species_regulation.xml");

            Reaction reaction = sbmlModel.createReaction("Production_P0");
            reaction.setReversible(false);

            mxCell act = createRegulatorEdge("S0", "stim_S0",
                    "Stimulation", defaultActivatorSimData());
            mxCell rep = createRegulatorEdge("S0", "inh_S0",
                    "Inhibition", defaultRepressorSimData());

            List<mxCell> activators = new ArrayList<>();
            activators.add(act);
            List<mxCell> repressors = new ArrayList<>();
            repressors.add(rep);
            converter.buildActivationFormula(reaction, "P0", createPromoterInfo(),
                    activators, repressors);

            ASTNode actualGlobalized = ASTAssertions.rewriteParamNames(getActualAst(reaction), "S0");
            ASTAssertions.assertAstEquals(expected, actualGlobalized,
                    "Activation with same-species dual regulation should match baseline (globalized)");
        }
    }
}
