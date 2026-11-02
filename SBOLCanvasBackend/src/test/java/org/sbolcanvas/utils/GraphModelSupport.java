package org.sbolcanvas.utils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.Map;

import com.mxgraph.io.mxCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGeometry;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.util.mxXmlUtils;

import org.sbml.jsbml.Model;
import org.sbml.jsbml.Species;

import org.sbolcanvas.data.EventInfo;
import org.sbolcanvas.data.GlyphInfo;
import org.sbolcanvas.data.Info;
import org.sbolcanvas.data.ModuleInfo;
import org.sbolcanvas.data.InteractionInfo;

import static org.junit.jupiter.api.Assertions.assertNotNull;

final class GraphModelSupport {

    static final String STYLE_MOLECULAR_SPECIES = "molecularSpeciesGlyph";
    static final String STYLE_SEQUENCE_FEATURE = "sequenceFeatureGlyph";
    static final String STYLE_INTERACTION_NODE = "interactionNodeGlyph";
    static final String STYLE_INTERACTION = "interactionGlyph";
    static final String STYLE_CIRCUIT_CONTAINER = "circuitContainer";
    static final String STYLE_BACKBONE = "backbone";

    private GraphModelSupport() {
    }

    static ArrayList<Object> dataContainer(Iterable<? extends Info> infos, Iterable<InteractionInfo> interactions) {
        return dataContainer(infos, interactions, java.util.Collections.<EventInfo>emptyList());
    }

    static ArrayList<Object> dataContainer(Iterable<? extends Info> infos, Iterable<InteractionInfo> interactions,
            Iterable<EventInfo> events) {
        ArrayList<Object> glyphDict = new ArrayList<>();
        for (Info g : infos) {
            glyphDict.add(g);
        }
        ArrayList<Object> interactionDict = new ArrayList<>();
        for (InteractionInfo i : interactions) {
            interactionDict.add(i);
        }
        ArrayList<Object> eventDict = new ArrayList<>();
        for (EventInfo e : events) {
            eventDict.add(e);
        }
        ArrayList<Object> container = new ArrayList<>();
        container.add(glyphDict);
        container.add(new ArrayList<>());
        container.add(interactionDict);
        container.add(eventDict);
        return container;
    }

    static mxCell species(mxGraphModel model, mxCell parent, String uri) {
        mxCell cell = new mxCell(uri, new mxGeometry(0, 0, 40, 40), STYLE_MOLECULAR_SPECIES + "Protein");
        cell.setVertex(true);
        model.add(parent, cell, parent.getChildCount());
        return cell;
    }

    static mxCell sequenceFeature(mxGraphModel model, mxCell parent, String uri) {
        mxCell cell = new mxCell(uri, new mxGeometry(0, 200, 40, 40), STYLE_SEQUENCE_FEATURE + "CDS");
        cell.setVertex(true);
        model.add(parent, cell, parent.getChildCount());
        return cell;
    }

    static mxCell circuitContainer(mxGraphModel model, mxCell parent, String uri) {
        mxCell cell = new mxCell(uri, new mxGeometry(0, 0, 400, 60), STYLE_CIRCUIT_CONTAINER);
        cell.setVertex(true);
        model.add(parent, cell, parent.getChildCount());
        mxCell backbone = new mxCell(null, new mxGeometry(0, 30, 400, 2), STYLE_BACKBONE);
        backbone.setVertex(true);
        model.add(cell, backbone, cell.getChildCount());
        return cell;
    }

    static mxCell promoterGlyph(mxGraphModel model, mxCell parent, String uri) {
        mxCell cell = new mxCell(uri, new mxGeometry(10, 10, 40, 40), STYLE_SEQUENCE_FEATURE + "Pro (Promoter)");
        cell.setVertex(true);
        model.add(parent, cell, parent.getChildCount());
        return cell;
    }

    static mxCell interactionNode(mxGraphModel model, mxCell parent, String uri) {
        mxCell cell = new mxCell(uri, new mxGeometry(100, 100, 40, 40), STYLE_INTERACTION_NODE + "process");
        cell.setVertex(true);
        model.add(parent, cell, parent.getChildCount());
        return cell;
    }

    static mxCell processEdge(mxGraphModel model, mxCell parent, String value, mxCell source, mxCell target) {
        mxCell cell = new mxCell(value, new mxGeometry(), STYLE_INTERACTION + "Process");
        cell.setEdge(true);
        model.add(parent, cell, parent.getChildCount());
        model.setTerminal(cell, source, true);
        model.setTerminal(cell, target, false);
        return cell;
    }

    static mxCell viewCell(mxGraphModel model) {
        mxCell layer = (mxCell) model.getCell("1");
        mxCell view = new mxCell("view", new mxGeometry(), "componentViewCell");
        view.setVertex(true);
        model.add(layer, view, layer.getChildCount());
        return view;
    }

    static mxCell moduleViewCell(mxGraphModel model, String moduleUri) {
        mxCell layer = (mxCell) model.getCell("1");
        mxCell view = new mxCell(moduleUri, new mxGeometry(), "moduleViewCell");
        view.setId(moduleUri);
        view.setVertex(true);
        model.add(layer, view, layer.getChildCount());
        return view;
    }

