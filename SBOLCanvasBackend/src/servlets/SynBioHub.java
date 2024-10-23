package servlets;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.TreeSet;

import javax.servlet.ServletOutputStream;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactoryConfigurationError;

import org.apache.commons.io.IOUtils;
import org.apache.http.HttpStatus;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLReader;
import org.sbolstandard.core2.SBOLValidationException;
import org.sbolstandard.core2.SBOLWriter;
import org.synbiohub.frontend.IdentifiedMetadata;
import org.synbiohub.frontend.SearchCriteria;
import org.synbiohub.frontend.SearchQuery;
import org.synbiohub.frontend.SynBioHubException;
import org.synbiohub.frontend.SynBioHubFrontend;
import org.synbiohub.frontend.WebOfRegistriesData;
import org.xml.sax.SAXException;

import com.google.gson.Gson;

import utils.MxToSBOL;
import utils.SBOLData;
import utils.SBOLToMx;

@SuppressWarnings("serial")
@WebServlet(urlPatterns = { "/SynBioHub/*" })
public class SynBioHub extends HttpServlet {

	protected void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
		try {

			// parse auth header
			String authorization = request.getHeader("Authorization");
			String email = null;
			String password = null;
			String user = null;
			if (authorization != null && authorization.split(":").length > 1) {
				String[] tokens = authorization.split(":");
				email = tokens[0];
				password = tokens[1];
			} else {
				user = authorization;
			}

			// setup SBH server
			String server = request.getParameter("server");
			SynBioHubFrontend sbhf = null; 
            if(server != null) {
                sbhf = new SynBioHubFrontend(server);
                if(user != null)
                    sbhf.setUser(user);
            }            

			// handle routes
			// NOTE: using nested scopes in each case to prevent naming collisions
            switch(request.getPathInfo()) {
				
                case "/registries": {
					LinkedList<String> registryURLs = new LinkedList<String>();
                    for (WebOfRegistriesData registry : SynBioHubFrontend.getRegistries()) {
						registryURLs.add(registry.getInstanceUrl());
					}
					writeJSONBody(response, registryURLs);
					cacheResponse(response);
				}
					break;
				
				case "/login": {
					if (sbhf == null || email == null || password == null || email.isEmpty() || password.isEmpty()
						|| server.isEmpty()) {
						response.setStatus(HttpStatus.SC_BAD_REQUEST);
						return;
					}

					try {
						sbhf.login(email, password);
					} catch (SynBioHubException e) {
						if (e.getMessage().equals("org.synbiohub.frontend.PermissionException")) {
							response.setStatus(HttpStatus.SC_UNAUTHORIZED);
							return;
						}
						throw e;
					}
					writeJSONBody(response, sbhf.getUser());
				}
					break;
				
				case "/logout": {
					if(sbhf == null || user == null) {
						response.setStatus(HttpStatus.SC_BAD_REQUEST);
						return;
					}

					sbhf.logout();
				}
					break;

				case "/listMyCollections": {
					if (sbhf == null || user == null) {
						response.setStatus(HttpStatus.SC_BAD_REQUEST);
						return;
					}

					List<IdentifiedMetadata> collections = sbhf.getRootCollectionMetadata();
					collections.removeIf(collection -> (collection.getUri().contains("/public/")));
					writeJSONBody(response, collections);
				}
					break;

				case "/listRegistryParts": {
					String collection = request.getParameter("collection");
					String type = request.getParameter("type");
					String role = request.getParameter("role");
					String mode = request.getParameter("mode");

					if (sbhf == null || mode == null) {
						response.setStatus(HttpStatus.SC_BAD_REQUEST);
						return;
					}

					TreeSet<URI> roles = null;
					TreeSet<URI> types = null;
					TreeSet<URI> collections = null;
					if (role != null && role.length() > 0) {
						roles = new TreeSet<URI>();
						if (SBOLData.roles.ContainsKey(role))
							roles.add(SBOLData.roles.getValue(role));
						else
							roles.add(SBOLData.refinements.getValue(role));
					}
					if (type != null && type.length() > 0) {
						types = new TreeSet<URI>();
						types.add(SBOLData.types.getValue(type));
					}
					if (collection != null) {
						collections = new TreeSet<URI>();
						collections.add(URI.create(collection));
					}

					ArrayList<IdentifiedMetadata> results = new ArrayList<IdentifiedMetadata>();
					if (mode.equals("collections")) {
						if (collections == null) {
							results.addAll(sbhf.getRootCollectionMetadata());
						} else {
							for (URI collectionURI : collections) {
								results.addAll(sbhf.getSubCollectionMetadata(collectionURI));
							}
						}
					} else if (mode.equals("components") && collections != null) {
						results.addAll(
								sbhf.getMatchingComponentDefinitionMetadata(null, roles, types, collections, null, null));
					} else if (mode.equals("modules") && collections != null) {
						// SynbioHubFrontend doesn't have anything easy for modules
						SearchQuery query = new SearchQuery();

						SearchCriteria objectCriteria = new SearchCriteria();
						objectCriteria.setKey("objectType");
						objectCriteria.setValue("ModuleDefinition");
						query.addCriteria(objectCriteria);

						if (collections != null) {
							for (URI uri : collections) {
								SearchCriteria collectionCriteria = new SearchCriteria();
								collectionCriteria.setKey("collection");
								collectionCriteria.setValue(uri.toString());
								query.getCriteria().add(collectionCriteria);
							}
						}

						results.addAll(sbhf.search(query));
					}

					writeJSONBody(response, results.toArray(new IdentifiedMetadata[0]));
				}
					break;

				case "/listLayouts":
					// TO DO: implement
					break;
				
				case "/listCombinatorials": {
					if(sbhf == null) {
						response.setStatus(HttpStatus.SC_BAD_REQUEST);
						return;
					}
				
					String template = request.getParameter("template");
					
					ArrayList<IdentifiedMetadata> results = new ArrayList<IdentifiedMetadata>();
					
					SearchQuery query = new SearchQuery();
					
					SearchCriteria objectTypeCriteria = new SearchCriteria();
					objectTypeCriteria.setKey("objectType");
					objectTypeCriteria.setValue("CombinatorialDerivation");
					query.addCriteria(objectTypeCriteria);
					
					SearchCriteria sbolTagCriteria = new SearchCriteria();
					sbolTagCriteria.setKey("template");
					sbolTagCriteria.setValue(template);
					query.addCriteria(sbolTagCriteria);
					
					results.addAll(sbhf.search(query));
					
					writeJSONBody(response, results.toArray(new IdentifiedMetadata[0]));
				}
					break;

				case "/getRegistryPart": {
					String uri = request.getParameter("uri");
					if (uri == null || sbhf == null) {
						response.setStatus(HttpStatus.SC_BAD_REQUEST);
						return;
					}
					
					String combinatorial = request.getParameter("combinatorial");
					SBOLToMx converter = new SBOLToMx();
					String layoutURI = uri.substring(0,uri.lastIndexOf("/"))+"_Layout"+uri.substring(uri.lastIndexOf("/"), uri.length());
					SBOLDocument document;
					try {
						document = sbhf.getSBOL(URI.create(layoutURI), true);
					}catch(SynBioHubException e) {
						document = sbhf.getSBOL(URI.create(uri), true);
					}
					if(document == null) {
						document = sbhf.getSBOL(URI.create(uri), true);
					}
					
					SBOLDocument combDocument = null;
					if(combinatorial != null) {
						combDocument = sbhf.getSBOL(URI.create(combinatorial), true);
					}
					
					converter.toGraph(document, combDocument, response.getOutputStream());
				}
					break;

				case "/importRegistryPart": {
					String uri = request.getParameter("uri");
					if(uri == null || sbhf == null) {
						response.setStatus(HttpStatus.SC_BAD_REQUEST);
						return;
					}
					
					SBOLToMx converter = new SBOLToMx();
					
					String layoutURI = uri.substring(0,uri.lastIndexOf("/"))+"_Layout"+uri.substring(uri.lastIndexOf("/"), uri.length());
					SBOLDocument document;
					try {
						document = sbhf.getSBOL(URI.create(layoutURI), true);
						if(document == null) {
							document = sbhf.getSBOL(URI.create(uri), true);
						}
					}catch(SynBioHubException e) {
						document = sbhf.getSBOL(URI.create(uri), true);
					}
					
					converter.toGraph(document, response.getOutputStream());
				}
					break;

				default:
					response.setStatus(HttpStatus.SC_BAD_REQUEST);
					return;
            }
			
			// if it made it out, status is OK
			response.setStatus(HttpStatus.SC_OK);
			
		} catch (SynBioHubException | IOException | ParserConfigurationException | TransformerException | SBOLValidationException | SAXException | URISyntaxException e) {
			ServletOutputStream outputStream = response.getOutputStream();
			InputStream inputStream = new ByteArrayInputStream(e.getMessage().getBytes());
			IOUtils.copy(inputStream, outputStream);
			if(e.getMessage().equals("org.synbiohub.frontend.PermissionException")){
				response.setStatus(HttpStatus.SC_UNAUTHORIZED);
			}
			else{
				response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
			}

			e.printStackTrace();
		}
	}

	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
		try {
			String server = request.getParameter("server");
			String user = request.getHeader("Authorization");
			String uri = request.getParameter("uri");

			if (request.getPathInfo().equals("/addToCollection")) {

				if (server == null || user == null || uri == null) {
					response.setStatus(HttpStatus.SC_BAD_REQUEST);
					return;
				}
				HashMap<String, String> userTokens = new HashMap<String, String>();
				String[] servers = user.split(",");
				for(String serverInf : servers) {
					String[] tokens = serverInf.split(" ");
					userTokens.put(tokens[0], tokens[1]);
				}
				
				SynBioHubFrontend sbhf = new SynBioHubFrontend(server);
				sbhf.setUser(userTokens.get(server));
				MxToSBOL converter = new MxToSBOL(userTokens);
				ByteArrayOutputStream out = new ByteArrayOutputStream();
				converter.toSBOL(request.getInputStream(), out);
				sbhf.addToCollection(URI.create(uri), true, new ByteArrayInputStream(out.toByteArray()));
				response.setStatus(HttpStatus.SC_CREATED);
			} else if(request.getPathInfo().contentEquals("/importToCollection")) {
				if(server == null || user == null || uri == null) {
					response.setStatus(HttpStatus.SC_BAD_REQUEST);
					return;
				}
				SynBioHubFrontend sbhf = new SynBioHubFrontend(server);
				sbhf.setUser(user);
				SBOLDocument document = SBOLReader.read(request.getInputStream());
				ByteArrayOutputStream out = new ByteArrayOutputStream();
				SBOLWriter.setKeepGoing(true);
				SBOLWriter.write(document, out);
				sbhf.addToCollection(URI.create(uri), true, new ByteArrayInputStream(out.toByteArray()));
				response.setStatus(HttpStatus.SC_CREATED);
			} else if(request.getPathInfo().contentEquals("/createCollection")) {
				String id = request.getParameter("id");
				String version = request.getParameter("version");
				String name = request.getParameter("name");
				String description = request.getParameter("description");
				String citations = request.getParameter("citations");
				String overwrite = request.getParameter("overwrite");
				
				if(server == null || user == null || id == null || version == null || name == null || description == null || overwrite == null) {
					response.setStatus(HttpStatus.SC_BAD_REQUEST);
					return;
				}
				SynBioHubFrontend sbhf = new SynBioHubFrontend(server);
				sbhf.setUser(user);
				sbhf.createCollection(id, version, name, description, citations, overwrite.equals("true"));
				response.setStatus(HttpStatus.SC_CREATED);
			}

		} catch (SynBioHubException | IOException | SBOLValidationException | SBOLConversionException | TransformerFactoryConfigurationError | TransformerException | URISyntaxException e) {
			ServletOutputStream outputStream = response.getOutputStream();
			InputStream inputStream = new ByteArrayInputStream(e.getMessage().getBytes());
			IOUtils.copy(inputStream, outputStream);

			response.setStatus(HttpStatus.SC_INTERNAL_SERVER_ERROR);
		}

	}

	private void writeJSONBody(HttpServletResponse response, Object data) throws IOException {
		Gson gson = new Gson();
		InputStream bodyStream = new ByteArrayInputStream(gson.toJson(data).getBytes());
		IOUtils.copy(bodyStream, response.getOutputStream());
		response.setContentType("application/json");
	}

	private void cacheResponse(HttpServletResponse response) {
		response.setHeader("Cache-Control", "max-age=3600");
	}
}
