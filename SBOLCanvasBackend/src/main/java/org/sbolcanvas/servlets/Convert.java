package org.sbolcanvas.servlets;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URISyntaxException;
import java.util.HashMap;

import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactoryConfigurationError;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpStatus;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLValidationException;
import org.synbiohub.frontend.SynBioHubException;
import org.xml.sax.SAXException;

import org.sbolcanvas.utils.MxToSBML;
import org.sbolcanvas.utils.MxToSBOL;
import org.sbolcanvas.utils.SBOLToMx;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = { "/convert/*" })
public class Convert extends HttpServlet {

	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
		try {
			if (request.getPathInfo() == null) {
				response.setStatus(HttpStatus.SC_BAD_REQUEST);
				return;
			}

			if (request.getPathInfo().equals("/toMxGraph")) {
				SBOLToMx converter = new SBOLToMx();
				converter.toGraph(request.getInputStream(), response.getOutputStream());
			} else if (request.getPathInfo().equals("/exportDesign")){
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
				
				String format = request.getParameter("format");
				if(format == null) {
					response.setStatus(HttpStatus.SC_BAD_REQUEST);
					return;
				}
				
				MxToSBOL sbolConverter = new MxToSBOL(userTokens);
				MxToSBML sbmlConverter = new MxToSBML(userTokens);
				switch(format) {
				case "SBOL2":
					sbolConverter.toSBOL(request.getInputStream(), response.getOutputStream()); break;
				case "SBOL1":
					sbolConverter.toSBOL1(request.getInputStream(), response.getOutputStream()); break;
				case "GenBank":
					sbolConverter.toGenBank(request.getInputStream(), response.getOutputStream()); break;
				case "GFF":
					sbolConverter.toGFF(request.getInputStream(), response.getOutputStream()); break;
				case "Fasta":
					sbolConverter.toFasta(request.getInputStream(), response.getOutputStream()); break;
				case "SBML":
					sbmlConverter.toSBML(request.getInputStream(), response.getOutputStream()); break;
				}
				
			} else {
				response.setStatus(HttpStatus.SC_METHOD_NOT_ALLOWED);
				return;
			}

			response.setStatus(HttpStatus.SC_OK);
		} catch (SBOLValidationException | IOException | SBOLConversionException | ParserConfigurationException
				| TransformerException | SAXException | TransformerFactoryConfigurationError | URISyntaxException | SynBioHubException | javax.xml.stream.XMLStreamException e) {
			ServletOutputStream outputStream = response.getOutputStream();
			String message = e.getMessage() != null ? e.getMessage() : "Export failed";
			InputStream inputStream = new ByteArrayInputStream(message.getBytes());
			IOUtils.copy(inputStream, outputStream);

			response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
			e.printStackTrace();
		} catch (RuntimeException e) {
			// Catch unchecked exceptions from SBML export
			String message = e.getMessage() != null ? e.getMessage() : "Export failed";
			ServletOutputStream outputStream = response.getOutputStream();
			InputStream inputStream = new ByteArrayInputStream(message.getBytes());
			IOUtils.copy(inputStream, outputStream);

			response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
			e.printStackTrace();
		}
	}

}
