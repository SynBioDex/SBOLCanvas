package org.sbolcanvas.utils;

import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.HashMap;
import java.util.Map;

import org.sbml.jsbml.ASTNode;
import org.sbml.jsbml.Delay;
import org.sbml.jsbml.Event;
import org.sbml.jsbml.EventAssignment;
import org.sbml.jsbml.Model;
import org.sbml.jsbml.SBMLDocument;
import org.sbml.jsbml.Trigger;
import org.sbml.jsbml.ext.layout.BoundingBox;
import org.sbml.jsbml.ext.layout.Curve;
import org.sbml.jsbml.ext.layout.CurveSegment;
import org.sbml.jsbml.ext.layout.GeneralGlyph;
import org.sbml.jsbml.ext.layout.GraphicalObject;
import org.sbml.jsbml.ext.layout.Layout;
import org.sbml.jsbml.ext.layout.LayoutModelPlugin;
import org.sbml.jsbml.ext.layout.LineSegment;
import org.sbml.jsbml.ext.layout.Point;
import org.sbml.jsbml.ext.layout.ReferenceGlyph;
import org.sbml.jsbml.ext.layout.SpeciesGlyph;
import org.sbml.jsbml.ext.layout.TextGlyph;

/**
 * Event layout (GeneralGlyph, ReferenceGlyph, TextGlyph) and event model output (Trigger, Delay,
 * Assignment) for the SBOL -> SBML pipeline on the 4-event toggle fixture
 * ({@link SBOLTestSupport#TOGGLE_RESOURCE}).
 */
class SBOLToSBMLPipelineEventsTest {

    private static SBMLDocument doc;
    private static Model model;
    private static Layout layout;

    @BeforeAll
    static void convertToggleWithEvents() throws Exception {
        doc = SBOLToSBMLPipeline.convertSbolToSbml(SBOLTestSupport.TOGGLE_RESOURCE);
        model = doc.getModel();
        LayoutModelPlugin plugin = (LayoutModelPlugin) model.getPlugin("layout");
        layout = (plugin != null && plugin.getLayoutCount() > 0) ? plugin.getLayout(0) : null;
    }

    @Test
    @DisplayName("Fixture shape: 4 events, layout extension enabled, exactly one layout")
    void fixtureShapeMatchesExpectations() {
        assertEquals(4, model.getEventCount(),
                "fixture should contain 4 events for the events tests to be meaningful");
        LayoutModelPlugin plugin = (LayoutModelPlugin) model.getPlugin("layout");
        assertNotNull(plugin, "layout extension should be enabled");
        assertEquals(1, plugin.getLayoutCount(), "fixture should produce exactly one layout");
        assertNotNull(layout, "layout field should be populated by @BeforeAll");
    }

    @Nested
    @DisplayName("Event GeneralGlyphs")
    class EventLayout {

        @Test
        @DisplayName("Each event has exactly one GeneralGlyph")
        void generalGlyphCountMatchesEventCount() {
            assertEquals(model.getEventCount(), layout.getAdditionalGraphicalObjectCount(),
                    "GeneralGlyph count should equal event count");
        }

        @Test
        @DisplayName("Each GeneralGlyph id follows \"Glyph__<eventId>\" and references an Event")
        void glyphIdsAndReferences() {
            Set<String> eventIds = new HashSet<>();
            for (int i = 0; i < model.getEventCount(); i++) {
                eventIds.add(model.getEvent(i).getId());
            }

            for (GraphicalObject obj : layout.getListOfAdditionalGraphicalObjects()) {
                GeneralGlyph gg = (GeneralGlyph) obj;
                String eventId = gg.getReference();
                assertTrue(eventIds.contains(eventId),
                        "GeneralGlyph reference '" + eventId + "' should be a model Event ID");
                assertEquals("Glyph__" + eventId, gg.getId(),
                        "GeneralGlyph id should be 'Glyph__' + event ID");
            }
        }

