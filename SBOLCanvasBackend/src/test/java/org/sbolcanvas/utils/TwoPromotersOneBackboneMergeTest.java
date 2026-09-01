package org.sbolcanvas.utils;

import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;
import static org.sbolcanvas.utils.ASTAssertions.astReferencesSpecies;

import org.sbml.jsbml.KineticLaw;
import org.sbml.jsbml.Model;
import org.sbml.jsbml.ModifierSpeciesReference;
import org.sbml.jsbml.Reaction;
import org.sbml.jsbml.SBMLDocument;
import org.sbml.jsbml.Species;
import org.sbml.jsbml.SpeciesReference;
import org.sbml.jsbml.ext.layout.Layout;
import org.sbml.jsbml.ext.layout.LayoutModelPlugin;
import org.sbml.jsbml.ext.layout.SpeciesGlyph;

/** Two-promoters-on-one-backbone merge behavior on the two-promoters-on-one-backbone fixture. */
class TwoPromotersOneBackboneMergeTest {

    private static SBMLDocument doc;
    private static Model model;

    @BeforeAll
    static void convert() throws Exception {
        doc = SBOLToSBMLPipeline.convertSbolToSbml("sbolcanvas_two_promoters_one_backbone.xml");
        model = doc.getModel();
        assertNotNull(model, "SBML document should have a model");
    }

    @Nested
    @DisplayName("Merged promoter species")
    class MergedSpecies {

        @Test
        @DisplayName("Each backbone produces one merged Species with summed ng=4")
        void mergedSpeciesAmount() {
            List<Species> merged = model.getListOfSpecies().stream()
                    .filter(sp -> sp.getSBOTerm() == 590)
                    .collect(Collectors.toList());
            assertEquals(2, merged.size(),
                    "Two backbones, each merging two promoters, should yield two promoter species");

            for (Species sp : merged) {
                assertEquals("pTet+pLac", sp.getName(),
                        "Merged display name joins both promoter labels with '+'");
                assertEquals(4.0, sp.getInitialAmount(), 1e-9,
                        "ng sums across promoters (default 2 + 2 = 4)");
            }
        }

        @Test
        @DisplayName("Merged species ids are unique after SId sanitization")
        void mergedSpeciesIdsAreUniqueAfterSIdSanitization() {
            Set<String> ids = model.getListOfSpecies().stream()
                    .filter(sp -> sp.getSBOTerm() == 590)
                    .map(Species::getId)
                    .collect(Collectors.toSet());
            assertEquals(2, ids.size(), "exactly two merged species expected");
            assertTrue(ids.contains("pTet_pLac"), "merged id should be the SId-sanitized form pTet_pLac (display name pTet+pLac)");
        }
    }

    @Nested
    @DisplayName("Production reaction with mixed regulation")
    class MixedRegulation {

        private Reaction productionReaction() {
            return model.getListOfReactions().stream()
                    .filter(r -> "Production_pTet_pLac".equals(r.getId()))
                    .findFirst()
                    .orElseThrow(() -> new AssertionError(
                            "Expected a Production_pTet_pLac reaction for the regulated TU"));
        }

        @Test
        @DisplayName("Reaction has product GFP and three modifiers (promoter, activator, repressor)")
        void mixedRegulatedProductionHasGFPProductAndThreeModifiers() {
            Reaction prod = productionReaction();
            assertEquals(589, prod.getSBOTerm(), "Production reactions are SBO:0000589");

            List<String> productIds = prod.getListOfProducts().stream()
                    .map(SpeciesReference::getSpecies).collect(Collectors.toList());
            assertEquals(Arrays.asList("GFP"), productIds, "CDS drives a GFP product");

            Set<String> modifierIds = prod.getListOfModifiers().stream()
                    .map(ModifierSpeciesReference::getSpecies).collect(Collectors.toSet());
            assertEquals(new HashSet<>(Arrays.asList("pTet_pLac", "aTc", "LacI")), modifierIds,
                    "Modifiers: merged promoter, aTc activator, LacI repressor");
        }

        @Test
        @DisplayName("Merged promoter and its activator/repressor modifiers carry expected SBO terms")
        void mergedPromoterAndModifiersCarryExpectedSBOTerms() {
            Reaction prod = productionReaction();
            ModifierSpeciesReference mergedPromoter = null;
            ModifierSpeciesReference activator = null;
            ModifierSpeciesReference repressor = null;
            for (ModifierSpeciesReference m : prod.getListOfModifiers()) {
                if ("pTet_pLac".equals(m.getSpecies())) mergedPromoter = m;
                else if ("aTc".equals(m.getSpecies())) activator = m;
                else if ("LacI".equals(m.getSpecies())) repressor = m;
            }
            assertNotNull(mergedPromoter,
                    "merged promoter modifier (pTet_pLac) must be present, not phantom per-promoter modifiers");
            assertEquals(598, mergedPromoter.getSBOTerm(),
                    "merged promoter must still carry SBO 598 (promoter) and not be reassigned to a different SBO term during the merge");

            assertNotNull(activator, "activator modifier (aTc) must be present");
            assertEquals(459, activator.getSBOTerm(),
                    "activator modifier must carry SBO 459 (stimulator)");

            assertNotNull(repressor, "repressor modifier (LacI) must be present");
            assertEquals(20, repressor.getSBOTerm(),
                    "repressor modifier must carry SBO 20 (inhibitor)");
        }