    static mxCell firstViewCell(mxGraphModel model) {
        mxCell layer = (mxCell) model.getCell("1");
        return (mxCell) layer.getChildAt(0);
    }

    static void install(mxGraphModel model, ArrayList<Object> container) {
        model.setMaintainEdgeParent(false);
        ((mxCell) model.getCell("0")).setValue(container);
    }

    static String encodeModel(mxGraphModel model) {
        mxCodec encoder = new mxCodec();
        return mxXmlUtils.getXml(encoder.encode(model));
    }

    static GlyphInfo glyphInfo(String displayID, String partType) {
        GlyphInfo info = new GlyphInfo();
        info.setDisplayID(displayID);
        info.setName(displayID);
        info.setPartType(partType);
        info.setUriPrefix("https://sbolcanvas.org");
        info.setVersion("1");
        return info;
    }

    static ModuleInfo moduleInfo(String displayID) {
        ModuleInfo info = new ModuleInfo();
        info.setDisplayID(displayID);
        info.setUriPrefix("https://sbolcanvas.org");
        info.setVersion("1");
        return info;
    }

    static InteractionInfo interactionInfo(String displayID, String interactionType) {
        InteractionInfo info = new InteractionInfo();
        info.setUriPrefix("https://sbolcanvas.org");
        info.setVersion("1");
        info.setDisplayID(displayID);
        info.setInteractionType(interactionType);
        return info;
    }

    static EventInfo eventInfo(String displayID, String targetSpecies) {
        EventInfo info = new EventInfo();
        info.setUriPrefix("https://sbolcanvas.org");
        info.setVersion("1");
        info.setDisplayID(displayID);
        Hashtable<String, Object> simulationData = new Hashtable<>();
        if (targetSpecies != null) {
            simulationData.put(SBOLData.PARAM_EVENT_TARGET_SPECIES, targetSpecies);
        }
        info.setSimulationData(simulationData);
        return info;
    }

    static mxGraphModel sbolRoundTrip(mxGraphModel model) throws Exception {
        byte[] graphXml = encodeModel(model).getBytes("UTF-8");

        MxToSBOL toSbol = new MxToSBOL(new HashMap<String, String>());
        ByteArrayOutputStream sbolOut = new ByteArrayOutputStream();
        toSbol.toSBOL(new ByteArrayInputStream(graphXml), sbolOut);

        SBOLToMx toMx = new SBOLToMx();
        ByteArrayOutputStream graphOut = new ByteArrayOutputStream();
        toMx.toGraph(new ByteArrayInputStream(sbolOut.toByteArray()), graphOut);

        return loadedModel(graphOut.toString("UTF-8"));
    }

    static mxGraphModel decodeModel(String graphXml) {
        org.w3c.dom.Document document = mxXmlUtils.parseXml(graphXml);
        mxGraphModel model = new mxGraphModel();
        model.setMaintainEdgeParent(false);
        new mxCodec(document).decode(document.getDocumentElement(), model);
        return model;
    }

    static mxGraphModel loadedModel(String graphXml) throws IOException {
        MxToSBML loader = new MxToSBML();
        return (mxGraphModel) loader.loadGraphAndDictionaries(
                new ByteArrayInputStream(graphXml.getBytes("UTF-8"))).getModel();
    }

    static Model toSbmlModel(mxGraphModel model) throws Exception {
        byte[] graphXml = encodeModel(model).getBytes("UTF-8");
        MxToSBML converter = new MxToSBML();
        java.io.ByteArrayOutputStream sbmlOut = new java.io.ByteArrayOutputStream();
        converter.toSBML(new ByteArrayInputStream(graphXml), sbmlOut);
        return org.sbml.jsbml.SBMLReader.read(new ByteArrayInputStream(sbmlOut.toByteArray())).getModel();
    }

    static void ensureCodecsRegistered() throws ClassNotFoundException {
        Class.forName("org.sbolcanvas.utils.Converter");
    }

    @SuppressWarnings("unchecked")
    static InteractionInfo importedInteraction(mxGraphModel model, String interactionDisplayId) {
        mxCell root = (mxCell) model.getCell("0");
        if (root == null || !(root.getValue() instanceof ArrayList)) {
            return null;
        }
        ArrayList<Object> container = (ArrayList<Object>) root.getValue();
        Object slot = container.get(Converter.INTERACTION_DICT_INDEX);
        Collection<Object> values;
        if (slot instanceof Map) {
            values = ((Map<String, Object>) slot).values();
        } else if (slot instanceof ArrayList) {
            values = (ArrayList<Object>) slot;
        } else {
            return null;
        }
        for (Object value : values) {
            if (value instanceof InteractionInfo
                    && interactionDisplayId.equals(((InteractionInfo) value).getDisplayID())) {
                return (InteractionInfo) value;
            }
        }
        return null;
    }

    static mxCell cellWithValue(mxGraphModel model, String value) {
        for (Object cell : model.getCells().values()) {
            mxCell c = (mxCell) cell;
            if (value.equals(c.getValue())) {
                return c;
            }
        }
        return null;
    }

    static String speciesName(Model model, String speciesId) {
        Species species = model.getSpecies(speciesId);
        assertNotNull(species, "the exported reaction should reference a known species: " + speciesId);
        return species.getName();
    }
}