        @Test
        @DisplayName("Each event GeneralGlyph has sane bounds (positive dims, non-negative position, fits inside canvas)")
        void eventGlyphBoundsAreSane() {
            double canvasWidth = layout.getDimensions().getWidth();
            double canvasHeight = layout.getDimensions().getHeight();
            for (GraphicalObject obj : layout.getListOfAdditionalGraphicalObjects()) {
                GeneralGlyph gg = (GeneralGlyph) obj;
                BoundingBox bbox = gg.getBoundingBox();
                assertNotNull(bbox, gg.getId() + " should have a bounding box");
                double w = bbox.getDimensions().getWidth();
                double h = bbox.getDimensions().getHeight();
                double x = bbox.getPosition().getX();
                double y = bbox.getPosition().getY();
                assertTrue(w > 0 && h > 0,
                        gg.getId() + " positive-dimensions invariant failed: got " + w + "x" + h);
                assertTrue(x >= 0 && y >= 0,
                        gg.getId() + " non-negative-position invariant failed: got ("
                                + x + ", " + y + ")");
                assertTrue(x + w <= canvasWidth && y + h <= canvasHeight,
                        gg.getId() + " fits-inside-canvas invariant failed: ("
                                + x + "," + y + " " + w + "x" + h
                                + ") does not fit inside canvas " + canvasWidth + "x" + canvasHeight);
            }
        }

        @Test
        @DisplayName("Each event has one product-role ReferenceGlyph pointing to an existing SpeciesGlyph")
        void productReferenceGlyphsResolve() {
            Set<String> speciesGlyphIds = new HashSet<>();
            for (SpeciesGlyph sg : layout.getListOfSpeciesGlyphs()) {
                speciesGlyphIds.add(sg.getId());
            }

            for (GraphicalObject obj : layout.getListOfAdditionalGraphicalObjects()) {
                GeneralGlyph gg = (GeneralGlyph) obj;
                assertEquals(1, gg.getListOfReferenceGlyphs().size(),
                        gg.getId() + " should have exactly one ReferenceGlyph");
                ReferenceGlyph rg = gg.getListOfReferenceGlyphs().get(0);
                assertEquals("product", rg.getRole(),
                        gg.getId() + " ReferenceGlyph role should be 'product'");
                assertTrue(speciesGlyphIds.contains(rg.getGlyph()),
                        gg.getId() + " ReferenceGlyph '" + rg.getGlyph()
                                + "' should resolve to an existing SpeciesGlyph");
            }
        }

        @Test
        @DisplayName("ReferenceGlyph curve has one LineSegment with start and end points")
        void curveStructure() {
            for (GraphicalObject obj : layout.getListOfAdditionalGraphicalObjects()) {
                GeneralGlyph gg = (GeneralGlyph) obj;
                ReferenceGlyph rg = gg.getListOfReferenceGlyphs().get(0);
                Curve curve = rg.getCurve();
                assertNotNull(curve, gg.getId() + " ReferenceGlyph should have a curve");
                assertEquals(1, curve.getCurveSegmentCount(),
                        gg.getId() + " curve should have a single segment");
                CurveSegment segment = curve.getCurveSegment(0);
                assertTrue(segment instanceof LineSegment,
                        gg.getId() + " curve segment should be a LineSegment");

                LineSegment ls = (LineSegment) segment;
                assertNotNull(ls.getStart(), gg.getId() + " curve should have a start point");
                assertNotNull(ls.getEnd(), gg.getId() + " curve should have an end point");
            }
        }

        @Test
        @DisplayName("ReferenceGlyph curve endpoints anchor on different glyphs (event vs species)")
        void curveEndpointsAnchorOnDifferentGlyphs() {
            for (GraphicalObject obj : layout.getListOfAdditionalGraphicalObjects()) {
                GeneralGlyph gg = (GeneralGlyph) obj;
                ReferenceGlyph rg = gg.getListOfReferenceGlyphs().get(0);
                LineSegment ls = (LineSegment) rg.getCurve().getCurveSegment(0);
                Point start = ls.getStart();
                Point end = ls.getEnd();

                BoundingBox eventBox = gg.getBoundingBox();
                SpeciesGlyph targetSg = null;
                for (SpeciesGlyph sg : layout.getListOfSpeciesGlyphs()) {
                    if (sg.getId().equals(rg.getGlyph())) {
                        targetSg = sg;
                        break;
                    }
                }
                assertNotNull(targetSg, gg.getId() + " ReferenceGlyph target '"
                        + rg.getGlyph() + "' should resolve to a SpeciesGlyph");
                BoundingBox targetBox = targetSg.getBoundingBox();

                assertTrue(touchesOrInside(start, eventBox) || touchesOrInside(start, targetBox),
                        gg.getId() + " curve start (" + start.getX() + "," + start.getY()
                                + ") should anchor on event glyph or target species glyph");
                assertTrue(touchesOrInside(end, eventBox) || touchesOrInside(end, targetBox),
                        gg.getId() + " curve end (" + end.getX() + "," + end.getY()
                                + ") should anchor on event glyph or target species glyph");
                boolean startOnEvent = touchesOrInside(start, eventBox);
                boolean endOnEvent = touchesOrInside(end, eventBox);
                assertNotEquals(startOnEvent, endOnEvent,
                        gg.getId() + " curve endpoints should anchor on different glyphs"
                                + " (one on event, one on species)");
            }
        }

