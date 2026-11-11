package org.sbolcanvas.utils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.Identified;
import org.sbolstandard.core2.GenericTopLevel;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLReader;
import org.sbolstandard.core2.SBOLWriter;

/** Shared SBOL test helpers: classpath load, SBOLToMx pipeline, raw annotation walks. */
final class SBOLTestSupport {

    static final String TOGGLE_RESOURCE = "sbolcanvas_sbol-toggle.xml";


    private SBOLTestSupport() {}

    /** Loads an SBOLDocument from a classpath resource. */
    static SBOLDocument loadSbol(String resource) throws Exception {
        InputStream stream = SBOLTestSupport.class.getClassLoader()
                .getResourceAsStream(resource);
        assertNotNull(stream, "Could not load classpath resource: " + resource);
        return SBOLReader.read(stream);
    }

    /** Runs SBOL -> mxGraph and returns the populated converter. */
    static SBOLToMx convertToGraph(SBOLDocument doc) throws Exception {
        SBOLToMx converter = new SBOLToMx();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        converter.toGraph(doc, out);
        return converter;
    }

    /** Serialize-then-reread via libSBOLj (no Converter on the read side). */
    static SBOLDocument serializeAndReread(SBOLDocument doc) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        SBOLWriter.setKeepGoing(true);
        SBOLWriter.write(doc, out);
        return SBOLReader.read(new ByteArrayInputStream(out.toByteArray()));
    }

    /** Finds a ComponentDefinition by displayId, or null. */
    static ComponentDefinition findCD(SBOLDocument doc, String displayId) {
        for (ComponentDefinition c : doc.getComponentDefinitions()) {
            if (c.getDisplayId().equals(displayId)) {
                return c;
            }
        }
        return null;
    }

    /**
     * Collects key→value from Model entries that name {@code subject}: a design object resolved
     * from its record's owner and path, or an Event child ({@link #eventIdentity}).
     */
    static Map<String, Object> modelEntries(SBOLDocument doc, URI subject) {
        Map<String, Object> values = new HashMap<>();
        for (GenericTopLevel model : ModelHelper.findModels(doc)) {
            URI owner = ModelHelper.owner(model);
            for (ModelHelper.Entry entry : ModelHelper.readEntries(model)) {
                Identified named = ModelHelper.resolve(doc, owner, entry.getPath());
                if (named != null && subject.equals(named.getIdentity())) {
                    values.put(entry.getKey(), entry.getValue());
                }
            }
            for (Annotation event : ModelHelper.events(model)) {
                if (!subject.equals(eventIdentity(model, event))) {
                    continue;
                }
                for (ModelHelper.Entry entry : ModelHelper.readEntries(event)) {
                    values.put(entry.getKey(), entry.getValue());
                }
            }
        }
        return values;
    }

    /** A test-side name for an Event child: its record's persistent identity plus its displayId. */
    static URI eventIdentity(GenericTopLevel model, Annotation event) {
        return URI.create(model.getPersistentIdentity() + "/" + ModelHelper.eventDisplayId(event));
    }

    static void writeAnnotatedSimulationData(org.sbolstandard.core2.Identified parent,
            java.util.Map<String, Object> values, String identityPrefix) throws Exception {
        java.util.List<Annotation> annotations = new java.util.ArrayList<>();
        for (String key : new java.util.TreeSet<>(values.keySet())) {
            Object value = values.get(key);
            javax.xml.namespace.QName name = Converter.createQName(Identifiers.toNCName(key));
            if (value instanceof Boolean)
                annotations.add(new Annotation(name, (Boolean) value));
            else if (value instanceof Number)
                annotations.add(new Annotation(name, ((Number) value).doubleValue()));
            else if (value instanceof URI)
                annotations.add(new Annotation(name, (URI) value));
            else
                annotations.add(new Annotation(name, value.toString()));
        }
        parent.createAnnotation(Converter.createQName("simulationData"), Converter.createQName("SimulationData"),
                identityPrefix + "_SimulationData", annotations);
    }

    /** Returns the {@code simulationData} annotation, or null. */
    static Annotation findSimulationDataAnnotation(Iterable<Annotation> annotations) {
        for (Annotation ann : annotations) {
            if (ann.getQName().equals(Converter.createQName("simulationData"))) {
                return ann;
            }
        }
        return null;
    }

    /** XML NCName shape, for asserting sanitized annotation keys. */
    static final java.util.regex.Pattern NCNAME = java.util.regex.Pattern.compile("^[A-Za-z_][A-Za-z0-9_.\\-]*$");
}
