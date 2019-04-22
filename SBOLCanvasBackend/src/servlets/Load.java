package servlets;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.http.HttpStatus;
import org.apache.tomcat.util.http.fileupload.IOUtils;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = {"/load"})
public class Load extends HttpServlet {
	
	public void doGet(HttpServletRequest request, HttpServletResponse response) {
		String filename = request.getParameter("filename");
		if(filename == null) {
			response.setStatus(HttpStatus.SC_BAD_REQUEST);
			return;
		}
		filename += ".xml";
		
		File file = new File("/opt/tomcat/"+filename);
		try {
			FileInputStream fileIn = new FileInputStream(file);
			OutputStream bodyOut = response.getOutputStream();
			IOUtils.copy(fileIn, bodyOut);
			fileIn.close();
		} catch (IOException e) {
			e.printStackTrace();
			response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
			return;
		}
		
		response.addHeader("Access-Control-Allow-Origin", "*");
		response.setStatus(HttpStatus.SC_OK);
	}
	
}
