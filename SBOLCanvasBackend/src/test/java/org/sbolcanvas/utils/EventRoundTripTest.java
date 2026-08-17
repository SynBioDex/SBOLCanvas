package org.sbolcanvas.utils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.xml.namespace.QName;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.GenericTopLevel;
import org.sbolstandard.core2.ModuleDefinition;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLReader;

import com.mxgraph.io.mxCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.util.mxXmlUtils;
import com.mxgraph.view.mxGraph;

import org.w3c.dom.Document;

import org.sbolcanvas.data.EventInfo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.sbolcanvas.utils.SBOLTestSupport.TOGGLE_RESOURCE;
import static org.sbolcanvas.utils.SBOLTestSupport.convertToGraph;
import static org.sbolcanvas.utils.SBOLTestSupport.findSimulationDataAnnotation;
import static org.sbolcanvas.utils.SBOLTestSupport.loadSbol;

/**
 * Events survive the SBOL to mxGraph round-trip, and the importer tolerates incomplete events
 * rather than crashing. An event's name is the SBOL name and its geometry lives in the owning
 * module's Layout extension.
 */
class EventRoundTripTest {

    /** The four events the toggle fixture carries, keyed by displayId -> SBOL name. */
    private static final Map<String, String> EXPECTED_EVENT_NAMES = new HashMap<String, String>();
    static {
        EXPECTED_EVENT_NAMES.put("Event_l9xynw", "aTc_Low");
        EXPECTED_EVENT_NAMES.put("Event_d1mc9s", "aTc_High");
        EXPECTED_EVENT_NAMES.put("Event_t2vtli", "IPTG_Low");
        EXPECTED_EVENT_NAMES.put("Event_6aiikc", "IPTG_High");
    }

    private static EventInfo findEventByDisplayId(SBOLToMx converter, String displayId) {
        for (EventInfo event : converter.eventDict.values()) {
            if (displayId.equals(event.getDisplayID())) {
                return event;
            }
        }
        return null;
    }

    /** Add an Event GenericTopLevel with simulationData but no Layout node (the incomplete shape). */
    private static void addIncompleteEvent(SBOLDocument doc, String displayId,
            Hashtable<String, Object> simData) throws Exception {
        GenericTopLevel gtl = doc.createGenericTopLevel(
                Converter.URI_PREFIX, displayId, "1",
                new QName("https://sbolcanvas.org/", "Event", "SBOLCanvas"));
        List<Annotation> annList = new ArrayList<Annotation>();
        for (String key : simData.keySet()) {
            annList.add(new Annotation(
                    new QName("https://sbolcanvas.org/", key, "SBOLCanvas"), simData.get(key).toString()));
        }
        gtl.createAnnotation(
                new QName("https://sbolcanvas.org/", "simulationData", "SBOLCanvas"),
                new QName("https://sbolcanvas.org/", "SimulationData", "SBOLCanvas"),
                displayId + "_SimulationData", annList);
    }

