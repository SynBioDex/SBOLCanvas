package org.sbolcanvas.utils;

import java.util.Hashtable;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.GenericTopLevel;
import org.sbolstandard.core2.SBOLDocument;

import org.sbolcanvas.data.EventInfo;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.sbolcanvas.utils.SBOLTestSupport.TOGGLE_RESOURCE;
import static org.sbolcanvas.utils.SBOLTestSupport.convertToGraph;
import static org.sbolcanvas.utils.SBOLTestSupport.findSimulationDataAnnotation;
import static org.sbolcanvas.utils.SBOLTestSupport.loadSbol;
import static org.sbolcanvas.utils.SBOLTestSupport.serializeAndReread;

/** Event GenericTopLevels survive SBOLToMx import and libSBOLj serialize/deserialize. */
class EventGenericTopLevelPreservationTest {

    /** Adds an Event GenericTopLevel with simulationData + standard layout annotations to {@code doc}. */
    private static GenericTopLevel buildEventGTL(SBOLDocument doc, String displayId,
            Hashtable<String, Object> simData) throws Exception {
        GenericTopLevel eventGTL = doc.createGenericTopLevel(
                Converter.URI_PREFIX, displayId, "1",
                Converter.createQName("Event"));
        Converter.writeSimulationAnnotations(eventGTL, simData, displayId);
        eventGTL.createAnnotation(Converter.createQName("x"), "0.0");
        eventGTL.createAnnotation(Converter.createQName("y"), "0.0");
        eventGTL.createAnnotation(Converter.createQName("width"), "96.0");
        eventGTL.createAnnotation(Converter.createQName("height"), "40.0");
        return eventGTL;
    }

    private static EventInfo findEventByDisplayId(SBOLToMx converter, String displayId) {
        for (EventInfo event : converter.eventDict.values()) {
            if (displayId.equals(event.getDisplayID())) {
                return event;
            }
        }
        return null;
    }

    @Test
    @DisplayName("Event simulationData is read into EventInfo")
    void eventSimulationDataRead() throws Exception {
        SBOLDocument doc = loadSbol(TOGGLE_RESOURCE);
        Hashtable<String, Object> simData = new Hashtable<String, Object>();
        simData.put("trigger", "t >= 200");
        simData.put("delay", "5");
        simData.put("priority", "1");
        buildEventGTL(doc, "SimEvent", simData);

        SBOLToMx converter = convertToGraph(doc);
        EventInfo event = findEventByDisplayId(converter, "SimEvent");

        assertNotNull(event, "eventDict should contain SimEvent");
        assertNotNull(event.getSimulationData(),
            "EventInfo should have simulationData");
        assertEquals("t >= 200", event.getSimulationData().get("trigger"));
        assertEquals("5", event.getSimulationData().get("delay"));
        assertEquals("1", event.getSimulationData().get("priority"));
    }

    @Test
    @DisplayName("Event simulationData annotation survives serialize cycle (direct tree walk)")
    void eventSimulationDataSurvivesSerializeCycle() throws Exception {
        SBOLDocument doc = loadSbol(TOGGLE_RESOURCE);
        Hashtable<String, Object> simData = new Hashtable<String, Object>();
        simData.put("trigger", "t >= 300");
        buildEventGTL(doc, "PersistEvent", simData);

        SBOLDocument reread = serializeAndReread(doc);
        GenericTopLevel resultEvent = null;
        for (GenericTopLevel gtl : reread.getGenericTopLevels()) {
            if (gtl.getRDFType().getLocalPart().equals("Event")
                    && gtl.getDisplayId().equals("PersistEvent")) {
                resultEvent = gtl;
                break;
            }
        }
        assertNotNull(resultEvent, "Event GTL should survive SBOL serialize/deserialize");

        Annotation simAnn = findSimulationDataAnnotation(resultEvent.getAnnotations());
        assertNotNull(simAnn,
            "Event GTL should retain its simulationData annotation across the cycle");

        String triggerValue = null;
        for (Annotation child : simAnn.getAnnotations()) {
            if (child.getQName().getLocalPart().equals("trigger")) {
                triggerValue = child.getStringValue();
            }
        }
        assertEquals("t >= 300", triggerValue);
    }
}
