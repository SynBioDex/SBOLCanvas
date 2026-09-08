package org.sbolcanvas.utils;

import static org.junit.jupiter.api.Assertions.*;

import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link Identifiers#toSId}. The load-bearing invariant: exported SIds
 * never contain "__" (iBioSim parses it as its internal submodel separator).
 */
class IdentifiersTest {

    @Test
    @DisplayName("Runs of invalid characters collapse to a single underscore")
    void invalidCharRunsCollapseToSingleUnderscore() {
        Set<String> usedIds = new HashSet<>();
        assertEquals("LacI_protein", Identifiers.toSId("LacI  protein", usedIds));
    }

    @Test
    @DisplayName("Two different raw inputs that sanitize to the same id get a dedup suffix")
    void distinctInputsCollidingAfterSanitizeGetDedupSuffix() {
        Set<String> usedIds = new HashSet<>();
        // Seed the base id first, then sanitize a different input that collapses to it.
        Identifiers.toSId("LacI  protein", usedIds);
        assertEquals("LacI_protein_2", Identifiers.toSId("LacI--protein", usedIds));
    }

    @Test
    @DisplayName("Duplicate ids get a single-underscore numeric suffix")
    void duplicateIdsGetSingleUnderscoreSuffix() {
        Set<String> usedIds = new HashSet<>();
        assertEquals("LacI_protein", Identifiers.toSId("LacI protein", usedIds));
        assertEquals("LacI_protein_2", Identifiers.toSId("LacI protein", usedIds));
        assertEquals("LacI_protein_3", Identifiers.toSId("LacI protein", usedIds));
    }

    @Test
    @DisplayName("No output ever contains a double underscore")
    void outputNeverContainsDoubleUnderscore() {
        Set<String> usedIds = new HashSet<>();
        String[] inputs = { "a__b", "a  b", "a - b", "__", "a___b___c", "x", "x", "x", "a-", "a-", "---" };
        for (String input : inputs) {
            String result = Identifiers.toSId(input, usedIds);
            assertFalse(result.contains("__"), "toSId('" + input + "') produced '" + result + "'");
        }
    }
}