    /** Re-run the import to obtain a decoded graph the test can walk. */
    private static mxGraphModel decodeGraph(SBOLDocument doc) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        new SBOLToMx().toGraph(doc, out);
        Document xmlDoc = mxXmlUtils.parseXml(out.toString());
        mxCodec codec = new mxCodec(xmlDoc);
        mxGraph graph = new mxGraph();
        ((mxGraphModel) graph.getModel()).setMaintainEdgeParent(false);
        codec.decode(xmlDoc.getDocumentElement(), graph.getModel());
        return (mxGraphModel) graph.getModel();
    }

    private static mxCell findRootModuleView(mxGraphModel model) {
        mxCell cell1 = (mxCell) model.getCell("1");
        for (int i = 0; i < cell1.getChildCount(); i++) {
            mxCell child = (mxCell) cell1.getChildAt(i);
            if (Converter.STYLE_MODULE_VIEW.equals(child.getStyle())) {
                return child;
            }
        }
        return null;
    }

    private static Set<String> collectEventCellValues(mxCell moduleView) {
        Set<String> values = new HashSet<String>();
        for (int i = 0; i < moduleView.getChildCount(); i++) {
            mxCell child = (mxCell) moduleView.getChildAt(i);
            if (child.getStyle() != null && child.getStyle().contains(Converter.STYLE_EVENT)) {
                values.add((String) child.getValue());
            }
        }
        return values;
    }

    @Nested
    @DisplayName("Round-trip")
    class RoundTrip {

        @Test
        @DisplayName("Import: events land in eventDict with the name from the SBOL name")
        void eventsImportWithName() throws Exception {
            SBOLDocument doc = loadSbol(TOGGLE_RESOURCE);
            SBOLToMx converter = convertToGraph(doc);

            assertEquals(EXPECTED_EVENT_NAMES.size(), converter.eventDict.size(),
                    "every fixture event should be restored into eventDict");

            for (Map.Entry<String, String> entry : EXPECTED_EVENT_NAMES.entrySet()) {
                String displayId = entry.getKey();
                String expectedName = entry.getValue();

                EventInfo event = findEventByDisplayId(converter, displayId);
                assertNotNull(event, "eventDict should contain " + displayId);

                assertEquals(expectedName, event.getName(),
                        displayId + " name should come from the SBOL name");
                assertNotNull(event.getSimulationData(), displayId + " should have simulationData");
                assertNotNull(event.getSimulationData().get("delay"),
                        displayId + " simulationData should carry delay");
                assertNotNull(event.getSimulationData().get("targetSpecies"),
                        displayId + " simulationData should carry targetSpecies");
            }
        }

        @Test
        @DisplayName("Import: event geometry resolves via the module Layout extension")
        void eventGeometryLivesInModuleLayout() throws Exception {
            SBOLDocument doc = loadSbol(TOGGLE_RESOURCE);
            SBOLToMx converter = convertToGraph(doc);

            ModuleDefinition modDef = doc.getRootModuleDefinitions().iterator().next();

            for (String displayId : EXPECTED_EVENT_NAMES.keySet()) {
                mxCell node = converter.layoutHelper.getGraphicalObject(modDef.getIdentity(), displayId);
                assertNotNull(node,
                        displayId + " geometry should resolve via the module Layout extension");
                assertNotNull(node.getGeometry(), displayId + " layout node should carry geometry");
                assertTrue(node.getGeometry().getWidth() > 0 && node.getGeometry().getHeight() > 0,
                        displayId + " layout node should have positive dimensions");
            }
        }

        @Test
        @DisplayName("Round-trip: event names and sim params survive SBOL -> mxGraph -> SBOL")
        void eventsSurviveFullRoundTrip() throws Exception {
            SBOLDocument original = loadSbol(TOGGLE_RESOURCE);

            SBOLToMx toMx = new SBOLToMx();
            ByteArrayOutputStream graphOut = new ByteArrayOutputStream();
            toMx.toGraph(original, graphOut);

            // mxGraph -> SBOL (empty token map: no SynBioHub registries in a unit test)
            MxToSBOL toSbol = new MxToSBOL(new HashMap<String, String>());
            ByteArrayOutputStream sbolOut = new ByteArrayOutputStream();
            toSbol.toSBOL(new ByteArrayInputStream(graphOut.toByteArray()), sbolOut);

            SBOLDocument reexported = SBOLReader.read(new ByteArrayInputStream(sbolOut.toByteArray()));

            Map<String, GenericTopLevel> eventsByDisplayId = new HashMap<String, GenericTopLevel>();
            for (GenericTopLevel gtl : reexported.getGenericTopLevels()) {
                if (gtl.getRDFType().equals(new QName("https://sbolcanvas.org/", "Event", "SBOLCanvas"))) {
                    eventsByDisplayId.put(gtl.getDisplayId(), gtl);
                }
            }

            assertEquals(EXPECTED_EVENT_NAMES.size(), eventsByDisplayId.size(),
                    "re-export should emit exactly the fixture's events (no drops, no orphans)");

            Set<String> seenNames = new HashSet<String>();
            for (Map.Entry<String, String> entry : EXPECTED_EVENT_NAMES.entrySet()) {
                String displayId = entry.getKey();
                String expectedName = entry.getValue();

                GenericTopLevel gtl = eventsByDisplayId.get(displayId);
                assertNotNull(gtl, "re-export should contain Event " + displayId);
                assertEquals(expectedName, gtl.getName(),
                        displayId + " SBOL name should survive the round-trip");
                seenNames.add(gtl.getName());

                Annotation simAnn = findSimulationDataAnnotation(gtl.getAnnotations());
                assertNotNull(simAnn, displayId + " should still carry a simulationData annotation");

                boolean hasDelay = false;
                for (Annotation child : simAnn.getAnnotations()) {
                    if (child.getQName().getLocalPart().equals("delay")) {
                        hasDelay = true;
                    }
                }
                assertTrue(hasDelay, displayId + " simulationData should still carry its delay param");
            }
            assertEquals(EXPECTED_EVENT_NAMES.size(), seenNames.size(),
                    "every event name should round-trip distinctly");
        }
    }

    @Nested
    @DisplayName("Tolerance")
    class Tolerance {

        @Test
        @DisplayName("An event with no layout node loads, lands in the root view, and migrates a name from simulationData")
        void incompleteEventLoadsAtFallbackPosition() throws Exception {
            SBOLDocument doc = loadSbol(TOGGLE_RESOURCE);

            Hashtable<String, Object> namedData = new Hashtable<String, Object>();
            namedData.put("name", "IPTG_Spike");
            namedData.put("targetSpecies", "IPTG");
            namedData.put("delay", "100");
            addIncompleteEvent(doc, "Event_incomplete_named", namedData);

            Hashtable<String, Object> unnamedData = new Hashtable<String, Object>();
            unnamedData.put("targetSpecies", "aTc");
            addIncompleteEvent(doc, "Event_incomplete_unnamed", unnamedData);

            SBOLToMx converter = convertToGraph(doc);

            EventInfo named = findEventByDisplayId(converter, "Event_incomplete_named");
            assertNotNull(named, "incomplete named event should be kept, not dropped");
            assertEquals("IPTG_Spike", named.getName(), "name should be lifted from simulationData");
            assertNull(named.getSimulationData().get("name"),
                    "name key should be cleared once lifted into the name field");
            assertNotNull(named.getSimulationData().get("targetSpecies"), "sim params should survive");

            EventInfo unnamed = findEventByDisplayId(converter, "Event_incomplete_unnamed");
            assertNotNull(unnamed, "incomplete unnamed event should be kept, not dropped");
            assertTrue(unnamed.getName() == null || unnamed.getName().isEmpty(),
                    "an event with no name stays unnamed and falls back to its displayId downstream");

            mxGraphModel model = decodeGraph(doc);
            mxCell moduleView = findRootModuleView(model);
            assertNotNull(moduleView, "root module view should exist");
            Set<String> placed = collectEventCellValues(moduleView);
            assertTrue(placed.contains(named.getFullURI()),
                    "named incomplete event should be placed in the root module view");
            assertTrue(placed.contains(unnamed.getFullURI()),
                    "unnamed incomplete event should be placed in the root module view");
        }
    }
}