        @Test
        @DisplayName("Every event ReferenceGlyph carries both a BoundingBox and a Curve")
        void everyEventReferenceGlyphHasBothBoundingBoxAndCurve() {
            LayoutModelPlugin layoutPlugin = (LayoutModelPlugin) model.getPlugin("layout");
            Layout layout = layoutPlugin.getLayout(0);
            int connectionGlyphsChecked = 0;
            for (GraphicalObject obj : layout.getListOfAdditionalGraphicalObjects()) {
                if (!(obj instanceof GeneralGlyph)) {
                    continue;
                }
                GeneralGlyph gg = (GeneralGlyph) obj;
                for (ReferenceGlyph rg : gg.getListOfReferenceGlyphs()) {
                    assertTrue(rg.isSetBoundingBox(),
                            "ReferenceGlyph '" + rg.getId() + "' (under GeneralGlyph '"
                                    + gg.getId() + "') is missing BoundingBox");
                    assertTrue(rg.isSetCurve(),
                            "ReferenceGlyph '" + rg.getId() + "' (under GeneralGlyph '"
                                    + gg.getId() + "') is missing Curve");
                    connectionGlyphsChecked++;
                }
            }
            assertTrue(connectionGlyphsChecked > 0,
                    "Expected at least one event ReferenceGlyph in the events layout; found none");
        }

        /**
         * Tests whether a point lies on or inside a bounding box, with a small
         * tolerance for floating-point edge anchoring.
         */
        private boolean touchesOrInside(Point p, BoundingBox box) {
            double tol = 1.0;
            double x0 = box.getPosition().getX();
            double y0 = box.getPosition().getY();
            double x1 = x0 + box.getDimensions().getWidth();
            double y1 = y0 + box.getDimensions().getHeight();
            return p.getX() >= x0 - tol && p.getX() <= x1 + tol
                    && p.getY() >= y0 - tol && p.getY() <= y1 + tol;
        }
    }

    @Nested
    @DisplayName("TextGlyphs")
    class TextGlyphs {

        @Test
        @DisplayName("One textGlyph per species, event, and compartment")
        void oneTextGlyphPerSpeciesEventAndCompartment() {
            // Hand-counted from the toggle fixture: 9 species glyphs (3 Protein + 2 SmallMolecule
            // + 2 Complex + 2 promoter glyphs); the synthetic placeholder mRNAs carry no glyph.
            assertEquals(9, layout.getSpeciesGlyphCount(), "fixture should produce 9 species glyphs");
            assertEquals(4, layout.getAdditionalGraphicalObjectCount(), "fixture should produce 4 event glyphs");
            assertEquals(1, layout.getCompartmentGlyphCount(), "fixture should produce 1 compartment glyph");
            assertEquals(14, layout.getTextGlyphCount(),
                    "textGlyph count should cover species + events + compartments");
        }

        @Test
        @DisplayName("Each textGlyph targets an existing graphical object")
        void graphicalObjectReferencesResolve() {
            Set<String> knownIds = collectGlyphIds();
            for (TextGlyph tg : layout.getListOfTextGlyphs()) {
                assertTrue(knownIds.contains(tg.getGraphicalObject()),
                        "textGlyph '" + tg.getId() + "' points to unknown glyph '"
                                + tg.getGraphicalObject() + "'");
            }
        }

        @Test
        @DisplayName("Each textGlyph bounding box matches its graphical object")
        void boundingBoxesMatchTargets() {
            for (TextGlyph tg : layout.getListOfTextGlyphs()) {
                GraphicalObject target = findGlyph(tg.getGraphicalObject());
                assertNotNull(target, "graphical object " + tg.getGraphicalObject() + " missing");
                BoundingBox a = tg.getBoundingBox();
                BoundingBox b = target.getBoundingBox();
                assertEquals(b.getPosition().getX(), a.getPosition().getX(), 1e-9,
                        tg.getId() + " position x should match target");
                assertEquals(b.getPosition().getY(), a.getPosition().getY(), 1e-9,
                        tg.getId() + " position y should match target");
                assertEquals(b.getDimensions().getWidth(), a.getDimensions().getWidth(), 1e-9,
                        tg.getId() + " width should match target");
                assertEquals(b.getDimensions().getHeight(), a.getDimensions().getHeight(), 1e-9,
                        tg.getId() + " height should match target");
            }
        }

