package org.sbolcanvas.utils;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import javax.xml.stream.XMLStreamException;

import org.sbml.jsbml.SBMLDocument;
import org.sbml.jsbml.SBMLError;
import org.sbml.jsbml.SBMLErrorLog;
import org.sbml.jsbml.SBMLReader;

import static org.junit.jupiter.api.Assertions.fail;

/** SBML test helpers: classpath loading and offline spec validation. */
public final class SBMLAssertions {

    private SBMLAssertions() {
    }

    /** Asserts JSBML offline-core validation passes. */
    public static void assertSpecValid(SBMLDocument doc) {
        int errorCount = doc.checkConsistencyOffline();
        if (errorCount == 0) {
            return;
        }

        SBMLErrorLog errorLog = doc.getListOfErrors();
        List<SBMLError> errors = new ArrayList<SBMLError>();
        for (int i = 0; i < errorLog.getErrorCount(); i++) {
            SBMLError error = errorLog.getError(i);
            if (error.isError() || error.isFatal()) {
                errors.add(error);
            }
        }
        if (errors.isEmpty()) {
            return;
        }

        StringBuilder sb = new StringBuilder();
        sb.append("SBML validation failed with ").append(errors.size()).append(" error(s):\n");
        for (SBMLError error : errors) {
            sb.append("  [").append(error.getSeverity()).append("] ")
              .append(error.getMessage()).append("\n");
        }
        fail(sb.toString());
    }

    /** Parses an SBML document from the named classpath resource. */
    public static SBMLDocument loadFromClasspath(String resourceName) {
        InputStream in = SBMLAssertions.class.getClassLoader().getResourceAsStream(resourceName);
        if (in == null) {
            throw new IllegalArgumentException("Resource not found on classpath: " + resourceName);
        }
        try {
            return SBMLReader.read(in);
        } catch (XMLStreamException e) {
            throw new RuntimeException("Failed to parse SBML from resource: " + resourceName, e);
        }
    }
}
