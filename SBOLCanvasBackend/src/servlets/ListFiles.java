package servlets;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FilenameFilter;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Paths;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpStatus;

import com.google.gson.Gson;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = {"/list"})
public class ListFiles extends HttpServlet {

	protected void doGet(HttpServletRequest request, HttpServletResponse response) {
		File dir = Paths.get("/opt/tomcat/").toFile();
		File[] files = dir.listFiles(new FilenameFilter() {

			@Override
			public boolean accept(File dir, String name) {
				return name.endsWith(".xml");
			}
			
		});
		
		String[] filenames = new String[files.length];
		for(int i = 0; i < files.length; i++) {
			filenames[i] = files[i].getName().substring(0, files[i].getName().indexOf("."));
		}
		
		Gson gson = new Gson();
		try {
			ByteArrayInputStream jsonIn = new ByteArrayInputStream(gson.toJson(filenames).getBytes());
			OutputStream bodyOut = response.getOutputStream();
			IOUtils.copy(jsonIn, bodyOut);
		} catch (IOException e) {
			e.printStackTrace();
		}
		
		response.addHeader("Access-Control-Allow-Origin", "*");
		response.setStatus(HttpStatus.SC_OK);
		response.addHeader("content-type", "application/json");
	}
	
}
