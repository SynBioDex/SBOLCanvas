package org.sbolcanvas.utils;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.ByteArrayOutputStream;
import java.net.URI;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.sbolstandard.core2.AccessType;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.SBOLDocument;

import com.mxgraph.io.mxCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.util.mxXmlUtils;
import com.mxgraph.view.mxGraph;
import org.w3c.dom.Document;

class SBOLToMxRoleHandlingTest {

    private static final String ROOT_URI = "https://sbolcanvas.org/root/1";
    private static final URI CIRCULAR_BACKBONE = SBOLData.roles.getValue("Cir (Circular Backbone)");

    @BeforeAll
    static void ensureCodecsRegistered() throws Exception {
        Class.forName("org.sbolcanvas.utils.Converter");
    }

    @Test
    void rolelessComponentDoesNotAbortImport() throws Exception {
        SBOLDocument document = createDocument(false);

        assertDoesNotThrow(() -> new SBOLToMx().toGraph(document, new ByteArrayOutputStream()));
    }

    @Test
    void circularBackboneRoleIsDetectedAmongMultipleRoles() throws Exception {
        SBOLDocument document = createDocument(true);
        mxGraphModel model = convertAndDecode(document);
        mxCell rootView = (mxCell) model.getCell(ROOT_URI);
        assertNotNull(rootView, "root component view must be emitted");

        mxCell container = null;
        for (int i = 0; i < rootView.getChildCount(); i++) {
            mxCell child = (mxCell) rootView.getChildAt(i);
            if (Converter.STYLE_CIRCUIT_CONTAINER.equals(child.getStyle())) {
                container = child;
                break;
            }
        }
        assertNotNull(container, "root circuit container must be emitted");

        int glyphCount = 0;
        for (int i = 0; i < container.getChildCount(); i++) {
            mxCell child = (mxCell) container.getChildAt(i);
            if (Converter.STYLE_SEQUENCE_FEATURE.equals(child.getStyle())) {
                glyphCount++;
            }
        }
        assertEquals(2, glyphCount, "a circular backbone glyph should be duplicated");
    }

    private static SBOLDocument createDocument(boolean circularBackbone) throws Exception {
        SBOLDocument document = new SBOLDocument();
        document.setDefaultURIprefix("https://sbolcanvas.org/");
        ComponentDefinition root = document.createComponentDefinition(
                "root", "1", ComponentDefinition.DNA_REGION);
        ComponentDefinition glyph = document.createComponentDefinition(
                "glyph", "1", ComponentDefinition.DNA_REGION);

        if (circularBackbone) {
            addCircularRoleAfterAnotherRole(glyph);
        }
        root.createComponent("glyphInstance", AccessType.PUBLIC, glyph.getIdentity());
        return document;
    }

    /** Choose a second role whose HashSet iteration precedes the circular role. */
    private static void addCircularRoleAfterAnotherRole(ComponentDefinition glyph) {
        for (int i = 0; i < 1000; i++) {
            glyph.clearRoles();
            glyph.addRole(CIRCULAR_BACKBONE);
            glyph.addRole(URI.create("https://example.org/non-circular-role-" + i));
            if (!CIRCULAR_BACKBONE.equals(glyph.getRoles().iterator().next())) {
                return;
            }
        }
        throw new AssertionError("Could not construct a deterministic non-first circular role");
    }

    private static mxGraphModel convertAndDecode(SBOLDocument document) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        new SBOLToMx().toGraph(document, out);

        Document xmlDocument = mxXmlUtils.parseXml(out.toString());
        mxCodec codec = new mxCodec(xmlDocument);
        mxGraph graph = new mxGraph();
        ((mxGraphModel) graph.getModel()).setMaintainEdgeParent(false);
        codec.decode(xmlDocument.getDocumentElement(), graph.getModel());
        return (mxGraphModel) graph.getModel();
    }
}
