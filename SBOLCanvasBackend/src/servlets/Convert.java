package servlets;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.apache.http.HttpStatus;
import org.apache.tomcat.util.http.fileupload.IOUtils;
import org.w3c.dom.Document;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = {"/convert/*"})
public class Convert extends HttpServlet {

	protected void doPost(HttpServletRequest request, HttpServletResponse response) {
		
		if(request.getPathInfo().equals("/toSBOL")) {
			//DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
			//DocumentBuilder builder = factory.newDocumentBuilder();
			//Document doc = builder.parse(request.getInputStream());
			
			// TODO later actually call the convert method
			try {
				InputStream bodyIn = request.getInputStream();
				OutputStream bodyOut = response.getOutputStream();
				IOUtils.copy(bodyIn, bodyOut);
			} catch (IOException e) {
				e.printStackTrace();
				response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
				return;
			}
		}else if(request.getPathInfo().equals("/toMxGraph")) {
			
		}else {
			response.setStatus(HttpStatus.SC_METHOD_NOT_ALLOWED);
			return;
		}
		
		response.addHeader("Access-Control-Allow-Origin", "*");
		response.setStatus(HttpStatus.SC_OK);
	}
	
}
