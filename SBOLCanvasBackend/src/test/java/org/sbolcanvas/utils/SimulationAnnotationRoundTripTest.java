package org.sbolcanvas.utils;

import java.util.Hashtable;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.SBOLDocument;

import org.sbolcanvas.data.GlyphInfo;
import org.sbolcanvas.data.Info;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.sbolcanvas.utils.SBOLTestSupport.NCNAME;
import static org.sbolcanvas.utils.SBOLTestSupport.TOGGLE_RESOURCE;
import static org.sbolcanvas.utils.SBOLTestSupport.convertToGraph;
import static org.sbolcanvas.utils.SBOLTestSupport.findCD;
import static org.sbolcanvas.utils.SBOLTestSupport.findSimulationDataAnnotation;
import static org.sbolcanvas.utils.SBOLTestSupport.loadSbol;
import static org.sbolcanvas.utils.SBOLTestSupport.serializeAndReread;

/** Round-trip for simulationData annotations: write/serialize/reread/import-into-GlyphInfo. */
class SimulationAnnotationRoundTripTest {

    @Test
    @DisplayName("SimulationData survives SBOL serialize/deserialize cycle")
    void simulationDataSurvivesSerializeCycle() throws Exception {
        SBOLDocument doc = loadSbol(TOGGLE_RESOURCE);
        ComponentDefinition cd = doc.getComponentDefinitions().iterator().next();
        String targetDisplayId = cd.getDisplayId();

        Hashtable<String, Object> simData = new Hashtable<String, Object>();
        simData.put("ko", "0.0075");
        simData.put("np", "10");
        simData.put("kd", "0.001");
        Converter.writeSimulationAnnotations(cd, simData, targetDisplayId);

        SBOLDocument reread = serializeAndReread(doc);
        ComponentDefinition rereadCD = findCD(reread, targetDisplayId);
        assertNotNull(rereadCD, "Should find CD '" + targetDisplayId + "' after re-read");

        Annotation simAnn = findSimulationDataAnnotation(rereadCD.getAnnotations());
        assertNotNull(simAnn,
            "simulationData annotation should survive serialize/deserialize");

        Hashtable<String, String> recovered = new Hashtable<>();
        for (Annotation child : simAnn.getAnnotations()) {
            recovered.put(child.getQName().getLocalPart(), child.getStringValue());
        }
        assertEquals(3, recovered.size(), "All 3 parameters should survive");
        assertEquals("0.0075", recovered.get("ko"));
        assertEquals("10", recovered.get("np"));
        assertEquals("0.001", recovered.get("kd"));
    }

    @Test
    @DisplayName("URI-containing keys survive write/serialize/read cycle as valid NCNames")
    void uriKeysSurviveSerializeCycle() throws Exception {
        SBOLDocument doc = loadSbol(TOGGLE_RESOURCE);
        ComponentDefinition cd = doc.getComponentDefinitions().iterator().next();
        String targetDisplayId = cd.getDisplayId();

        Hashtable<String, Object> simData = new Hashtable<String, Object>();
        simData.put("https://sbolcanvas.org/param", "42");
        Converter.writeSimulationAnnotations(cd, simData, targetDisplayId);

        SBOLDocument reread = serializeAndReread(doc);
        ComponentDefinition rereadCD = findCD(reread, targetDisplayId);
        assertNotNull(rereadCD);

        Annotation simAnn = findSimulationDataAnnotation(rereadCD.getAnnotations());
        assertNotNull(simAnn,
            "simulationData annotation should survive even when keys contain URIs");

        int childCount = 0;
        String storedValue = null;
        for (Annotation child : simAnn.getAnnotations()) {
            String localPart = child.getQName().getLocalPart();
            assertTrue(NCNAME.matcher(localPart).matches(),
                "Sanitized local-part must be a valid XML NCName: " + localPart);
            storedValue = child.getStringValue();
            childCount++;
        }
        assertEquals(1, childCount, "Exactly one nested annotation expected");
        assertEquals("42", storedValue,
            "URI-keyed value should survive NCName sanitization through SBOL XML");
    }

    @Test
    @DisplayName("SBOLToMx reads simulationData annotations into GlyphInfo")
    void sbolToMxReadsSimulationDataAnnotationsIntoGlyphInfo() throws Exception {
        SBOLDocument doc = loadSbol(TOGGLE_RESOURCE);

        ComponentDefinition targetCD = null;
        for (ComponentDefinition cd : doc.getComponentDefinitions()) {
            if (!cd.getRoles().isEmpty()) {
                targetCD = cd;
                break;
            }
        }
        assertNotNull(targetCD, "Should find a CD with roles");
        String targetDisplayId = targetCD.getDisplayId();
        String targetUri = targetCD.getIdentity().toString();

        Hashtable<String, Object> simData = new Hashtable<String, Object>();
        simData.put("ko", "0.005");
        Converter.writeSimulationAnnotations(targetCD, simData, targetDisplayId);

        SBOLToMx converter = convertToGraph(doc);

        Info targetInfo = converter.infoDict.get(targetUri);
        assertNotNull(targetInfo,
            "infoDict should contain an entry for the target CD (" + targetDisplayId + ")");
        assertTrue(targetInfo instanceof GlyphInfo,
            "Target CD should be imported as a GlyphInfo");
        GlyphInfo targetGlyph = (GlyphInfo) targetInfo;
        assertNotNull(targetGlyph.getSimulationData(),
            "GlyphInfo for " + targetDisplayId + " should have simulationData populated");
        assertEquals("0.005", targetGlyph.getSimulationData().get("ko").toString(),
            "simulationData['ko'] should match the value written on the source CD");
    }
}
