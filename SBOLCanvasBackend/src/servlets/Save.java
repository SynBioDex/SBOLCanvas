package servlets;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.http.HttpStatus;
import org.apache.tomcat.util.http.fileupload.IOUtils;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = {"/save"})
public class Save extends HttpServlet {

	protected void doPost(HttpServletRequest request, HttpServletResponse response) {
		String filename = request.getParameter("filename");
		if(filename == null) {
			response.setStatus(HttpStatus.SC_BAD_REQUEST);
			return;
		}
		filename += ".xml";
		
		File file = new File(filename);
		try {
			file.createNewFile();
			FileOutputStream fileOut = new FileOutputStream(file);
			InputStream bodyIn = request.getInputStream();
			IOUtils.copy(bodyIn, fileOut);
			fileOut.close();
		} catch (IOException e) {
			e.printStackTrace();
			response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
			return;
		}
		
		response.addHeader("Access-Control-Allow-Origin", "*");
		response.setStatus(HttpStatus.SC_CREATED);
	}
	
}