        private Set<String> collectGlyphIds() {
            Set<String> ids = new HashSet<>();
            for (SpeciesGlyph sg : layout.getListOfSpeciesGlyphs())
                ids.add(sg.getId());
            for (GraphicalObject obj : layout.getListOfAdditionalGraphicalObjects())
                ids.add(obj.getId());
            for (int i = 0; i < layout.getCompartmentGlyphCount(); i++) {
                ids.add(layout.getCompartmentGlyph(i).getId());
            }
            for (int i = 0; i < layout.getReactionGlyphCount(); i++) {
                ids.add(layout.getReactionGlyph(i).getId());
            }
            return ids;
        }

        private GraphicalObject findGlyph(String id) {
            for (SpeciesGlyph sg : layout.getListOfSpeciesGlyphs()) {
                if (sg.getId().equals(id))
                    return sg;
            }
            for (GraphicalObject obj : layout.getListOfAdditionalGraphicalObjects()) {
                if (obj.getId().equals(id))
                    return obj;
            }
            for (int i = 0; i < layout.getCompartmentGlyphCount(); i++) {
                if (layout.getCompartmentGlyph(i).getId().equals(id))
                    return layout.getCompartmentGlyph(i);
            }
            for (int i = 0; i < layout.getReactionGlyphCount(); i++) {
                if (layout.getReactionGlyph(i).getId().equals(id))
                    return layout.getReactionGlyph(i);
            }
            return null;
        }
    }

    @Nested
    @DisplayName("Model-side events (createEvents output)")
    class EventSBML {

        /**
         * Expectation per event id, hand-derived from the toggle fixture's 4 events.
         * The SBML event id is sanitize(eventName) where eventName is the SBOL name
         * (dcterms:title). assignmentValue defaults to 0 when the fixture omits it.
         */
        private final class Expected {
            private final double delay;
            private final double assignment;

            Expected(double delay, double assignment) {
                this.delay = delay;
                this.assignment = assignment;
            }

            double delay() {
                return delay;
            }

            double assignment() {
                return assignment;
            }
        }

        private Map<String, Expected> expectedByEventId() {
            Map<String, Expected> m = new HashMap<>();
            m.put("IPTG_High", new Expected(2000.0, 60.0));
            m.put("IPTG_Low", new Expected(4000.0, 0.0));
            m.put("aTc_Low", new Expected(8000.0, 0.0));
            m.put("aTc_High", new Expected(6000.0, 60.0));
            return m;
        }

        private Expected expectedFor(Event event) {
            Map<String, Expected> expected = expectedByEventId();
            Expected exp = expected.get(event.getId());
            assertNotNull(exp, "fixture-derived expectation missing for event id '"
                    + event.getId() + "'; known: " + expected.keySet());
            return exp;
        }

        private double readNumericLeaf(ASTNode node, String context) {
            assertNotNull(node, context + " ASTNode should be non-null");
            assertEquals(0, node.getChildCount(),
                    context + " should be a numeric literal (zero children), got " + node.getType());
            assertTrue(node.isInteger() || node.isReal(),
                    context + " should be INTEGER or REAL, got " + node.getType());
            return node.isInteger() ? (double) node.getInteger() : node.getReal();
        }

        @Test
        @DisplayName("Each event has one assignment that resolves to a known species")
        void eachEventHasOneAssignmentResolvingToKnownSpecies() {
            for (int i = 0; i < model.getEventCount(); i++) {
                Event event = model.getEvent(i);
                assertEquals(1, event.getEventAssignmentCount(),
                        event.getId() + " should have one assignment");
                EventAssignment assignment = event.getEventAssignment(0);
                assertNotNull(model.getSpecies(assignment.getVariable()),
                        event.getId() + " event assignment variable '"
                                + assignment.getVariable()
                                + "' should resolve to a known species in the model");
            }
        }

        @Test
        @DisplayName("Each event's trigger math is the CONSTANT_TRUE AST node createEvents writes")
        void triggerMathIsConstantTrue() {
            for (int i = 0; i < model.getEventCount(); i++) {
                Event event = model.getEvent(i);
                Trigger trigger = event.getTrigger();
                assertNotNull(trigger, event.getId() + " should have a trigger");
                ASTNode math = trigger.getMath();
                assertNotNull(math, event.getId() + " trigger should have math");
                assertEquals(ASTNode.Type.CONSTANT_TRUE, math.getType(),
                        event.getId() + " trigger math should be CONSTANT_TRUE, got " + math.getType());
            }
        }

