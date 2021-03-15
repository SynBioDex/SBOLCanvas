package servlets;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpStatus;

import com.google.gson.Gson;

import utils.SBOLData;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = { "/data/*" })
public class Data extends HttpServlet {

	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
		try {
			// setup the json
			Gson gson = new Gson();
			String body = null;
			if (request.getPathInfo().equals("/types")) {
				body = gson.toJson(SBOLData.getTypes());
			} else if (request.getPathInfo().equals("/roles")) {
				body = gson.toJson(SBOLData.getRoles());
			} else if (request.getPathInfo().equals("/refine")) {
				String parent = request.getParameter("parent");
				if (parent == null) {
					response.setStatus(HttpStatus.SC_BAD_REQUEST);
					return;
				}
				body = gson.toJson(SBOLData.getRefinement(parent));
			} else if (request.getPathInfo().equals("/interactions")) {
				body = gson.toJson(SBOLData.getInteractions());
			}else if (request.getPathInfo().equals("/interactionRoles")) {
				body = gson.toJson(SBOLData.getInteractionRoles());
			}else if (request.getPathInfo().equals("/interactionRoleRefine")) {
				String parent = request.getParameter("parent");
				if(parent == null) {
					response.setStatus(HttpStatus.SC_BAD_REQUEST);
					return;
				}
				body = gson.toJson(SBOLData.getInteractionRoleRefinement(parent));
			}

			// write it to the response body
			ServletOutputStream outputStream = response.getOutputStream();
			InputStream inputStream = new ByteArrayInputStream(body.getBytes());
			IOUtils.copy(inputStream, outputStream);

			// the request was good
			response.setStatus(HttpStatus.SC_OK);
			response.setContentType("application/json");
			return;
		} catch (IOException e) {
			ServletOutputStream outputStream = response.getOutputStream();
			InputStream inputStream = new ByteArrayInputStream(e.getMessage().getBytes());
			IOUtils.copy(inputStream, outputStream);

			response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
		}
	}

}
