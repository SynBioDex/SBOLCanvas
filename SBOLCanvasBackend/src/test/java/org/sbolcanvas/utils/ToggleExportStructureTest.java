package org.sbolcanvas.utils;

import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;
import static org.sbolcanvas.utils.ASTAssertions.astReferencesSpecies;

import org.sbml.jsbml.Model;
import org.sbml.jsbml.Reaction;
import org.sbml.jsbml.SBMLDocument;
import org.sbml.jsbml.Species;
import org.sbml.jsbml.KineticLaw;
import org.sbml.jsbml.LocalParameter;
import org.sbml.jsbml.ModifierSpeciesReference;
import org.sbml.jsbml.ext.layout.Layout;
import org.sbml.jsbml.ext.layout.LayoutModelPlugin;
import org.sbml.jsbml.ext.layout.ReactionGlyph;
import org.sbml.jsbml.ext.layout.SpeciesReferenceGlyph;

/** Toggle-switch SBOL -> SBML structural checks: validation, species, reactions, layout, defaults. */
class ToggleExportStructureTest {

    private static SBMLDocument toggleDoc;
    private static Model toggleModel;

    @BeforeAll
    static void convertToggleSwitch() throws Exception {
        toggleDoc = SBOLToSBMLPipeline.convertSbolToSbml("sbolcanvas_sbol-toggle.xml");
        toggleModel = toggleDoc.getModel();
        assertNotNull(toggleModel, "SBML document should have a model");
    }

    @Test
    @DisplayName("Exported SBML passes core validation with defaults")
    void exportedSBMLPassesCoreValidation() {
        SBMLAssertions.assertSpecValid(toggleDoc);
    }

    @Test
    @DisplayName("FBC package not enabled on exported model (#18)")
    void fbcPackageNotEnabledOnExportedModel() {
        assertFalse(toggleModel.isPackageEnabled("fbc"),
                "FBC package should not be enabled on the toggle SBML model");
    }

    @Nested
    @DisplayName("Species")
    class SpeciesTests {

        @Test
        @DisplayName("Toggle switch has 13 species")
        void toggleSwitchHas13Species() {
            assertEquals(13, toggleModel.getSpeciesCount(),
                "4 promoters + 3 proteins + 2 small molecules + 2 complexes "
                + "+ 2 placeholder mRNA (pLac__2_mRNA, pTet__2_mRNA for the two promoters without explicit product)");
        }

        @Test
        @DisplayName("4 promoter species with SBO:0000590 and initialAmount=2.0")
        void fourPromoterSpeciesWithSBO590AndInitialAmount2() {
            int count = 0;
            for (Species s : toggleModel.getListOfSpecies()) {
                if (s.getSBOTerm() == 590) {
                    count++;
                    assertEquals(2.0, s.getInitialAmount(), 0.001,
                        "Promoter '" + s.getId() + "' initialAmount (ng default)");
                }
            }
            assertEquals(4, count, "4 promoter species (pTet, pLac, pLac__2, pTet__2)");
        }

    }

    @Nested
    @DisplayName("Reactions")
    class Reactions {

        @Test
        @DisplayName("No-CDS production reactions (pLac__2, pTet__2) get a placeholder mRNA product")
        void noCdsProductionReactionsHavePlaceholderMRna() {
            for (String promoterId : new String[]{"pLac__2", "pTet__2"}) {
                Reaction r = toggleModel.getReaction("Production_" + promoterId);
                assertNotNull(r, "Production_" + promoterId + " should exist");
                assertProductionReactionInvariants(r);
                assertEquals(1, r.getProductCount(),
                    r.getId() + " should produce exactly one placeholder mRNA");
                assertTrue(r.getProduct(0).getSpecies().endsWith("_mRNA"),
                    r.getId() + " product should be a <promoterId>_mRNA placeholder species");
            }
        }

        private void assertProductionReactionInvariants(Reaction r) {
            assertEquals(589, r.getSBOTerm());
            assertFalse(r.getReversible(), r.getId() + " should be irreversible");
            assertTrue(r.getModifierCount() >= 1,
                r.getId() + " should have at least the promoter modifier");
            assertTrue(r.getProductCount() >= 1,
                r.getId() + " should have at least one product (placeholder mRNA when no CDS-driven product)");

            KineticLaw law = r.getKineticLaw();
            assertNotNull(law, r.getId() + " should have a kinetic law");
            assertTrue(law.getLocalParameterCount() > 0,
                r.getId() + " kinetic law should have local parameters");
            assertNotNull(law.getMath(),
                r.getId() + " kinetic law should have math expression");
        }

        /** Invariants for regulated production reactions: shared invariants plus at least one regulator modifier (>=2 modifiers total). */
        private void assertRegulatedProductionReactionInvariants(Reaction r) {
            assertProductionReactionInvariants(r);
            assertTrue(r.getModifierCount() >= 2,
                r.getId() + " should have promoter + at least one regulator modifier");
        }

