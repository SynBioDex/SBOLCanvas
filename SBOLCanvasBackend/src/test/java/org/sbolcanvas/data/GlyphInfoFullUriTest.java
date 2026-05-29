package org.sbolcanvas.data;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/** GlyphInfo URI assembly behavior. */
@DisplayName("GlyphInfo.getFullURI")
class GlyphInfoFullUriTest {

    @Test
    @DisplayName("appends version after displayId when set")
    void appendsVersionAfterDisplayIdWhenSet() {
        GlyphInfo glyph = new GlyphInfo();
        glyph.setUriPrefix("https://sbolcanvas.org");
        glyph.setDisplayID("myPart");
        glyph.setVersion("1");

        assertEquals("https://sbolcanvas.org/myPart/1", glyph.getFullURI());
    }

    @Test
    @DisplayName("omits version and trailing slash when version null")
    void omitsVersionAndTrailingSlashWhenVersionNull() {
        GlyphInfo glyph = new GlyphInfo();
        glyph.setUriPrefix("https://sbolcanvas.org");
        glyph.setDisplayID("myPart");

        assertEquals("https://sbolcanvas.org/myPart", glyph.getFullURI());
    }

    @Test
    @DisplayName("treats empty version as absent")
    void treatsEmptyVersionAsAbsent() {
        GlyphInfo glyph = new GlyphInfo();
        glyph.setUriPrefix("https://sbolcanvas.org");
        glyph.setDisplayID("myPart");
        glyph.setVersion("");

        assertEquals("https://sbolcanvas.org/myPart", glyph.getFullURI());
    }
}
