package servlets;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URISyntaxException;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;

import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactoryConfigurationError;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpStatus;
import org.sbolstandard.core2.CombinatorialDerivation;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLReader;
import org.sbolstandard.core2.SBOLValidationException;
import org.sbolstandard.core2.SBOLWriter;
import org.synbiohub.frontend.SynBioHubException;

import utils.MxToSBOL;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = { "/enumerate" })
public class Enumerate extends HttpServlet {

	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
		try {
			// setup the userTokens
			String authString = request.getHeader("Authorization");
			HashMap<String, String> userTokens = new HashMap<String, String>();
			if(authString != null) {
				String[] servers = authString.split(",");
				for(String server : servers) {
					String[] tokens = server.split(" ");
					userTokens.put(tokens[0], tokens[1]);
				}
			}
			
			// argument checks
			String format = request.getParameter("format");
			String sbolSourceString = request.getParameter("SBOLSource");
			boolean sbolSource = true;
			if (sbolSourceString != null) {
				sbolSource = sbolSourceString.equals("false");
			}
			if (format == null) {
				format = "SBOL2";
			} else if (!format.equals("SBOL2") && !format.equals("CSV")) {
				response.setStatus(HttpStatus.SC_BAD_REQUEST);
				return;
			}

			// create the document
			SBOLDocument doc = null;
			if (!sbolSource) {
				MxToSBOL converter = new MxToSBOL(userTokens);
				doc = converter.setupDocument(request.getInputStream());
			} else {
				doc = SBOLReader.read(request.getInputStream());
			}

			// find the top combinatorial and enumerate
			doc = enumerateDocument(doc);

			// return the resulting document
			if (format.equals("SBOL2")) {
				SBOLWriter.write(doc, response.getOutputStream());
			} else {
				SBOLWriter.write(doc, response.getOutputStream(), SBOLDocument.CSV);
			}

			response.setStatus(HttpStatus.SC_OK);

		} catch (SynBioHubException | URISyntaxException | SBOLValidationException
				| TransformerFactoryConfigurationError | TransformerException | SBOLConversionException e) {
			ServletOutputStream outputStream = response.getOutputStream();
			InputStream inputStream = new ByteArrayInputStream(e.getMessage().getBytes());
			IOUtils.copy(inputStream, outputStream);

			response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
			e.printStackTrace();
		}
	}

	private static SBOLDocument enumerateDocument(SBOLDocument doc) throws SBOLValidationException {
		SBOLDocument newDoc = new SBOLDocument();
		Set<ComponentDefinition> enumerations = new HashSet<ComponentDefinition>();
		for (CombinatorialDerivation derivation : doc.getRootCombinatorialDerivations()) {
			enumerations.addAll(derivation.enumerate());
		}
		for (ComponentDefinition compDef : enumerations) {
			doc.createRecursiveCopy(newDoc, compDef);
		}
		return newDoc;
	}

}
