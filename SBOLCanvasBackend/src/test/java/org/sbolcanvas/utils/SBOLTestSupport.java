package org.sbolcanvas.utils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLReader;
import org.sbolstandard.core2.SBOLWriter;

/** Shared SBOL test helpers: classpath load, SBOLToMx pipeline, raw annotation walks. */
final class SBOLTestSupport {

    static final String TOGGLE_RESOURCE = "sbolcanvas_sbol-toggle.xml";

    /** XML NCName (no colons): letter/underscore start, then word chars / period / hyphen. */
    static final Pattern NCNAME = Pattern.compile("^[A-Za-z_][\\w.\\-]*$");

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

    /** Returns the {@code simulationData} annotation, or null. */
    static Annotation findSimulationDataAnnotation(Iterable<Annotation> annotations) {
        for (Annotation ann : annotations) {
            if (ann.getQName().getLocalPart().equals("simulationData")) {
                return ann;
            }
        }
        return null;
    }
}
