package servlets;

import java.io.IOException;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.http.HttpStatus;

import utils.Converter;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = {"/convert/*"})
public class Convert extends HttpServlet {

	protected void doPost(HttpServletRequest request, HttpServletResponse response) {
		
		if(request.getPathInfo().equals("/toSBOL")) {
			try {
				String name = request.getParameter("name");
				if(name == null) {
					response.setStatus(HttpStatus.SC_BAD_REQUEST);
					return;
				}
				response.addHeader("Access-Control-Allow-Origin", "*");
				Converter converter = new Converter();
				converter.toSBOL(request.getInputStream(), response.getOutputStream(), name);
			} catch (IOException e) {
				e.printStackTrace();
				response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
				return;
			}
		}else if(request.getPathInfo().equals("/toMxGraph")) {
			try {
				
				response.addHeader("Access-Control-Allow-Origin", "*");
				Converter converter = new Converter();
				converter.toGraph(request.getInputStream(), response.getOutputStream());
			} catch (IOException e) {
				e.printStackTrace();
				response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
				return;
			}
		}else {
			response.setStatus(HttpStatus.SC_METHOD_NOT_ALLOWED);
			return;
		}
		
		response.setStatus(HttpStatus.SC_OK);
	}
	
}