        @Test
        @DisplayName("Kinetic law references the merged-promoter id, not any individual promoter id")
        void kineticLawReferencesMergedIdNotIndividualPromoterIds() {
            // See KineticLawBaselineTest.mixedRegulation for full formula structure coverage.
            Reaction prod = productionReaction();
            assertTrue(prod.isSetKineticLaw(), "Production reaction should have a kinetic law");
            org.sbml.jsbml.ASTNode math = prod.getKineticLaw().getMath();

            assertTrue(astReferencesSpecies(math, "pTet_pLac"),
                    "Formula AST must reference the merged-promoter species 'pTet_pLac'");
            assertFalse(astReferencesSpecies(math, "pTet"),
                    "Formula AST must not reference the individual promoter id 'pTet'");
            assertFalse(astReferencesSpecies(math, "pLac"),
                    "Formula AST must not reference the individual promoter id 'pLac'");
        }
    }

    @Nested
    @DisplayName("Placeholder-mRNA fallback on no-CDS TU")
    class NoCdsPlaceholderMRna {

        private Reaction noCdsProductionReaction() {
            return model.getListOfReactions().stream()
                    .filter(rx -> rx.getId().startsWith("Production_pTet_pLac_"))
                    .findFirst()
                    .orElseThrow(() -> new AssertionError(
                            "Expected a Production reaction for the second merged backbone"));
        }

        @Test
        @DisplayName("No-CDS production reaction produces the placeholder mRNA")
        void noCdsProductionReactionProducesPlaceholderMRna() {
            Reaction r = noCdsProductionReaction();
            assertEquals(1, r.getProductCount(),
                    "Reaction without explicit product has one placeholder mRNA product");
            assertTrue(r.getProduct(0).getSpecies().endsWith("_mRNA"),
                    "Product is the placeholder mRNA species");
        }

        @Test
        @DisplayName("No-CDS production kinetic law defines constitutive ko_f / ko_r params")
        void noCdsProductionLawDefinesConstitutiveParams() {
            // Asserted via local-parameter inventory to avoid coupling to formula string layout.
            KineticLaw law = noCdsProductionReaction().getKineticLaw();
            Set<String> paramIds = new HashSet<>();
            for (int i = 0; i < law.getLocalParameterCount(); i++) {
                paramIds.add(law.getLocalParameter(i).getId());
            }
            assertTrue(paramIds.contains("ko_f"),
                    "constitutive formula must define ko_f, found params: " + paramIds);
            assertTrue(paramIds.contains("ko_r"),
                    "constitutive formula must define ko_r, found params: " + paramIds);
        }
    }

    @Nested
    @DisplayName("Layout (regression for SpeciesGlyph dup bug)")
    class LayoutTests {

        @Test
        @DisplayName("Layout does not register duplicate SpeciesGlyphs")
        void noDuplicateSpeciesGlyphs() {
            LayoutModelPlugin plugin = (LayoutModelPlugin) model.getPlugin("layout");
            assertNotNull(plugin, "Layout plugin should be present");
            assertEquals(1, plugin.getLayoutCount(), "One Layout expected");
            Layout layout = plugin.getLayout(0);

            Set<String> seenIds = new HashSet<>();
            Set<String> seenSpeciesRefs = new HashSet<>();
            for (SpeciesGlyph sg : layout.getListOfSpeciesGlyphs()) {
                assertTrue(seenIds.add(sg.getId()),
                        "Duplicate SpeciesGlyph id '" + sg.getId() + "'");
                assertTrue(seenSpeciesRefs.add(sg.getSpecies()),
                        "Duplicate SpeciesGlyph reference to species '" + sg.getSpecies() + "'");
            }
        }

        @Test
        @DisplayName("Merged promoter glyph resolves to the merged species and has sensible dimensions")
        void mergedPromoterGlyphResolvesToMergedSpeciesAndFitsCanvas() {
            LayoutModelPlugin plugin = (LayoutModelPlugin) model.getPlugin("layout");
            Layout layout = plugin.getLayout(0);

            Set<String> mergedIds = model.getListOfSpecies().stream()
                    .filter(sp -> sp.getSBOTerm() == 590)
                    .map(Species::getId)
                    .collect(Collectors.toSet());
            assertFalse(mergedIds.isEmpty(),
                    "Fixture must contain at least one merged-promoter species");

            double canvasWidth = layout.getDimensions().getWidth();
            double canvasHeight = layout.getDimensions().getHeight();

            int matched = 0;
            for (SpeciesGlyph sg : layout.getListOfSpeciesGlyphs()) {
                if (!mergedIds.contains(sg.getSpecies())) continue;
                matched++;

                org.sbml.jsbml.ext.layout.BoundingBox bbox = sg.getBoundingBox();
                assertNotNull(bbox, sg.getId() + " merged-promoter glyph should have a bounding box");
                double w = bbox.getDimensions().getWidth();
                double h = bbox.getDimensions().getHeight();
                double x = bbox.getPosition().getX();
                double y = bbox.getPosition().getY();
                assertTrue(w > 0 && h > 0,
                        sg.getId() + " bounding box must be > 0 and <= canvas size, got dimensions "
                                + w + "x" + h);
                assertTrue(x >= 0 && y >= 0,
                        sg.getId() + " bounding box position must be non-negative, got ("
                                + x + ", " + y + ")");
                assertTrue(x + w <= canvasWidth && y + h <= canvasHeight,
                        sg.getId() + " bounding box must be > 0 and <= canvas size, got extent ("
                                + (x + w) + ", " + (y + h) + ") vs canvas "
                                + canvasWidth + "x" + canvasHeight);
            }
            assertTrue(matched >= 1,
                    "Expected at least one SpeciesGlyph resolving to a merged-promoter id (not to "
                            + "an individual promoter id), merged ids were: " + mergedIds);
        }
    }
}
