package servlets;

import java.io.IOException;
import java.io.OutputStream;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.http.HttpStatus;

import utils.Converter;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = {"/test"})
public class MethodTester extends HttpServlet {

	public void doGet(HttpServletRequest request, HttpServletResponse response) {
		try {
			OutputStream bodyOut = response.getOutputStream();
			Converter.toSBOL("", bodyOut);
		} catch (IOException e) {
			e.printStackTrace();
			response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
			return;
		}
		
		response.addHeader("Access-Control-Allow-Origin", "*");
		response.setStatus(HttpStatus.SC_OK);
	}
	
}
