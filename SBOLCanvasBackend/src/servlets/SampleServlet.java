package servlets;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpStatus;

import com.google.gson.Gson;

import json.Success;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = {"/api/sample"})
public class SampleServlet extends HttpServlet{

	// can be accessed via "http://localhost:8080/SBOLCanvasBackend/api/sample" assuming you setup your local apache server correctly
	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		// the request was good
		response.setStatus(HttpStatus.SC_OK);
		
		// we return a json body
		response.setContentType("application/json");
		
		// setup the json
		Success s = new Success(true);
		Gson gson = new Gson();
		String body = gson.toJson(s);
		
		// write it to the response body
		ServletOutputStream outputStream = response.getOutputStream();
		InputStream inputStream = new ByteArrayInputStream(body.getBytes());
		IOUtils.copy(inputStream, outputStream);
		return;
	}
	
}
