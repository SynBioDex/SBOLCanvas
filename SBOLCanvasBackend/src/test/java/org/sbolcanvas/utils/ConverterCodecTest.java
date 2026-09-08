package org.sbolcanvas.utils;

import java.net.URI;
import java.util.Hashtable;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import static org.junit.jupiter.api.Assertions.*;

import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.ComponentDefinition;

import com.mxgraph.io.mxCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.util.mxXmlUtils;
import com.mxgraph.view.mxGraph;

import org.w3c.dom.Document;
import org.w3c.dom.Node;

import org.sbolcanvas.data.GlyphInfo;
import org.sbolcanvas.data.InteractionInfo;
import org.sbolcanvas.data.EventInfo;

/** Tests for mxCodec encode/decode of data model classes and SBOL annotations. */
class ConverterCodecTest {

    @BeforeAll
    static void ensureCodecsRegistered() throws Exception {
        Class.forName("org.sbolcanvas.utils.Converter");
    }

    private static String encodeCellValueToXml(Object value) {
        mxGraph graph = new mxGraph();
        mxGraphModel model = (mxGraphModel) graph.getModel();

        model.beginUpdate();
        try {
            mxCell cell = (mxCell) model.getCell("1");
            cell.setValue(value);
        } finally {
            model.endUpdate();
        }

        mxCodec encoder = new mxCodec();
        Node encodedNode = encoder.encode(model);
        return mxXmlUtils.getXml(encodedNode);
    }

    private static Object encodeDecodeCellValue(Object value) {
        String xml = encodeCellValueToXml(value);

        Document doc = mxXmlUtils.parseXml(xml);
        mxCodec decoder = new mxCodec(doc);
        mxGraphModel decoded = new mxGraphModel();
        decoder.decode(doc.getDocumentElement(), decoded);

        mxCell decodedCell = (mxCell) decoded.getCell("1");
        assertNotNull(decodedCell, "Decoded graph should have cell '1'");
        return decodedCell.getValue();
    }

    @Nested
    @DisplayName("GlyphInfo Codec")
    class GlyphInfoCodec {

        @Test
        @DisplayName("simulationData survives encode/decode as Hashtable")
        void simulationDataPreservedAsHashtable() {
            GlyphInfo original = new GlyphInfo();
            Hashtable<String, Object> simData = new Hashtable<>();
            simData.put("kd", "0.0075");
            simData.put("initialAmount", "100");
            original.setSimulationData(simData);

            Object decoded = encodeDecodeCellValue(original);
            assertInstanceOf(GlyphInfo.class, decoded, "Decoded value should be GlyphInfo");
            GlyphInfo decodedGlyph = (GlyphInfo) decoded;

            Hashtable<String, Object> decodedSimData = decodedGlyph.getSimulationData();
            assertNotNull(decodedSimData, "simulationData should not be null after decode");
            assertInstanceOf(Hashtable.class, decodedSimData,
                    "simulationData should be Hashtable, not ArrayList");
            assertEquals("0.0075", decodedSimData.get("kd"));
            assertEquals("100", decodedSimData.get("initialAmount"));
        }

    }

    @Nested
    @DisplayName("InteractionInfo Codec")
    class InteractionInfoCodec {

        @Test
        @DisplayName("simulationData survives encode/decode as Hashtable")
        void simulationDataPreservedAsHashtable() {
            InteractionInfo original = new InteractionInfo();
            Hashtable<String, Object> simData = new Hashtable<>();
            simData.put("Kr_f", "0.5");
            simData.put("Kr_r", "1.0");
            simData.put("nc", "2.0");
            original.setSimulationData(simData);

            Object decoded = encodeDecodeCellValue(original);
            assertInstanceOf(InteractionInfo.class, decoded);
            InteractionInfo decodedInfo = (InteractionInfo) decoded;

            Hashtable<String, Object> decodedSimData = decodedInfo.getSimulationData();
            assertNotNull(decodedSimData, "simulationData should not be null after decode");
            assertInstanceOf(Hashtable.class, decodedSimData,
                    "simulationData should be Hashtable, not ArrayList");
            assertEquals(3, decodedSimData.size());
            assertEquals("0.5", decodedSimData.get("Kr_f"));
            assertEquals("1.0", decodedSimData.get("Kr_r"));
            assertEquals("2.0", decodedSimData.get("nc"));
        }

    }

    @Nested
    @DisplayName("EventInfo Codec")
    class EventInfoCodec {

        @Test
        @DisplayName("name, description, and simulationData all survive encode/decode")
        void nameDescriptionAndSimulationDataPreserved() {
            EventInfo original = new EventInfo();
            original.setName("IPTG_High");
            original.setDescription("IPTG set to high level");
            Hashtable<String, Object> simData = new Hashtable<>();
            simData.put("targetSpecies", "IPTG");
            simData.put("delay", "100");
            simData.put("assignmentValue", "50");
            original.setSimulationData(simData);

            Object decoded = encodeDecodeCellValue(original);
            assertInstanceOf(EventInfo.class, decoded);
            EventInfo decodedInfo = (EventInfo) decoded;

            assertEquals("IPTG_High", decodedInfo.getName(),
                    "name field should survive encode/decode");
            assertEquals("IPTG set to high level", decodedInfo.getDescription(),
                    "description field should survive encode/decode");

            Hashtable<String, Object> decodedSimData = decodedInfo.getSimulationData();
            assertNotNull(decodedSimData, "simulationData should not be null after decode");
            assertInstanceOf(Hashtable.class, decodedSimData,
                    "simulationData should be Hashtable, not ArrayList");
            assertEquals("IPTG", decodedSimData.get("targetSpecies"));
            assertEquals("100", decodedSimData.get("delay"));
            assertEquals("50", decodedSimData.get("assignmentValue"));
        }

    }

    /** @MethodSource for {@link SBOLAnnotationRoundTrip} (must be static; nested classes are inner). */
    static Stream<Arguments> emptyOrNullSimulationData() {
        return Stream.of(
                Arguments.of("empty Hashtable", new Hashtable<String, Object>()),
                Arguments.of("null", null)
        );
    }

    @Nested
    @DisplayName("SBOL Annotation Round-Trip")
    class SBOLAnnotationRoundTrip {

        @ParameterizedTest(name = "{0} simulationData creates no SBOLCanvas annotation child")
        @MethodSource("org.sbolcanvas.utils.ConverterCodecTest#emptyOrNullSimulationData")
        void emptyOrNullSimulationDataCreatesNoAnnotation(String label,
                Hashtable<String, Object> simData) throws Exception {
            SBOLDocument doc = new SBOLDocument();
            doc.setDefaultURIprefix("https://sbolcanvas.org/");
            ComponentDefinition cd = doc.createComponentDefinition(
                    "part_" + label.replaceAll("\\W", "_"), "1",
                    new URI("http://www.biopax.org/release/biopax-level3.owl#DnaRegion"));

            Converter.writeSimulationAnnotations(cd, simData, cd.getDisplayId());

            assertTrue(cd.getAnnotations().isEmpty(),
                    label + " simulationData should not create any SBOLCanvas annotation, got: "
                            + cd.getAnnotations());
        }
    }

}