        @Test
        @DisplayName("Each event's delay value matches the EventInfo.simulationData delay in the fixture")
        void delayValueComesFromSimData() {
            for (int i = 0; i < model.getEventCount(); i++) {
                Event event = model.getEvent(i);
                double expectedDelay = expectedFor(event).delay();
                Delay delay = event.getDelay();
                assertNotNull(delay, event.getId() + " should have a delay");
                double actual = readNumericLeaf(delay.getMath(),
                        event.getId() + " delay math");
                assertEquals(expectedDelay, actual, 1e-9,
                        event.getId() + " delay should equal fixture simulationData/delay");
            }
        }

        @Test
        @DisplayName("Each event pins useValuesFromTriggerTime=false and trigger initialValue/persistent=false")
        void eachEventHasDeterministicBooleanDefaults() {
            for (int i = 0; i < model.getEventCount(); i++) {
                Event event = model.getEvent(i);
                assertFalse(event.getUseValuesFromTriggerTime(),
                        event.getId() + " useValuesFromTriggerTime should be false");
                Trigger trigger = event.getTrigger();
                assertNotNull(trigger, event.getId() + " should have a trigger");
                assertFalse(trigger.getInitialValue(),
                        event.getId() + " trigger initialValue should be false");
                assertFalse(trigger.getPersistent(),
                        event.getId() + " trigger persistent should be false");
            }
        }

        @Test
        @DisplayName("Each event's assignment math matches the EventInfo.assignmentValue in the fixture")
        void assignmentMathMatchesEventInfo() {
            for (int i = 0; i < model.getEventCount(); i++) {
                Event event = model.getEvent(i);
                double expectedAssignment = expectedFor(event).assignment();
                EventAssignment assignment = event.getEventAssignment(0);
                double actual = readNumericLeaf(assignment.getMath(),
                        event.getId() + " assignment math");
                assertEquals(expectedAssignment, actual, 1e-9,
                        event.getId() + " assignment value should equal fixture"
                                + " simulationData/assignmentValue (default 0 when omitted)");
            }
        }

        @Test
        @DisplayName("Each event's SBML name is set and matches one of the fixture's event titles")
        void eventNamesAreSet() {
            for (int i = 0; i < model.getEventCount(); i++) {
                Event event = model.getEvent(i);
                assertTrue(event.isSetName(), event.getId() + " should carry its SBOL name");
                assertTrue(expectedByEventId().containsKey(event.getName()),
                        event.getId() + " name '" + event.getName()
                                + "' should be one of the fixture's event titles");
            }
        }
    }

    @Nested
    @DisplayName("SBOL identity annotations")
    class SbolIdentityAnnotations {

        @Test
        @DisplayName("Each event carries a non-RDF annotation with its SBOL URI")
        void eventsCarrySbolIdentity() throws Exception {
            for (int i = 0; i < model.getEventCount(); i++) {
                Event event = model.getEvent(i);
                assertTrue(event.isSetAnnotation(), event.getId() + " should have an annotation");
                String annotation = event.getAnnotationString();
                assertTrue(annotation.contains("SBOLCanvas:identity"),
                        event.getId() + " annotation should use the SBOLCanvas:identity element");
                assertTrue(annotation.contains("/Event_"),
                        event.getId() + " annotation should carry the SBOL event URI");
            }
        }

        @Test
        @DisplayName("Every species carries a non-RDF annotation with its SBOL URI")
        void speciesCarrySbolIdentity() throws Exception {
            assertTrue(model.getSpeciesCount() > 0, "fixture should produce species");
            for (int i = 0; i < model.getSpeciesCount(); i++) {
                org.sbml.jsbml.Species species = model.getSpecies(i);
                assertTrue(species.isSetAnnotation(), species.getId() + " should have an annotation");
                String annotation = species.getAnnotationString();
                assertTrue(annotation.contains("SBOLCanvas:identity"),
                        species.getId() + " annotation should use the SBOLCanvas:identity element");
                assertTrue(annotation.contains("SBOLCanvas:uri=\"https://sbolcanvas.org/"),
                        species.getId() + " annotation URI attribute should sit under the SBOLCanvas URI prefix");
            }
        }
    }

}
