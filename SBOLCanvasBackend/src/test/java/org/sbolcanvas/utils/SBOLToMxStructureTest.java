package org.sbolcanvas.utils;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.mxgraph.io.mxCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.util.mxXmlUtils;
import com.mxgraph.view.mxGraph;

import org.sbolstandard.core2.SBOLDocument;
import org.w3c.dom.Document;

/**
 * Characterization test for the mxGraph structure emitted by {@link SBOLToMx} (import direction).
 *
 * <p>Pins the structure produced by the "render a circuit container" recipe shared by
 * {@code createModuleView} and {@code createComponentView}: the circuitContainer cell, its
 * backbone child, and its sequenceFeature glyph children (count, order, and value-URIs). The
 * toggle fixture renders the SAME two multi-glyph containers ({@code BntReYQX}, {@code NA286hyh})
 * once inside the module view and once as standalone component views, so asserting both proves the
 * two builders agree on the shared recipe. This is the safety net for unifying that recipe; it
 * deliberately does not assert fallback x-geometry (the fixture carries layout, so the
 * {@code insertVertex(... maxX++ ...)} fallback path never fires).
 */
class SBOLToMxStructureTest {

    /** Glyph value-URIs for the BntReYQX container, in emitted child order. */
    private static final String[] BNTREYQX_GLYPHS = {
            "https://sbolcanvas.org/Pro_WzDR/1",
            "https://sbolcanvas.org/RBS_tHS5/1",
            "https://sbolcanvas.org/CDS_MYq7/1",
            "https://sbolcanvas.org/RBS_crn0/1",
            "https://sbolcanvas.org/CDS_fczU/1",
            "https://sbolcanvas.org/Ter_xkvC/1",
    };

    /** Glyph value-URIs for the NA286hyh container, in emitted child order. */
    private static final String[] NA286HYH_GLYPHS = {
            "https://sbolcanvas.org/Pro_2Vk8/1",
            "https://sbolcanvas.org/RBS_giV7/1",
            "https://sbolcanvas.org/CDS_eiQs/1",
            "https://sbolcanvas.org/Ter_r3iX/1",
    };

    @BeforeAll
    static void ensureCodecsRegistered() throws Exception {
        // Registers the org.sbolcanvas.data package + simulationData codecs (Converter static block).
        Class.forName("org.sbolcanvas.utils.Converter");
    }

    private static mxGraphModel convertAndDecode(String resource) throws Exception {
        SBOLDocument doc = SBOLTestSupport.loadSbol(resource);
        SBOLToMx converter = new SBOLToMx();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        converter.toGraph(doc, out);

        Document xmlDoc = mxXmlUtils.parseXml(out.toString());
        mxCodec codec = new mxCodec(xmlDoc);
        mxGraph graph = new mxGraph();
        ((mxGraphModel) graph.getModel()).setMaintainEdgeParent(false);
        codec.decode(xmlDoc.getDocumentElement(), graph.getModel());
        return (mxGraphModel) graph.getModel();
    }

    /** Direct children of the given cell that carry exactly the given style. */
    private static List<mxCell> childrenWithStyle(mxCell parent, String style) {
        List<mxCell> matches = new ArrayList<>();
        for (int i = 0; i < parent.getChildCount(); i++) {
            mxCell child = (mxCell) parent.getChildAt(i);
            if (style.equals(child.getStyle())) {
                matches.add(child);
            }
        }
        return matches;
    }

    /** Finds the unique circuitContainer child of {@code parent} whose value is {@code valueUri}. */
    private static mxCell containerByValue(mxCell parent, String valueUri) {
        mxCell found = null;
        for (int i = 0; i < parent.getChildCount(); i++) {
            mxCell child = (mxCell) parent.getChildAt(i);
            if (Converter.STYLE_CIRCUIT_CONTAINER.equals(child.getStyle()) && valueUri.equals(child.getValue())) {
                assertNull(found, "Expected exactly one circuitContainer for " + valueUri);
                found = child;
            }
        }
        assertNotNull(found, "No circuitContainer found for value " + valueUri + " under cell " + parent.getId());
        return found;
    }

    /**
     * Asserts the shared recipe produced the expected container shape: one backbone child plus
     * sequenceFeature glyph children whose value-URIs match {@code expectedGlyphs} in order.
     */
    private static void assertContainerShape(mxCell container, String[] expectedGlyphs) {
        List<mxCell> backbones = childrenWithStyle(container, Converter.STYLE_BACKBONE);
        assertEquals(1, backbones.size(),
                "Container " + container.getValue() + " should have exactly one backbone child");

        List<mxCell> glyphs = childrenWithStyle(container, Converter.STYLE_SEQUENCE_FEATURE);
        List<String> actualValues = new ArrayList<>();
        for (mxCell glyph : glyphs) {
            actualValues.add((String) glyph.getValue());
        }
        assertEquals(Arrays.asList(expectedGlyphs), actualValues,
                "Glyph value-URIs (count + order) for container " + container.getValue());
    }

    @Test
    @DisplayName("Module view: root moduleViewCell renders its multi-glyph containers via the shared recipe")
    void moduleViewContainerStructure() throws Exception {
        mxGraphModel model = convertAndDecode(SBOLTestSupport.TOGGLE_RESOURCE);
        mxCell cell1 = (mxCell) model.getCell("1");
        assertNotNull(cell1, "decoded graph must have cell '1'");

        List<mxCell> moduleViews = childrenWithStyle(cell1, Converter.STYLE_MODULE_VIEW);
        assertEquals(1, moduleViews.size(), "toggle fixture has exactly one top-level ModuleDefinition view");
        mxCell moduleView = moduleViews.get(0);
        assertEquals("https://sbolcanvas.org/module1", moduleView.getId(), "module view cell id is the ModuleDefinition identity");

        // The two top-level DNA-region FunctionalComponents render as circuitContainers in the module view.
        assertContainerShape(containerByValue(moduleView, "https://sbolcanvas.org/BntReYQX/1"), BNTREYQX_GLYPHS);
        assertContainerShape(containerByValue(moduleView, "https://sbolcanvas.org/NA286hyh/1"), NA286HYH_GLYPHS);
    }

    @Test
    @DisplayName("Component view: standalone componentViewCells render the SAME containers via the shared recipe")
    void componentViewContainerStructure() throws Exception {
        mxGraphModel model = convertAndDecode(SBOLTestSupport.TOGGLE_RESOURCE);
        mxCell cell1 = (mxCell) model.getCell("1");
        assertNotNull(cell1, "decoded graph must have cell '1'");

        // Each non-module ComponentDefinition gets its own componentViewCell keyed by its identity.
        mxCell bntView = (mxCell) model.getCell("https://sbolcanvas.org/BntReYQX/1");
        assertNotNull(bntView, "component view for BntReYQX must exist");
        assertEquals(Converter.STYLE_COMPONENT_VIEW, bntView.getStyle(), "BntReYQX view cell style");
        assertContainerShape(containerByValue(bntView, "https://sbolcanvas.org/BntReYQX/1"), BNTREYQX_GLYPHS);

        mxCell naView = (mxCell) model.getCell("https://sbolcanvas.org/NA286hyh/1");
        assertNotNull(naView, "component view for NA286hyh must exist");
        assertEquals(Converter.STYLE_COMPONENT_VIEW, naView.getStyle(), "NA286hyh view cell style");
        assertContainerShape(containerByValue(naView, "https://sbolcanvas.org/NA286hyh/1"), NA286HYH_GLYPHS);
    }
}
