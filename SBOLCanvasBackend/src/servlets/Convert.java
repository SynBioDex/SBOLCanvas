package servlets;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpStatus;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLValidationException;
import org.xml.sax.SAXException;

import utils.Converter;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = { "/convert/*" })
public class Convert extends HttpServlet {

	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
		try {
			if (request.getPathInfo().equals("/toSBOL")) {
				String name = request.getParameter("name");
				if (name == null) {
					response.setStatus(HttpStatus.SC_BAD_REQUEST);
					return;
				}
				Converter converter = new Converter();
				converter.toSBOL(request.getInputStream(), response.getOutputStream(), name);
			} else if (request.getPathInfo().equals("/toMxGraph")) {
				Converter converter = new Converter();
				converter.toGraph(request.getInputStream(), response.getOutputStream());
			} else {
				response.setStatus(HttpStatus.SC_METHOD_NOT_ALLOWED);
				return;
			}

			response.setStatus(HttpStatus.SC_OK);
		} catch (SBOLValidationException | IOException | SBOLConversionException | ParserConfigurationException
				| TransformerException | SAXException e) {
			ServletOutputStream outputStream = response.getOutputStream();
			InputStream inputStream = new ByteArrayInputStream(e.getMessage().getBytes());
			IOUtils.copy(inputStream, outputStream);

			response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
		}
	}

}
