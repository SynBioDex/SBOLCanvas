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
        toggleDoc = SBOLToSBMLPipeline.convertSbolToSbml(SBOLTestSupport.TOGGLE_RESOURCE);
        toggleModel = toggleDoc.getModel();
        assertNotNull(toggleModel, "SBML document should have a model");
    }

    @Test
    @DisplayName("Exported SBML passes core validation with defaults")
    void exportedSBMLPassesCoreValidation() {
        SBMLAssertions.assertSpecValid(toggleDoc);
    }

    @Test
    @DisplayName("FBC package enabled with strict=false on exported model")
    void fbcPackageStrictFalseOnExportedModel() {
        assertTrue(toggleModel.isPackageEnabled("fbc"),
                "FBC package should be enabled on the toggle SBML model");
        org.sbml.jsbml.ext.fbc.FBCModelPlugin fbc =
                (org.sbml.jsbml.ext.fbc.FBCModelPlugin) toggleModel.getPlugin("fbc");
        assertNotNull(fbc, "the model should carry an fbc plugin");
        assertFalse(fbc.getStrict(), "the fbc plugin should not be strict");
    }

    @Nested
    @DisplayName("Species")
    class SpeciesTests {

        @Test
        @DisplayName("2 promoter species with SBO:0000590 and initialAmount=2.0")
        void twoPromoterSpeciesWithSBO590AndInitialAmount2() {
            int count = 0;
            for (Species s : toggleModel.getListOfSpecies()) {
                if (s.getSBOTerm() == 590) {
                    count++;
                    assertEquals(2.0, s.getInitialAmount(), 0.001,
                        "Promoter '" + s.getId() + "' initialAmount (ng default)");
                }
            }
            assertEquals(2, count, "2 promoter species, one per module promoter");
        }

    }

    @Nested
    @DisplayName("Reactions")
    class Reactions {

        private void assertProductionReactionInvariants(Reaction r) {
            assertEquals(589, r.getSBOTerm());
            assertFalse(r.getReversible(), r.getId() + " should be irreversible");
            assertTrue(r.getModifierCount() >= 1,
                r.getId() + " should have at least the promoter modifier");
            assertTrue(r.getProductCount() >= 1,
                r.getId() + " should have at least one product (placeholder mRNA when no CDS-driven product)");

            KineticLaw law = r.getKineticLaw();
            assertNotNull(law, r.getId() + " should have a kinetic law");
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
        @DisplayName("5 degradation reactions exist")
        void fiveDegradationReactionsExist() {
            assertEquals(5, degradationReactions().size(),
                "5 degradation reactions (aTc_TetR, TetR, GFP, IPTG_LacI, LacI)");
        }

        private java.util.List<Reaction> degradationReactions() {
            java.util.List<Reaction> degradations = new java.util.ArrayList<>();
            for (Reaction r : toggleModel.getListOfReactions()) {
                if (r.getSBOTerm() == 179) {
                    degradations.add(r);
                }
            }
            return degradations;
        }

        @Test
        @DisplayName("Each degradation reaction is SBO:0000179, irreversible, in Cell, using the global kd=0.0075")
        void degradationReactionsUseIBioSimShape() {
            org.sbml.jsbml.Parameter kd = toggleModel.getParameter("kd");
            assertNotNull(kd, "the model should carry the global kd parameter");
            assertEquals(0.0075, kd.getValue(), 1e-6);
            for (Reaction r : degradationReactions()) {
                assertEquals(179, r.getSBOTerm());
                assertFalse(r.getReversible());
                assertEquals(1, r.getReactantCount());
                assertEquals("Cell", r.getCompartment(), r.getId() + " should name the Cell compartment");

                KineticLaw law = r.getKineticLaw();
                assertNotNull(law);
                assertNull(law.getLocalParameter("kd"),
                    r.getId() + " should use the global kd when the interaction sets no explicit value");
                assertTrue(law.getMath().toString().contains("kd"),
                    r.getId() + " kinetic law should reference kd");
            }
        }

        @Test
        @DisplayName("2 complex formation reactions exist")
        void twoComplexFormationReactionsExist() {
            long count = toggleModel.getListOfReactions().stream()
                    .filter(r -> r.getSBOTerm() == 177)
                    .count();
            assertEquals(2, count, "2 mass-action reactions (SBO:177)");
        }

        @Test
        @DisplayName("Each complex formation reaction (SBO:0000177) is reversible, Complex_-named, product stoichiometry 1, with global kc rates")
        void complexFormationReactionsUseIBioSimShape() {
            int count = 0;
            for (Reaction r : toggleModel.getListOfReactions()) {
                if (r.getSBOTerm() != 177) continue;
                count++;
                assertTrue(r.getId().startsWith("Complex_"),
                    r.getId() + " should be named Complex_<productSpeciesId>");
                assertTrue(r.getReversible(), r.getId() + " complex formation is reversible");
                assertTrue(r.getReactantCount() >= 2,
                    r.getId() + " should have 2+ reactants");
                assertEquals(1, r.getProductCount(),
                    r.getId() + " should have 1 product (the complex)");
                assertEquals(1.0, r.getProduct(0).getStoichiometry(),
                    r.getId() + " product stoichiometry is always 1");
                assertEquals("Cell", r.getCompartment(),
                    r.getId() + " should name the Cell compartment");

                KineticLaw law = r.getKineticLaw();
                assertNotNull(law, r.getId() + " should have kinetic law");
                assertNull(law.getLocalParameter("kc_f"),
                    r.getId() + " should use the global kc_f when the interaction sets no explicit value");
                assertNull(law.getLocalParameter("kc_r"),
                    r.getId() + " should use the global kc_r when the interaction sets no explicit value");
                assertTrue(law.getMath().toString().contains(r.getProduct(0).getSpecies()),
                    r.getId() + " kinetic law should reference the complex product linearly");
            }
            assertEquals(2, count, "both fixture binding reactions export as mass action");
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
    @DisplayName("Promoter defaults")
    class PromoterDefaults {

        @Test
        @DisplayName("Production reactions use default np=10.0 as product stoichiometry")
        void productionReactionsUseDefaultNpAsProductStoichiometry() {
            for (Reaction r : toggleModel.getListOfReactions()) {
                if (r.getSBOTerm() == 589) {
                    for (int i = 0; i < r.getProductCount(); i++) {
                        assertEquals(10.0, r.getProduct(i).getStoichiometry(), 1e-6,
                                r.getId() + " product '" + r.getProduct(i).getSpecies()
                                        + "' should use default np=10.0");
                    }
                }
            }
        }

        @Test
        @DisplayName("Repression with default rates uses the global parameters and no locals")
        void repressionKineticLawUsesGlobalDefaults() {
            assertParamValue(toggleModel, "ko", 0.05, "ko (open complex production rate)");
            assertParamValue(toggleModel, "ko_f", 0.033, "ko_f (forward RNAP binding)");
            assertParamValue(toggleModel, "ko_r", 1.0, "ko_r (reverse RNAP binding)");
            assertParamValue(toggleModel, "nr", 30.0, "nr (initial RNAP count)");
            assertParamValue(toggleModel, "kr_f", 0.5, "kr_f (forward repression binding)");
            assertParamValue(toggleModel, "kr_r", 1.0, "kr_r (reverse repression binding)");
            assertParamValue(toggleModel, "nc", 2.0, "nc (cooperativity)");

            for (Reaction r : productionReactions()) {
            KineticLaw law = r.getKineticLaw();
                assertNotNull(law, r.getId() + " should have a kinetic law");
                assertEquals(0, law.getLocalParameterCount(),
                    r.getId() + " should have no local parameters when the fixture overrides nothing");
                String math = law.getMath().toString();
                assertTrue(math.contains("ko_f") && math.contains("nr"),
                    r.getId() + " kinetic law should reference the global promoter parameters");
            }
        }
    }

    @Test
    @DisplayName("Production formulas reference the promoter species")
    void productionFormulasReferenceThePromoter() {
        for (Reaction r : productionReactions()) {
            String promoterId = null;
            for (ModifierSpeciesReference m : r.getListOfModifiers()) {
                if (m.getSBOTerm() == 598) promoterId = m.getSpecies();
            }
            assertNotNull(promoterId, r.getId() + " should carry a promoter modifier");
                org.sbml.jsbml.ASTNode math = r.getKineticLaw().getMath();
                assertTrue(astReferencesSpecies(math, promoterId),
                        r.getId() + " kinetic-law AST should reference promoter species '"
                                + promoterId + "'");
            }
        }

    private java.util.List<Reaction> productionReactions() {
        java.util.List<Reaction> productions = new java.util.ArrayList<>();
        for (Reaction r : toggleModel.getListOfReactions()) {
            if (r.getSBOTerm() == 589) {
                productions.add(r);
            }
        }
        return productions;
    }

    /** Asserts {@code model} has a global parameter named {@code paramId} with the expected value. */
    private static void assertParamValue(Model model, String paramId,
            double expected, String description) {
        org.sbml.jsbml.Parameter param = model.getParameter(paramId);
        assertNotNull(param, "Missing parameter '" + paramId + "' (" + description + ")");
        assertEquals(expected, param.getValue(), 1e-6,
                description + " should be " + expected);
    }
}
