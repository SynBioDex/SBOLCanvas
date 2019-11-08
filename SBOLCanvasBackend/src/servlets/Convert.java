package servlets;

import java.io.IOException;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;

import org.apache.http.HttpStatus;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLValidationException;
import org.xml.sax.SAXException;

import utils.Converter;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = { "/convert/*" })
public class Convert extends HttpServlet {

	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

		if (request.getPathInfo().equals("/toSBOL")) {
			String name = request.getParameter("name");
			if (name == null) {
				response.setStatus(HttpStatus.SC_BAD_REQUEST);
				return;
			}
			Converter converter = new Converter();
			try {
				converter.toSBOL(request.getInputStream(), response.getOutputStream(), name);
			} catch (SAXException | ParserConfigurationException | SBOLValidationException
					| SBOLConversionException e) {
				throw new ServletException(e);
			}
		} else if (request.getPathInfo().equals("/toMxGraph")) {
			Converter converter = new Converter();
			try {
				converter.toGraph(request.getInputStream(), response.getOutputStream());
			} catch (SBOLValidationException | SBOLConversionException | ParserConfigurationException
					| TransformerException e) {
				throw new ServletException(e);
			}
		} else {
			response.setStatus(HttpStatus.SC_METHOD_NOT_ALLOWED);
			return;
		}

		response.setStatus(HttpStatus.SC_OK);
	}

}