        @Test
        @DisplayName("Production_pTet produces LacI, inhibited by TetR")
        void productionPTetProducesLacIInhibitedByTetR() {
            Reaction r = toggleModel.getReaction("Production_pTet");
            assertNotNull(r, "Production_pTet should exist");
            assertRegulatedProductionReactionInvariants(r);

            assertEquals(1, r.getProductCount());
            assertEquals("LacI", r.getProduct(0).getSpecies());

            boolean hasPromoter = false;
            boolean hasInhibitor = false;
            for (ModifierSpeciesReference m : r.getListOfModifiers()) {
                if (m.getSBOTerm() == 598) hasPromoter = true;
                if (m.getSBOTerm() == 20 && m.getSpecies().equals("TetR")) hasInhibitor = true;
            }
            assertTrue(hasPromoter, "Should have promoter modifier");
            assertTrue(hasInhibitor, "Should have TetR inhibitor");
        }

        @Test
        @DisplayName("Production_pLac produces TetR and GFP, inhibited by LacI")
        void productionPLacProducesTetRAndGFPInhibitedByLacI() {
            Reaction r = toggleModel.getReaction("Production_pLac");
            assertNotNull(r, "Production_pLac should exist");
            assertRegulatedProductionReactionInvariants(r);

            assertEquals(2, r.getProductCount());
            Set<String> products = new HashSet<String>();
            products.add(r.getProduct(0).getSpecies());
            products.add(r.getProduct(1).getSpecies());
            assertTrue(products.contains("TetR"), "Should produce TetR");
            assertTrue(products.contains("GFP"), "Should produce GFP");

            boolean hasInhibitor = false;
            for (ModifierSpeciesReference m : r.getListOfModifiers()) {
                if (m.getSBOTerm() == 20 && m.getSpecies().equals("LacI")) hasInhibitor = true;
            }
            assertTrue(hasInhibitor, "Should have LacI inhibitor");
        }

        @Test
        @DisplayName("Placeholder mRNA species carries SBO:0000250 with initialAmount=0 in the Cell compartment")
        void placeholderMRnaSpeciesCarriesSbo250WithInitialAmountZero() {
            for (String promoterId : new String[]{"pLac__2", "pTet__2"}) {
                Reaction r = toggleModel.getReaction("Production_" + promoterId);
                String mRnaId = r.getProduct(0).getSpecies();

                Species mRNA = toggleModel.getSpecies(mRnaId);
                assertNotNull(mRNA, "Placeholder mRNA species '" + mRnaId + "' should exist in the model");
                assertEquals(250, mRNA.getSBOTerm(),
                    "Placeholder mRNA should be SBO:0000250 (RNA)");
                assertEquals(0.0, mRNA.getInitialAmount(), 1e-9,
                    "Placeholder mRNA initialAmount should be 0");
                assertEquals("Cell", mRNA.getCompartment());
                assertTrue(mRNA.getHasOnlySubstanceUnits());
                assertFalse(mRNA.getConstant());
                assertFalse(mRNA.getBoundaryCondition());
            }
        }

        @Test
        @DisplayName("5 degradation reactions exist")
        void fiveDegradationReactionsExist() {
            long count = toggleModel.getListOfReactions().stream()
                    .filter(r -> r.getId().startsWith("Degradation_"))
                    .count();
            assertEquals(5, count,
                "5 degradation reactions (aTc_TetR, TetR, GFP, IPTG_LacI, LacI)");
        }

        @Test
        @DisplayName("Each degradation reaction is SBO:0000179, irreversible, with kd=0.0075")
        void eachDegradationReactionHasExpectedInvariants() {
            for (Reaction r : toggleModel.getListOfReactions()) {
                if (!r.getId().startsWith("Degradation_")) continue;
                assertEquals(179, r.getSBOTerm());
                assertFalse(r.getReversible());
                assertEquals(1, r.getReactantCount());

                KineticLaw law = r.getKineticLaw();
                assertNotNull(law);
                LocalParameter kd = law.getLocalParameter("kd");
                assertNotNull(kd, r.getId() + " should have kd parameter");
                assertEquals(0.0075, kd.getValue(), 1e-6);
            }
        }

        @Test
        @DisplayName("2 complex formation reactions exist")
        void twoComplexFormationReactionsExist() {
            long count = toggleModel.getListOfReactions().stream()
                    .filter(r -> r.getId().startsWith("Complex_"))
                    .count();
            assertEquals(2, count, "2 complex formation reactions");
        }

        @Test
        @DisplayName("Each complex formation reaction is SBO:0000177, reversible, with kc_f and kc_r params")
        void eachComplexFormationReactionHasExpectedInvariants() {
            for (Reaction r : toggleModel.getListOfReactions()) {
                if (!r.getId().startsWith("Complex_")) continue;
                assertEquals(177, r.getSBOTerm());
                assertTrue(r.getReversible(),
                    r.getId() + " should be reversible");
                assertTrue(r.getReactantCount() >= 2,
                    r.getId() + " should have 2+ reactants");
                assertEquals(1, r.getProductCount(),
                    r.getId() + " should have 1 product (the complex)");

                KineticLaw law = r.getKineticLaw();
                assertNotNull(law, r.getId() + " should have kinetic law");
                assertNotNull(law.getLocalParameter("kc_f"),
                    r.getId() + " should have kc_f parameter");
                assertNotNull(law.getLocalParameter("kc_r"),
                    r.getId() + " should have kc_r parameter");
            }
        }
    }

