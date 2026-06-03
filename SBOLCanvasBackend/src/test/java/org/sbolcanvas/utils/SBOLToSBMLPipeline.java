package org.sbolcanvas.utils;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

import org.sbml.jsbml.SBMLDocument;
import org.sbml.jsbml.SBMLReader;

import static org.junit.jupiter.api.Assertions.*;

/** Runs the SBOL -> SBOLToMx -> MxToSBML pipeline against a classpath resource. */
public class SBOLToSBMLPipeline {

    /** Returns the parsed SBML produced by piping {@code sbolResource} through the full converter chain. */
    public static SBMLDocument convertSbolToSbml(String sbolResource) throws Exception {
        InputStream sbolStream = SBOLToSBMLPipeline.class.getClassLoader()
                .getResourceAsStream(sbolResource);
        assertNotNull(sbolStream, "Could not load classpath resource: " + sbolResource);

        SBOLToMx sbolToMx = new SBOLToMx();
        ByteArrayOutputStream graphOut = new ByteArrayOutputStream();
        sbolToMx.toGraph(sbolStream, graphOut);

        MxToSBML mxToSbml = new MxToSBML();
        ByteArrayInputStream graphIn = new ByteArrayInputStream(graphOut.toByteArray());
        ByteArrayOutputStream sbmlOut = new ByteArrayOutputStream();
        mxToSbml.toSBML(graphIn, sbmlOut);

        return SBMLReader.read(new ByteArrayInputStream(sbmlOut.toByteArray()));
    }
}
