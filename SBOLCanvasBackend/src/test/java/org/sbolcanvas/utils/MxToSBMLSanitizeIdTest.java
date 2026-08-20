package org.sbolcanvas.utils;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link MxToSBML#sanitizeId}. SIds produced by sanitizeId
 * (species, reaction, event, and other model-entity ids) must be unique,
 * SId-syntax-safe, and never contain "__" (iBioSim parses "__" as its
 * internal submodel separator). Layout glyph ids are built separately and
 * intentionally use the "Glyph__" prefix.
 */
class MxToSBMLSanitizeIdTest {

    @Test
    @DisplayName("Runs of invalid characters collapse to a single underscore")
    void invalidCharRunsCollapseToSingleUnderscore() {
        MxToSBML converter = new MxToSBML();
        assertEquals("LacI_protein", converter.sanitizeId("LacI  protein"));
    }

    @Test
    @DisplayName("Two different raw inputs that sanitize to the same id get a dedup suffix")
    void distinctInputsCollidingAfterSanitizeGetDedupSuffix() {
        MxToSBML converter = new MxToSBML();
        // Seed the base id first, then sanitize a different input that collapses to it.
        converter.sanitizeId("LacI  protein");
        assertEquals("LacI_protein_2", converter.sanitizeId("LacI--protein"));
    }

    @Test
    @DisplayName("Duplicate ids get a single-underscore numeric suffix")
    void duplicateIdsGetSingleUnderscoreSuffix() {
        MxToSBML converter = new MxToSBML();
        assertEquals("LacI_protein", converter.sanitizeId("LacI protein"));
        assertEquals("LacI_protein_2", converter.sanitizeId("LacI protein"));
        assertEquals("LacI_protein_3", converter.sanitizeId("LacI protein"));
    }

    @Test
    @DisplayName("No output ever contains a double underscore")
    void outputNeverContainsDoubleUnderscore() {
        MxToSBML converter = new MxToSBML();
        String[] inputs = { "a__b", "a  b", "a - b", "__", "a___b___c", "x", "x", "x" };
        for (String input : inputs) {
            String result = converter.sanitizeId(input);
            assertFalse(result.contains("__"), "sanitizeId('" + input + "') produced '" + result + "'");
        }
    }
}
