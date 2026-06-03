package org.sbolcanvas.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.sbolcanvas.utils.SBOLTestSupport.NCNAME;

/** Sanitize/desanitize cycle for InteractionInfo simulationData keys via _xHHHH_ hex escaping. */
@DisplayName("NCName sanitization for SBOL annotation child elements")
class NCNameSanitizationTest {

    @Nested
    @DisplayName("sanitizeAnnotationKey")
    class SanitizeAnnotationKey {

        @Test
        @DisplayName("plain alphanumeric input passes through unchanged")
        void plainAlphanumericUnchanged() {
            assertEquals("hello", Converter.sanitizeAnnotationKey("hello"));
            assertEquals("abc123", Converter.sanitizeAnnotationKey("abc123"));
        }

        @Test
        @DisplayName("leading digit is hex-encoded to produce a valid NCName")
        void leadingDigitEncoded() {
            String result = Converter.sanitizeAnnotationKey("1abc");
            assertTrue(result.startsWith("_x"), "Leading digit should be hex-encoded");
            assertNotEquals("1abc", result);
        }

    }

    @Test
    @DisplayName("hex escape sequence _x002F_ is decoded back to '/'")
    void decodesHexSequence() {
        assertEquals("a/b", Converter.desanitizeAnnotationKey("a_x002F_b"));
    }

    @Test
    @DisplayName("URI key produces a valid NCName and survives sanitize->desanitize round-trip")
    void uriKeyRoundTrips() {
        String original = "nc_https://sbolcanvas.org/FKha2kkU/1";
        String sanitized = Converter.sanitizeAnnotationKey(original);

        assertTrue(NCNAME.matcher(sanitized).matches(),
            "Sanitized output must be a valid XML NCName; got: " + sanitized);

        String desanitized = Converter.desanitizeAnnotationKey(sanitized);
        assertEquals(original, desanitized,
            "URI key should survive sanitize->desanitize round-trip");
    }
}
