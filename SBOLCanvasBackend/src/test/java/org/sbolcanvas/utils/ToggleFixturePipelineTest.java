package org.sbolcanvas.utils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SystemsBiologyOntology;

import org.sbolcanvas.data.GlyphInfo;
import org.sbolcanvas.data.InteractionInfo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.sbolcanvas.utils.SBOLTestSupport.TOGGLE_RESOURCE;
import static org.sbolcanvas.utils.SBOLTestSupport.loadSbol;

/** End-to-end dictionary pipeline against the toggle-switch fixture (SBOL -> mxGraph -> dictionaries). */
class ToggleFixturePipelineTest {

    private static SBOLToMx toggleConverter;
    private static MxToSBML converter;

    @BeforeAll
    static void runTogglePipeline() throws Exception {
        SBOLDocument originalDoc = loadSbol(TOGGLE_RESOURCE);
        toggleConverter = new SBOLToMx();
        ByteArrayOutputStream graphOut = new ByteArrayOutputStream();
        toggleConverter.toGraph(originalDoc, graphOut);

        converter = new MxToSBML();
        ByteArrayInputStream graphIn = new ByteArrayInputStream(graphOut.toByteArray());
        converter.loadGraphAndDictionaries(graphIn);
    }

    @Test
    @DisplayName("SBOL -> mxGraph populates interactionDict with the fixture's canonical interactions")
    void upstreamInteractionDictCarriesCanonicalToggleInteractions() {
        assertEquals(12, toggleConverter.interactionDict.size(),
                "Toggle fixture defines exactly 12 sbol:Interaction elements");

        InteractionInfo tetRInhibitsPTet =
                toggleConverter.interactionDict.get("https://sbolcanvas.org/module1/Interaction_UUczwzgX");
        assertNotNull(tetRInhibitsPTet, "Interaction_UUczwzgX (TetR -| pTet) should be in dict");
        assertEquals(SystemsBiologyOntology.INHIBITION,
                SBOLData.interactions.getValue(tetRInhibitsPTet.getInteractionType()));

        InteractionInfo lacIInhibitsPLac =
                toggleConverter.interactionDict.get("https://sbolcanvas.org/module1/Interaction_MkDkvxHe");
        assertNotNull(lacIInhibitsPLac, "Interaction_MkDkvxHe (LacI -| pLac) should be in dict");
        assertEquals(SystemsBiologyOntology.INHIBITION,
                SBOLData.interactions.getValue(lacIInhibitsPLac.getInteractionType()));

        InteractionInfo geneticProduction =
                toggleConverter.interactionDict.get("https://sbolcanvas.org/module1/Interaction_R90j550X");
        assertNotNull(geneticProduction, "Interaction_R90j550X (production) should be in dict");
        assertEquals(SystemsBiologyOntology.GENETIC_PRODUCTION,
                SBOLData.interactions.getValue(geneticProduction.getInteractionType()));
    }

    @Test
    @DisplayName("mxGraph -> loadGraphAndDictionaries populates infoDict with the fixture's canonical glyphs")
    void downstreamInfoDictCarriesCanonicalToggleGlyphs() {
        GlyphInfo pLac = (GlyphInfo) converter.infoDict.get("https://sbolcanvas.org/Pro_WzDR/1");
        assertNotNull(pLac, "Pro_WzDR (pLac promoter) should be in infoDict");
        assertEquals("Pro_WzDR", pLac.getDisplayID());

        GlyphInfo pTet = (GlyphInfo) converter.infoDict.get("https://sbolcanvas.org/Pro_2Vk8/1");
        assertNotNull(pTet, "Pro_2Vk8 (pTet promoter) should be in infoDict");
        assertEquals("Pro_2Vk8", pTet.getDisplayID());

        GlyphInfo tetR = (GlyphInfo) converter.infoDict.get("https://sbolcanvas.org/lSfVayq6/1");
        assertNotNull(tetR, "lSfVayq6 (TetR protein) should be in infoDict");
        assertEquals("lSfVayq6", tetR.getDisplayID());
    }
}
