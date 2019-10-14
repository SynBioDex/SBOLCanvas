package servlets;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpStatus;
import org.synbiohub.frontend.SynBioHubException;
import org.synbiohub.frontend.SynBioHubFrontend;
import org.synbiohub.frontend.WebOfRegistriesData;

import com.google.gson.Gson;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = {"/SynBioHub/*"})
public class SynBioHub extends HttpServlet {
	
	protected void doGet(HttpServletRequest request, HttpServletResponse response) {
		Gson gson = new Gson();
		if(request.getPathInfo().equals("/registries")) {
			String body = null;
			List<WebOfRegistriesData> registries = null;
			try {
				registries = SynBioHubFrontend.getRegistries();
			} catch (SynBioHubException e) {
				e.printStackTrace();
			}
			body = gson.toJson(registries);
			
			try {
				ServletOutputStream outputStream = response.getOutputStream();
				InputStream inputStream = new ByteArrayInputStream(body.getBytes());
				IOUtils.copy(inputStream, outputStream);
				
				// the request was good
				response.setStatus(HttpStatus.SC_OK);
				response.addHeader("Access-Control-Allow-Origin", "*");
				response.setContentType("application/json");
				return;
			} catch (IOException e) {
				e.printStackTrace();
			}
		}
		
		String email = request.getParameter("email");
		String password = request.getParameter("password");
		String server = request.getParameter("server");
		if(email == null || password == null || server == null || email.equals("") || password.equals("") || server.equals("")) {
			response.setStatus(HttpStatus.SC_BAD_REQUEST);
			return;
		}
		if(request.getPathInfo().equals("/listCollections")){
			SynBioHubFrontend sbhf = new SynBioHubFrontend(server);
		}
	}
	
}