    @Nested
    @DisplayName("Layout")
    class LayoutTests {

        @Test
        @DisplayName("Layout package enabled, named 'iBioSim'")
        void layoutPackageEnabledWithOneLayoutNamedIBioSim() {
            assertTrue(toggleModel.isPackageEnabled("layout"));
            LayoutModelPlugin layoutPlugin = (LayoutModelPlugin) toggleModel.getPlugin("layout");
            assertNotNull(layoutPlugin);
            assertEquals(1, layoutPlugin.getLayoutCount());
            assertEquals("iBioSim", layoutPlugin.getLayout(0).getId());
        }

        @Test
        @DisplayName("Every SpeciesReferenceGlyph carries both a BoundingBox and a Curve")
        void everySpeciesReferenceGlyphHasBothBoundingBoxAndCurve() {
            LayoutModelPlugin layoutPlugin = (LayoutModelPlugin) toggleModel.getPlugin("layout");
            assertNotNull(layoutPlugin);
            Layout layout = layoutPlugin.getLayout(0);
            assertNotNull(layout);

            int connectionGlyphsChecked = 0;

            // SpeciesReferenceGlyphs live under every ReactionGlyph.
            for (ReactionGlyph rg : layout.getListOfReactionGlyphs()) {
                for (SpeciesReferenceGlyph srg : rg.getListOfSpeciesReferenceGlyphs()) {
                    assertTrue(srg.isSetBoundingBox(),
                        "SpeciesReferenceGlyph '" + srg.getId() + "' (under ReactionGlyph '"
                            + rg.getId() + "') is missing BoundingBox");
                    assertTrue(srg.isSetCurve(),
                        "SpeciesReferenceGlyph '" + srg.getId() + "' (under ReactionGlyph '"
                            + rg.getId() + "') is missing Curve");
                    connectionGlyphsChecked++;
                }
            }

            assertTrue(connectionGlyphsChecked > 0,
                "Expected at least one SpeciesReferenceGlyph in the toggle layout; found none");
        }
    }

    @Nested
    @DisplayName("Promoter defaults (from SBOLData.simulationConfig)")
    class PromoterDefaults {

        @Test
        @DisplayName("Production reactions use default np=10.0 as product stoichiometry")
        void productionReactionsUseDefaultNpAsProductStoichiometry() {
            for (Reaction r : toggleModel.getListOfReactions()) {
                if (r.getId().startsWith("Production_")) {
                    for (int i = 0; i < r.getProductCount(); i++) {
                        assertEquals(10.0, r.getProduct(i).getStoichiometry(), 1e-6,
                                r.getId() + " product '" + r.getProduct(i).getSpecies()
                                        + "' should use default np=10.0");
                    }
                }
            }
        }

        @Test
        @DisplayName("Repression kinetic law has correct default parameters")
        void repressionKineticLawHasCorrectDefaultParameters() {
            Reaction r = toggleModel.getReaction("Production_pTet");
            assertNotNull(r, "Production_pTet should exist");
            KineticLaw law = r.getKineticLaw();
            assertNotNull(law, "Should have kinetic law");

            assertParamValue(law, "ko", 0.05, "ko (open complex production rate)");
            assertParamValue(law, "ko_f", 0.033, "ko_f (forward RNAP binding)");
            assertParamValue(law, "ko_r", 1.0, "ko_r (reverse RNAP binding)");
            assertParamValue(law, "nr", 30.0, "nr (initial RNAP count)");

            assertParamValue(law, "kr_TetR_f", 0.5, "kr_TetR_f (forward repression binding for TetR)");
            assertParamValue(law, "kr_TetR_r", 1.0, "kr_TetR_r (reverse repression binding for TetR)");
            assertParamValue(law, "nc_TetR_r", 2.0, "nc_TetR_r (TetR cooperativity, repressor variant)");
        }
    }

    @Test
    @DisplayName("Repression formula references promoter species")
    void repressionFormulaReferencesPromoter() {
        for (Reaction r : toggleModel.getListOfReactions()) {
            if (r.getId().startsWith("Production_")) {
                String promoterId = r.getId().replace("Production_", "");
                org.sbml.jsbml.ASTNode math = r.getKineticLaw().getMath();
                assertTrue(astReferencesSpecies(math, promoterId),
                        r.getId() + " kinetic-law AST should reference promoter species '"
                                + promoterId + "'");
            }
        }
    }

    /** Asserts {@code law} has a local parameter named {@code paramId} with the expected value. */
    private static void assertParamValue(KineticLaw law, String paramId,
            double expected, String description) {
        LocalParameter param = law.getLocalParameter(paramId);
        assertNotNull(param, "Missing parameter '" + paramId + "' (" + description + ")");
        assertEquals(expected, param.getValue(), 1e-6,
                description + " should be " + expected);
    }
}
