package org.sbolcanvas.utils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.sbml.jsbml.ASTNode;
import org.sbml.jsbml.Compartment;
import org.sbml.jsbml.Model;
import org.sbml.jsbml.Reaction;
import org.sbml.jsbml.KineticLaw;
import org.sbml.jsbml.SBMLDocument;
import org.sbml.jsbml.Species;

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

    private MxToSBML.Regulator regulator(String speciesId) {
        return regulator(speciesId, null, null, null);
    }

    private MxToSBML.Regulator regulator(String speciesId, Double rateF, Double rateR, Double nc) {
        Species species = sbmlModel.getSpecies(speciesId);
        if (species == null) {
            species = sbmlModel.createSpecies(speciesId);
            species.setCompartment("Cell");
            species.setInitialAmount(0);
            species.setBoundaryCondition(false);
            species.setConstant(false);
            species.setHasOnlySubstanceUnits(true);
        }
        return new MxToSBML.Regulator(new MxToSBML.SpeciesData(species, null), rateF, rateR, nc);
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

            converter.buildRepressionFormula(reaction, "P0", reaction.createKineticLaw(),
                    Collections.<MxToSBML.Regulator>emptyList());

            ASTAssertions.assertAstEquals(expected, getActualAst(reaction),
                    "Repression with 0 repressors should match constitutive baseline");
        }

        @Test
        @DisplayName("1 repressor matches ibiosim_single_repressor.xml")
        void singleRepressor() {
            ASTNode expected = getExpectedAst("ibiosim_single_repressor.xml");

            Reaction reaction = sbmlModel.createReaction("Production_P0");
            reaction.setReversible(false);

            List<MxToSBML.Regulator> repressors = new ArrayList<>();
            repressors.add(regulator("S0"));
            converter.buildRepressionFormula(reaction, "P0", reaction.createKineticLaw(), repressors);

            ASTNode actualGlobalized = ASTAssertions.rewriteParamNames(getActualAst(reaction), "S0");
            ASTAssertions.assertAstEquals(expected, actualGlobalized,
                    "Repression with 1 repressor should match single repressor baseline (globalized)");
        }

        @Test
        @DisplayName("Authored repressor rates become per-factor local parameters (kr_S0_f/kr_S0_r)")
        void authoredRepressorRatesBecomeLocalParameters() {
            Reaction reaction = sbmlModel.createReaction("Production_Explicit");
            reaction.setReversible(false);

            List<MxToSBML.Regulator> repressors = new ArrayList<>();
            repressors.add(regulator("S0", 0.7, 1.2, 3.0));
            converter.buildRepressionFormula(reaction, "P0", reaction.createKineticLaw(), repressors);

            KineticLaw law = reaction.getKineticLaw();
            assertEquals(0.7, law.getLocalParameter("kr_S0_f").getValue(), 1e-9);
            assertEquals(1.2, law.getLocalParameter("kr_S0_r").getValue(), 1e-9);
            assertEquals(3.0, law.getLocalParameter("nc_S0_r").getValue(), 1e-9);
            assertTrue(ASTAssertions.astReferencesSpecies(law.getMath(), "kr_S0_f"),
                    "the formula references the local per-factor rate");
        }

        @Test
        @DisplayName("2 repressors matches ibiosim_two_repressors.xml")
        void twoRepressors() {
            ASTNode expected = getExpectedAst("ibiosim_two_repressors.xml");

            Reaction reaction = sbmlModel.createReaction("Production_P0");
            reaction.setReversible(false);

            List<MxToSBML.Regulator> repressors = new ArrayList<>();
            repressors.add(regulator("S0"));
            repressors.add(regulator("S1"));
            converter.buildRepressionFormula(reaction, "P0", reaction.createKineticLaw(), repressors);

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

            List<MxToSBML.Regulator> activators = new ArrayList<>();
            activators.add(regulator("S0"));
            converter.buildActivationFormula(reaction, "P0", reaction.createKineticLaw(),
                    activators, Collections.<MxToSBML.Regulator>emptyList());

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

            List<MxToSBML.Regulator> activators = new ArrayList<>();
            activators.add(regulator("S0"));
            activators.add(regulator("S1"));
            converter.buildActivationFormula(reaction, "P0", reaction.createKineticLaw(),
                    activators, Collections.<MxToSBML.Regulator>emptyList());

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

            List<MxToSBML.Regulator> activators = new ArrayList<>();
            activators.add(regulator("S0"));
            List<MxToSBML.Regulator> repressors = new ArrayList<>();
            repressors.add(regulator("S1"));
            converter.buildActivationFormula(reaction, "P0", reaction.createKineticLaw(),
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

            List<MxToSBML.Regulator> activators = new ArrayList<>();
            activators.add(regulator("S0"));
            List<MxToSBML.Regulator> repressors = new ArrayList<>();
            repressors.add(regulator("S0"));
            converter.buildActivationFormula(reaction, "P0", reaction.createKineticLaw(),
                    activators, repressors);

            ASTNode actualGlobalized = ASTAssertions.rewriteParamNames(getActualAst(reaction), "S0");
            ASTAssertions.assertAstEquals(expected, actualGlobalized,
                    "Activation with same-species dual regulation should match baseline (globalized)");
        }
    }
}
