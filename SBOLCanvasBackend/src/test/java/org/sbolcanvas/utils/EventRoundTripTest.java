package org.sbolcanvas.utils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.Map;
import java.util.Set;

import javax.xml.namespace.QName;

import org.junit.jupiter.api.Test;
import org.sbml.jsbml.Model;
import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.FunctionalComponent;
import org.sbolstandard.core2.GenericTopLevel;
import org.sbolstandard.core2.ModuleDefinition;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLReader;
import org.sbolcanvas.data.EventInfo;
import org.sbolcanvas.data.GlyphInfo;
import org.sbolcanvas.data.Info;
import org.sbolcanvas.data.InteractionInfo;
import org.sbolcanvas.data.ModuleInfo;

import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGeometry;
import com.mxgraph.model.mxGraphModel;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EventRoundTripTest {

    private static final Set<String> EVENT_NAMES = new HashSet<>(Arrays.asList(
            "aTc_Low", "aTc_High", "IPTG_Low", "IPTG_High"));

    @Test
    void finalEventWithRepeatedSpeciesKeepsATarget() throws Exception {
        SBOLDocument original = SBOLTestSupport.loadSbol(SBOLTestSupport.TOGGLE_RESOURCE);
        ModuleDefinition module = original.getRootModuleDefinitions().iterator().next();
        FunctionalComponent iptg = null;
        for (FunctionalComponent component : module.getFunctionalComponents()) {
            if (component.getDefinition() != null && "IPTG".equals(component.getDefinition().getName()))
                iptg = component;
        }
        assertNotNull(iptg, "the toggle fixture has an IPTG instance");
        module.createFunctionalComponent("IPTG_second", iptg.getAccess(), iptg.getDefinitionURI(), iptg.getDirection());

        SBOLToMx converter = SBOLTestSupport.convertToGraph(original);
        for (EventInfo event : converter.eventDict.values()) {
            assertNotNull(event.getSimulationData().get("targetSpecies"),
                    event.getName() + " keeps a target when its species appears more than once");
        }
    }

    @Test
    void toggleEventsKeepNamesValuesTargetsAndGeometry() throws Exception {
        SBOLDocument original = SBOLTestSupport.loadSbol(SBOLTestSupport.TOGGLE_RESOURCE);
        SBOLToMx converter = SBOLTestSupport.convertToGraph(original);
        assertEquals(4, converter.eventDict.size());
        Set<String> names = new HashSet<>();
        ModuleDefinition module = original.getRootModuleDefinitions().iterator().next();
        for (EventInfo event : converter.eventDict.values()) {
            names.add(event.getName());
            assertNotNull(event.getSimulationData().get("delay"));
            assertTrue(((String) event.getSimulationData().get("targetSpecies")).startsWith("cell:"));
            mxCell cell = converter.layoutHelper.getGraphicalObject(module.getIdentity(), event.getDisplayID());
            assertNotNull(cell);
            assertTrue(cell.getGeometry().getWidth() > 0);
            assertTrue(cell.getGeometry().getHeight() > 0);
            }
        assertEquals(EVENT_NAMES, names);
        SBOLDocument exported = exportSbol(importModel(original));
        Map<String, URI> events = eventsByName(exported);
        assertEquals(EVENT_NAMES, events.keySet());
        for (GenericTopLevel topLevel : exported.getGenericTopLevels()) {
            assertFalse(Converter.createQName("Event").equals(topLevel.getRDFType()),
                    "events must be nested children, never standalone top-levels");
        }
        ModuleDefinition exportedModule = exported.getRootModuleDefinitions().iterator().next();
        GenericTopLevel layout = null;
        for (GenericTopLevel topLevel : exported.getGenericTopLevels()) {
            if ("Layout".equals(topLevel.getRDFType().getLocalPart())
                    && topLevel.getAnnotation(Converter.createQName("objectRef")) != null
                    && exportedModule.getIdentity()
                            .equals(topLevel.getAnnotation(Converter.createQName("objectRef")).getURIValue()))
                layout = topLevel;
    }
        assertNotNull(layout);
        Map<String, EventInfo> importedEvents = new HashMap<>();
        for (EventInfo event : converter.eventDict.values()) {
            importedEvents.put(event.getName(), event);
        }
        for (Map.Entry<String, URI> event : events.entrySet()) {
            EventInfo before = importedEvents.get(event.getKey());
            assertNotNull(before, "exported event '" + event.getKey() + "' must match an imported event by name");
            URI eventURI = event.getValue();
            Map<String, Object> afterData = SBOLTestSupport.modelEntries(exported, eventURI);
            assertEquals(before.getSimulationData().get("delay"), afterData.get("delay"));
            Object expectedAssignment = before.getSimulationData().get("assignmentValue");
            if (expectedAssignment == null) expectedAssignment = 0.0;
            Object assignment = afterData.get("assignmentValue");
            if (assignment == null) assignment = 0.0;
            assertEquals(expectedAssignment, assignment);
            assertTrue(afterData.get("targetSpecies") instanceof URI);
            URI target = (URI) afterData.get("targetSpecies");
            assertNotNull(exportedModule.getFunctionalComponent(target));
    }
    }

    @Test
    void eventWithoutLayoutOrTargetStillImportsAndExports() throws Exception {
        SBOLDocument doc = SBOLTestSupport.loadSbol(SBOLTestSupport.TOGGLE_RESOURCE);
        GenericTopLevel event = doc.createGenericTopLevel(Converter.URI_PREFIX, "incomplete", "1",
                Converter.createQName("Event"));
        event.setName("IPTG_Spike");
        Hashtable<String, Object> data = new Hashtable<>();
        data.put("delay", 100.0);
        SBOLTestSupport.writeAnnotatedSimulationData(event, data, event.getDisplayId());
        SBOLToMx converter = SBOLTestSupport.convertToGraph(doc);
        EventInfo imported = eventByName(converter, "IPTG_Spike");
        assertNotNull(imported);
        assertNull(imported.getSimulationData().get("targetSpecies"));
        assertFalse(imported.getSimulationData().containsKey("name"));
        mxGraphModel graph = importModel(doc);
        mxCell cell = GraphModelSupport.cellWithValue(graph, imported.getFullURI());
        assertNotNull(cell);
        assertEquals(Converter.STYLE_MODULE_VIEW, cell.getParent().getStyle());
        assertNotNull(eventsByName(exportSbol(graph)).get("IPTG_Spike"));
        assertEquals(4, GraphModelSupport.toSbmlModel(graph).getEventCount());
    }

    @Test
    void targetKeepsItsInstanceAcrossSaveAndReopen() throws Exception {
        EventInfo event = GraphModelSupport.eventInfo("event", null);
        mxGraphModel graph = repeatedDefinitionCanvas(event);
        mxCell target = null;
        for (Object value : graph.getCells().values()) {
            mxCell cell = (mxCell) value;
            if (cell.getGeometry() != null && cell.getGeometry().getX() == 500) target = cell;
        }
        assertNotNull(target);
        event.getSimulationData().put("targetSpecies", "cell:" + target.getId());
        SBOLDocument doc = SBOLTestSupport.serializeAndReread(exportSbol(graph));
        URI savedEvent = eventsByName(doc).get("event");
        assertNotNull(savedEvent);
        URI targetUri = (URI) SBOLTestSupport.modelEntries(doc, savedEvent).get("targetSpecies");
        assertNotNull(targetUri);
        ModuleDefinition module = doc.getRootModuleDefinitions().iterator().next();
        assertNotNull(module.getFunctionalComponent(targetUri));
        SBOLToMx converter = SBOLTestSupport.convertToGraph(doc);
        EventInfo importedEvent = eventByName(converter, "event");
        String reference = (String) importedEvent.getSimulationData().get("targetSpecies");
        mxGraphModel imported = importModel(doc);
        mxCell importedTarget = (mxCell) imported.getCell(reference.substring("cell:".length()));
        assertNotNull(importedTarget);
        assertEquals(500.0, importedTarget.getGeometry().getX());
        Model sbml = GraphModelSupport.toSbmlModel(imported);
        assertEquals(1, sbml.getEventCount());
        String speciesId = sbml.getEvent(0).getEventAssignment(0).getVariable();
        org.sbml.jsbml.ext.layout.LayoutModelPlugin plugin =
                (org.sbml.jsbml.ext.layout.LayoutModelPlugin) sbml.getPlugin("layout");
        for (org.sbml.jsbml.ext.layout.SpeciesGlyph glyph : plugin.getLayout(0).getListOfSpeciesGlyphs()) {
            if (speciesId.equals(glyph.getSpecies())) assertEquals(565.0, glyph.getBoundingBox().getPosition().getX());
        }
        SBOLDocument secondExport = exportSbol(imported);
        URI secondTarget = (URI) SBOLTestSupport.modelEntries(secondExport,
                eventsByName(secondExport).get("event")).get("targetSpecies");
        FunctionalComponent rebound = secondExport.getRootModuleDefinitions().iterator().next()
                .getFunctionalComponent(secondTarget);
        assertNotNull(rebound);
    }

    @Test
    void crossViewTargetKeepsItsInstanceAcrossReopen() throws Exception {
        EventInfo event = GraphModelSupport.eventInfo("event", null);
        event.setName("event");
        GlyphInfo protein = GraphModelSupport.glyphInfo("protein", "Protein");
        ModuleInfo home = GraphModelSupport.moduleInfo("home");
        ModuleInfo away = GraphModelSupport.moduleInfo("away");
        mxGraphModel graph = new mxGraphModel();
        GraphModelSupport.install(graph, GraphModelSupport.dataContainer(
                Arrays.<Info>asList(protein, home, away),
                Collections.<InteractionInfo>emptyList(),
                Collections.singletonList(event)));
        mxCell homeView = GraphModelSupport.moduleViewCell(graph, home.getFullURI());
        mxCell awayView = GraphModelSupport.moduleViewCell(graph, away.getFullURI());
        GraphModelSupport.species(graph, homeView, protein.getFullURI()).getGeometry().setX(10);
        mxCell awayTarget = GraphModelSupport.species(graph, awayView, protein.getFullURI());
        awayTarget.getGeometry().setX(500);
        mxCell eventCell = new mxCell(event.getFullURI(), new mxGeometry(300, 300, 96, 40),
                Converter.STYLE_EVENT);
        eventCell.setVertex(true);
        graph.add(homeView, eventCell, homeView.getChildCount());
        event.getSimulationData().put("targetSpecies", "cell:" + awayTarget.getId());

        SBOLDocument doc = SBOLTestSupport.serializeAndReread(exportSbol(graph));
        URI savedEvent = eventsByName(doc).get("event");
        assertNotNull(savedEvent);
        URI targetUri = (URI) SBOLTestSupport.modelEntries(doc, savedEvent).get("targetSpecies");
        assertNotNull(targetUri);
        ModuleDefinition awayModule = null;
        for (ModuleDefinition module : doc.getModuleDefinitions()) {
            if ("away".equals(module.getDisplayId())) awayModule = module;
        }
        assertNotNull(awayModule);
        assertNotNull(awayModule.getFunctionalComponent(targetUri),
                "the saved reference must name the away instance, not the home one");

        SBOLToMx converter = SBOLTestSupport.convertToGraph(doc);
        String reference = (String) eventByName(converter, "event").getSimulationData().get("targetSpecies");
        mxGraphModel imported = importModel(doc);
        mxCell importedTarget = (mxCell) imported.getCell(reference.substring("cell:".length()));
        assertNotNull(importedTarget);
        assertEquals(500.0, importedTarget.getGeometry().getX(),
                "the reopened event must reference the away view's instance");

        SBOLDocument secondExport = exportSbol(imported);
        URI secondTarget = (URI) SBOLTestSupport.modelEntries(secondExport,
                eventsByName(secondExport).get("event")).get("targetSpecies");
        for (ModuleDefinition module : secondExport.getModuleDefinitions()) {
            if ("away".equals(module.getDisplayId())) awayModule = module;
        }
        assertNotNull(awayModule);
        FunctionalComponent rebound = awayModule.getFunctionalComponent(secondTarget);
        assertNotNull(rebound, "the re-exported reference resolves to a live away functional component");
    }

    private static mxGraphModel repeatedDefinitionCanvas(EventInfo event) throws Exception {
        GraphModelSupport.ensureCodecsRegistered();
        event.setName("event");
        GlyphInfo protein = GraphModelSupport.glyphInfo("protein", "Protein");
        ModuleInfo module = GraphModelSupport.moduleInfo("module");
        mxGraphModel graph = new mxGraphModel();
        GraphModelSupport.install(graph, GraphModelSupport.dataContainer(Arrays.<Info>asList(protein, module),
                Collections.<InteractionInfo>emptyList(), Collections.singletonList(event)));
        mxCell view = GraphModelSupport.moduleViewCell(graph, module.getFullURI());
        GraphModelSupport.species(graph, view, protein.getFullURI()).getGeometry().setX(10);
        GraphModelSupport.species(graph, view, protein.getFullURI()).getGeometry().setX(500);
        mxCell cell = new mxCell(event.getFullURI(), new mxGeometry(300, 300, 96, 40), Converter.STYLE_EVENT);
        cell.setVertex(true);
        graph.add(view, cell, view.getChildCount());
        return graph;
    }

    private static EventInfo eventByName(SBOLToMx converter, String name) {
        for (EventInfo event : converter.eventDict.values()) {
            if (name.equals(event.getName())) return event;
                }
        return null;
            }

    private static Map<String, URI> eventsByName(SBOLDocument doc) {
        Map<String, URI> events = new HashMap<>();
        for (GenericTopLevel model : ModelHelper.findModels(doc)) {
            for (Annotation entity : ModelHelper.events(model)) {
                String name = null;
                for (Annotation child : entity.getAnnotations()) {
                    if ("name".equals(child.getQName().getLocalPart())) name = child.getStringValue();
                }
                events.put(name, SBOLTestSupport.eventIdentity(model, entity));
            }
        }
        return events;
    }

    private static mxGraphModel importModel(SBOLDocument doc) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        new SBOLToMx().toGraph(doc, out);
        return GraphModelSupport.decodeModel(out.toString("UTF-8"));
        }

    private static SBOLDocument exportSbol(mxGraphModel graph) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        new MxToSBOL(new HashMap<String, String>()).toSBOL(
                new ByteArrayInputStream(GraphModelSupport.encodeModel(graph).getBytes("UTF-8")), out);
        return SBOLReader.read(new ByteArrayInputStream(out.toByteArray()));
    }
}
