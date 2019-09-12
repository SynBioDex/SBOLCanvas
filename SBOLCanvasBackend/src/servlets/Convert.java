package servlets;

import java.io.IOException;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.apache.http.HttpStatus;
import org.w3c.dom.Document;
import org.xml.sax.SAXException;

import utils.Converter;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = {"/convert/*"})
public class Convert extends HttpServlet {

	protected void doPost(HttpServletRequest request, HttpServletResponse response) {
		
		if(request.getPathInfo().equals("/toSBOL")) {
			try {
				response.addHeader("Access-Control-Allow-Origin", "*");
				DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
				DocumentBuilder builder = factory.newDocumentBuilder();
				Document doc = builder.parse(request.getInputStream());
				
				Converter.toSBOL(doc, response.getOutputStream());
			} catch (IOException | ParserConfigurationException | SAXException e) {
				e.printStackTrace();
				response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
				return;
			}
		}else if(request.getPathInfo().equals("/toMxGraph")) {
			
		}else {
			response.setStatus(HttpStatus.SC_METHOD_NOT_ALLOWED);
			return;
		}
		
		response.setStatus(HttpStatus.SC_OK);
	}
	
}
