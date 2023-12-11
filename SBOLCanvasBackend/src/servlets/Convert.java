package servlets;

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

import utils.MxToSBOL;
import utils.SBOLToMx;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = { "/convert/*" })
public class Convert extends HttpServlet {

	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
		try {
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
				
				MxToSBOL converter = new MxToSBOL(userTokens);
				switch(format) {
				case "SBOL2":
					converter.toSBOL(request.getInputStream(), response.getOutputStream()); break;
				case "SBOL1":
					converter.toSBOL1(request.getInputStream(), response.getOutputStream()); break;
				case "GenBank":
					converter.toGenBank(request.getInputStream(), response.getOutputStream()); break;
				case "GFF":
					converter.toGFF(request.getInputStream(), response.getOutputStream()); break;
				case "Fasta":
					converter.toFasta(request.getInputStream(), response.getOutputStream()); break;
				}
				
			} else {
				response.setStatus(HttpStatus.SC_METHOD_NOT_ALLOWED);
				return;
			}

			response.setStatus(HttpStatus.SC_OK);
		} catch (SBOLValidationException | IOException | SBOLConversionException | ParserConfigurationException
				| TransformerException | SAXException | TransformerFactoryConfigurationError | URISyntaxException | SynBioHubException e) {
			ServletOutputStream outputStream = response.getOutputStream();
			InputStream inputStream = new ByteArrayInputStream(e.getMessage().getBytes());
			IOUtils.copy(inputStream, outputStream);

			response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
			e.printStackTrace();
		}
	}

}
