package utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.StringReader;
import java.io.StringWriter;
import java.net.URI;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import javax.xml.namespace.QName;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.sbolstandard.core2.AccessType;
import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.Component;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.DirectionType;
import org.sbolstandard.core2.ModuleDefinition;
import org.sbolstandard.core2.OrientationType;
import org.sbolstandard.core2.RestrictionType;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLReader;
import org.sbolstandard.core2.SBOLValidationException;
import org.sbolstandard.core2.SBOLWriter;
import org.sbolstandard.core2.Sequence;
import org.sbolstandard.core2.SequenceAnnotation;
import org.sbolstandard.core2.SequenceOntology;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import com.google.gson.Gson;

import data.GlyphInfo;
import data.MxCell;
import data.MxGeometry;

public class Converter {

	private static Gson gson = new Gson();

	static String uriPrefix = "https://sbolcanvas.org/";
	static String annPrefix = "SBOLCanvas";
	static Comparator<MxCell> geoSorter = new Comparator<MxCell>() {
		// The x position implies the order on the strand
		@Override
		public int compare(MxCell o1, MxCell o2) {
			return o1.getGeometry().getX() < o2.getGeometry().getX() ? -1 : 1;
		}
	};
	static Comparator<MxCell> idSorter = new Comparator<MxCell>() {
		@Override
		public int compare(MxCell o1, MxCell o2) {
			return o1.getId() - o2.getId();
		}
	};

	public static void toSBOL(InputStream graphStream, OutputStream sbolStream) {
		// convert the stream to a document
		Document graph = null;
		try {
			DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
			DocumentBuilder builder = factory.newDocumentBuilder();
			graph = builder.parse(graphStream);
		} catch (SAXException | IOException | ParserConfigurationException e1) {
			e1.printStackTrace();
		}

		// create objects from the document
		HashMap<Integer, MxCell> containers = new HashMap<Integer, MxCell>();
		HashMap<Integer, MxCell> backbones = new HashMap<Integer, MxCell>();
		LinkedList<MxCell> proteins = new LinkedList<MxCell>();
		LinkedList<MxCell> textBoxes = new LinkedList<MxCell>();
		HashMap<Integer, Set<MxCell>> glyphSets = new HashMap<Integer, Set<MxCell>>();
		createMxGraphObjects(graph, containers, backbones, proteins, textBoxes, glyphSets);

		// create the document
		SBOLDocument document = new SBOLDocument();
		document.setDefaultURIprefix(uriPrefix);
		document.setComplete(true);
		document.setCreateDefaults(true);

		try {
			// top level module definition that contains all strands and proteins
			ModuleDefinition modDef = document.createModuleDefinition("CanvasModDef");
			modDef.createAnnotation(new QName(uriPrefix, "textBoxes", annPrefix),
					gson.toJson(textBoxes.toArray(new MxCell[0])));

			// create the top level component definitions, aka strands
			for (MxCell backboneCell : backbones.values()) {
				MxCell containerCell = containers.get(backboneCell.getParent());
				ComponentDefinition backboneCD = document.createComponentDefinition(
						backboneCell.getInfo().getDisplayID(), ComponentDefinition.DNA_REGION);
				backboneCD.addRole(SequenceOntology.ENGINEERED_REGION);

				modDef.createFunctionalComponent(backboneCD.getDisplayId(), AccessType.PUBLIC, backboneCD.getIdentity(),
						DirectionType.INOUT);

				createComponentDefinition(document, backboneCD, containerCell, backboneCell,
						glyphSets.get(containerCell.getId()));
			}

			// write to body
			SBOLWriter.setKeepGoing(true);
			SBOLWriter.write(document, sbolStream);
		} catch (SBOLValidationException | SBOLConversionException e) {
			e.printStackTrace();
		}
	}

	public static void toGraph(InputStream sbolStream, OutputStream graphStream) {
		try {
			// load the sbol file into the proper objects
			SBOLDocument document = SBOLReader.read(sbolStream);
			Set<ComponentDefinition> backboneCDs = document.getRootComponentDefinitions();
			TreeSet<MxCell> cells = new TreeSet<MxCell>(idSorter);
			ModuleDefinition modDef = document.getRootModuleDefinitions().iterator().next();
			MxCell[] textBoxes = gson.fromJson(
					modDef.getAnnotation(new QName(uriPrefix, "textBoxes", annPrefix)).getStringValue(),
					MxCell[].class);
			for (MxCell cell : textBoxes) {
				cells.add(cell);
			}

			// top level component definitions
			for (ComponentDefinition backboneCD : backboneCDs) {
				sbolToMxGraphObjects(backboneCD, cells);
			}

			// convert the objects to the graph xml
			graphStream.write(objectsToGraph(cells).getBytes());

		} catch (SBOLValidationException | IOException | SBOLConversionException | ParserConfigurationException
				| TransformerException e) {
			e.printStackTrace();
		}
	}

	// helpers

	private static int getSequenceLength(SBOLDocument document, ComponentDefinition componentDef) {
		if (componentDef.getSequences() != null && componentDef.getSequences().size() > 0) {
			Sequence sequence = componentDef.getSequences().iterator().next();
			return sequence.getElements().length();
		} else {
			if (componentDef.getSequenceAnnotations() != null && componentDef.getSequenceAnnotations().size() > 0) {
				int total = 0;
				for (SequenceAnnotation annotation : componentDef.getSequenceAnnotations()) {
					if (annotation.getComponent() != null) {
						Component component = annotation.getComponent();

						ComponentDefinition subComponentDef = component.getDefinition();
						total = total + getSequenceLength(document, subComponentDef);
					}
				}
				return total;
			} else {
				return 0;
			}
		}

	}

	private static void createComponentDefinition(SBOLDocument document, ComponentDefinition compDef, MxCell container,
			MxCell backbone, Set<MxCell> glyphs) throws SBOLValidationException {
		// container and backbone stuff
		compDef.createAnnotation(new QName(uriPrefix, "containerCell", annPrefix), gson.toJson(container));
		compDef.createAnnotation(new QName(uriPrefix, "backboneCell", annPrefix), gson.toJson(backbone));

		// create the things needed for components
		Component previous = null;
		int count = 0;
		int start = 0, end = 0;
		if (glyphs != null) {
			for (MxCell glyphCell : glyphs) {

				// component definition
				ComponentDefinition componentCD = document.createComponentDefinition(glyphCell.getInfo().getDisplayID(),
						SBOLData.types.getValue(glyphCell.getInfo().getPartType()));
				if (glyphCell.getInfo().getPartRefine() == null || glyphCell.getInfo().getPartRefine().equals("")) {
					componentCD.addRole(SBOLData.roles.getValue(glyphCell.getInfo().getPartRole()));
				} else {
					componentCD.addRole(SBOLData.refinements.getValue(glyphCell.getInfo().getPartRefine()));
				}
				componentCD.setName(glyphCell.getInfo().getName());
				componentCD.setDescription(glyphCell.getInfo().getDescription());

				// component
				Component component = compDef.createComponent(glyphCell.getInfo().getDisplayID(), AccessType.PUBLIC,
						componentCD.getDisplayId());

				// composite
				if (glyphCell.getInfo().getModel() != null && !glyphCell.getInfo().getModel().equals("")) {
					// composite
					// convert the string to a document
					Document graph = null;
					try {
						DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
						DocumentBuilder builder = factory.newDocumentBuilder();
						graph = builder.parse(new InputSource(new StringReader(glyphCell.getInfo().getModel())));
					} catch (SAXException | IOException | ParserConfigurationException e1) {
						e1.printStackTrace();
					}

					// create objects from the document
					HashMap<Integer, MxCell> containers = new HashMap<Integer, MxCell>();
					HashMap<Integer, MxCell> backbones = new HashMap<Integer, MxCell>();
					LinkedList<MxCell> textBoxes = new LinkedList<MxCell>();
					HashMap<Integer, Set<MxCell>> glyphSets = new HashMap<Integer, Set<MxCell>>();
					createMxGraphObjects(graph, containers, backbones, null, textBoxes, glyphSets);
					MxCell subContainer = containers.values().iterator().next();
					MxCell subBackbone = backbones.values().iterator().next();
					Set<MxCell> subGlyphs = glyphSets.get(subContainer.getId());
					componentCD.createAnnotation(new QName(uriPrefix, "textBoxes", annPrefix),
							gson.toJson(textBoxes.toArray(new MxCell[0])));

					createComponentDefinition(document, componentCD, subContainer, subBackbone, subGlyphs);
				}

				// sequence
				if (glyphCell.getInfo().getModel() == null || glyphCell.getInfo().getModel().equals("")) {
					// component sequence
					if (glyphCell.getInfo().getSequence() != null && !glyphCell.getInfo().getSequence().equals("")) {
						Sequence seq = document.createSequence(componentCD.getDisplayId() + "Sequence",
								glyphCell.getInfo().getSequence(), Sequence.IUPAC_DNA);
						componentCD.addSequence(seq.getIdentity());
					}
				}

				// cell annotation
				component.createAnnotation(new QName(uriPrefix, "glyphCell", annPrefix), gson.toJson(glyphCell));

				// sequence constraints
				if (previous != null) {
					compDef.createSequenceConstraint(compDef.getDisplayId() + "Constraint" + count,
							RestrictionType.PRECEDES, previous.getIdentity(), component.getIdentity());
				}
				previous = component;

				// container sequence annotation
				int length = getSequenceLength(document, componentCD);
				if (length > 0) {
					start = end + 1;
					end = start + length - 1;
					SequenceAnnotation annotation = compDef.createSequenceAnnotation(
							compDef.getDisplayId() + "Annotation" + count, "location" + count, start, end,
							OrientationType.INLINE);
					annotation.setComponent(component.getIdentity());
				}

				// container sequence maybe

				count++;
			}
		}
	}

	private static void createMxGraphObjects(Document document, HashMap<Integer, MxCell> containers,
			HashMap<Integer, MxCell> backbones, List<MxCell> proteins, List<MxCell> textBoxes,
			HashMap<Integer, Set<MxCell>> glyphSets) {
		document.normalize();
		NodeList nList = document.getElementsByTagName("mxCell");
		for (int temp = 0; temp < nList.getLength(); temp++) {
			Node node = nList.item(temp);

			// cell info
			Element cellElement = (Element) node;
			MxCell cell = new MxCell();
			cell.setId(Integer.parseInt(cellElement.getAttribute("id")));
			cell.setValue(cellElement.getAttribute("value"));
			cell.setStyle(cellElement.getAttribute("style"));
			if (cellElement.hasAttribute("vertex"))
				cell.setVertex(Integer.parseInt(cellElement.getAttribute("vertex")) == 1 ? true : false);
			if (cellElement.hasAttribute("connectable"))
				cell.setConnectable(Integer.parseInt(cellElement.getAttribute("connectable")) == 1 ? true : false);
			if (cellElement.hasAttribute("parent"))
				cell.setParent(Integer.parseInt(cellElement.getAttribute("parent")));
			else
				cell.setParent(-1);

			// geometry info
			if (cellElement.getElementsByTagName("mxGeometry").getLength() > 0) {
				Element geoElement = (Element) cellElement.getElementsByTagName("mxGeometry").item(0);
				MxGeometry geometry = new MxGeometry();
				if (geoElement.hasAttribute("x"))
					geometry.setX(Double.parseDouble(geoElement.getAttribute("x")));
				if (geoElement.hasAttribute("y"))
					geometry.setY(Double.parseDouble(geoElement.getAttribute("y")));
				if (geoElement.hasAttribute("width"))
					geometry.setWidth(Double.parseDouble(geoElement.getAttribute("width")));
				if (geoElement.hasAttribute("height"))
					geometry.setHeight(Double.parseDouble(geoElement.getAttribute("height")));
				cell.setGeometry(geometry);
			}

			// glyph info
			if (cellElement.getElementsByTagName("GlyphInfo").getLength() > 0) {
				Element infoElement = (Element) cellElement.getElementsByTagName("GlyphInfo").item(0);
				GlyphInfo info = new GlyphInfo();
				info.setPartType(infoElement.getAttribute("partType"));
				info.setPartRole(infoElement.getAttribute("partRole"));
				info.setPartRefine(infoElement.getAttribute("partRefine"));
				info.setDisplayID(infoElement.getAttribute("displayID"));
				info.setName(infoElement.getAttribute("name"));
				info.setDescription(infoElement.getAttribute("description"));
				info.setVersion(infoElement.getAttribute("version"));
				info.setSequence(infoElement.getAttribute("sequence"));
				info.setModel(infoElement.getAttribute("model"));
				cell.setInfo(info);
			}

			if (cell.getStyle().contains("circuitContainer")) {
				containers.put(cell.getId(), cell);
			} else if (cell.getStyle().contains("backbone")) {
				// TODO remove me when the user can set the displayID
				cell.setInfo(new GlyphInfo());
				cell.getInfo().setDisplayID("cd" + cell.getId());
				backbones.put(cell.getId(), cell);
			} else if (proteins != null && cell.getStyle().contains("molecularSpeciesGlyph")) {
				proteins.add(cell);
			} else if (textBoxes != null && cell.getStyle().contains("textBox")) {
				textBoxes.add(cell);
			} else if (cell.getStyle().contains("sequenceFeatureGlyph")) {
				if (glyphSets.get(cell.getParent()) != null) {
					glyphSets.get(cell.getParent()).add(cell);
				} else {
					TreeSet<MxCell> set = new TreeSet<MxCell>(geoSorter);
					set.add(cell);
					glyphSets.put(cell.getParent(), set);
				}
			}
		}
	}

	private static String objectsToGraph(Set<MxCell> cells) throws ParserConfigurationException, TransformerException {
		DocumentBuilderFactory documentFactory = DocumentBuilderFactory.newInstance();
		DocumentBuilder documentBuilder = documentFactory.newDocumentBuilder();
		Document graphDocument = documentBuilder.newDocument();

		// top items needed for mxgraph
		Element mxGraphModel = graphDocument.createElement("mxGraphModel");
		graphDocument.appendChild(mxGraphModel);

		Element root = graphDocument.createElement("root");
		mxGraphModel.appendChild(root);

		// cells that need to be there for some reason
		Element first = graphDocument.createElement("mxCell");
		first.setAttribute("id", "0");
		root.appendChild(first);
		Element second = graphDocument.createElement("mxCell");
		second.setAttribute("id", "1");
		second.setAttribute("parent", "0");
		root.appendChild(second);

		for (MxCell cell : cells) {
			// cell
			Element mxCell = graphDocument.createElement("mxCell");
			mxCell.setAttribute("id", "" + cell.getId());
			mxCell.setAttribute("value", cell.getValue());
			mxCell.setAttribute("style", cell.getStyle());
			mxCell.setAttribute("vertex", cell.isVertex() ? "1" : "0");
			mxCell.setAttribute("connectable", cell.isConnectable() ? "1" : "0");
			mxCell.setAttribute("parent", "" + cell.getParent());
			root.appendChild(mxCell);

			// geometry
			MxGeometry geometry = cell.getGeometry();
			Element mxGeometry = graphDocument.createElement("mxGeometry");
			if (geometry.getX() != 0)
				mxGeometry.setAttribute("x", "" + geometry.getX());
			if (geometry.getY() != 0)
				mxGeometry.setAttribute("y", "" + geometry.getY());
			if (geometry.getWidth() != 0)
				mxGeometry.setAttribute("width", "" + geometry.getWidth());
			if (geometry.getHeight() != 0)
				mxGeometry.setAttribute("height", "" + geometry.getHeight());
			mxGeometry.setAttribute("as", "geometry");
			mxCell.appendChild(mxGeometry);

			// GlyphInfo
			if (cell.getInfo() != null) {
				GlyphInfo info = cell.getInfo();
				Element glyphInfo = graphDocument.createElement("GlyphInfo");
				if (info.getDescription() != null)
					glyphInfo.setAttribute("description", info.getDescription());
				if (info.getDisplayID() != null)
					glyphInfo.setAttribute("displayID", info.getDisplayID());
				if (info.getName() != null)
					glyphInfo.setAttribute("name", info.getName());
				if (info.getPartRefine() != null)
					glyphInfo.setAttribute("partRefine", info.getPartRefine());
				if (info.getPartRole() != null)
					glyphInfo.setAttribute("partRole", info.getPartRole());
				if (info.getPartType() != null)
					glyphInfo.setAttribute("partType", info.getPartType());
				if (info.getSequence() != null)
					glyphInfo.setAttribute("sequence", info.getSequence());
				if (info.getVersion() != null)
					glyphInfo.setAttribute("version", info.getVersion());
				if (info.getModel() != null)
					glyphInfo.setAttribute("model", info.getModel());
				glyphInfo.setAttribute("as", "data");
				mxCell.appendChild(glyphInfo);
			}
		}

		TransformerFactory transformerFactory = TransformerFactory.newInstance();
		Transformer transformer = transformerFactory.newTransformer();
		DOMSource domSource = new DOMSource(graphDocument);
		StringWriter sw = new StringWriter();
		StreamResult result = new StreamResult(sw);
		transformer.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");
		transformer.transform(domSource, result);

		return sw.toString();
	}

	private static void sbolToMxGraphObjects(ComponentDefinition compDef, Set<MxCell> cells)
			throws ParserConfigurationException, TransformerException {
		// container data
		MxCell containerCell = gson.fromJson(
				compDef.getAnnotation(new QName(uriPrefix, "containerCell", annPrefix)).getStringValue(), MxCell.class);
		cells.add(containerCell);

		// backbone data
		MxCell backboneCell = gson.fromJson(
				compDef.getAnnotation(new QName(uriPrefix, "backboneCell", annPrefix)).getStringValue(), MxCell.class);
		cells.add(backboneCell);

		// text boxes
		Annotation textBoxesAnnotation = compDef.getAnnotation(new QName(uriPrefix, "textBoxes", annPrefix));
		if (textBoxesAnnotation != null) {
			MxCell[] textBoxes = gson.fromJson(textBoxesAnnotation.getStringValue(), MxCell[].class);
			for (MxCell textBox : textBoxes) {
				cells.add(textBox);
			}
		}

		// glyphs
		for (Component glyphComponent : compDef.getComponents()) {

			// glyph data
			MxCell glyphCell = gson.fromJson(
					glyphComponent.getAnnotation(new QName(uriPrefix, "glyphCell", annPrefix)).getStringValue(),
					MxCell.class);

			// glyph info
			GlyphInfo glyphInfo = new GlyphInfo();
			glyphInfo.setDescription(glyphComponent.getDescription());
			glyphInfo.setDisplayID(glyphComponent.getDisplayId());
			glyphInfo.setName(glyphComponent.getName());
			URI glyphRole = glyphComponent.getDefinition().getRoles().toArray(new URI[0])[0];
			if (SBOLData.roles.containsValue(glyphRole)) {
				glyphInfo.setPartRole(SBOLData.roles.getKey(glyphRole));
			} else {
				glyphInfo.setPartRole(SBOLData.roles.getKey(SBOLData.parents.get(glyphRole)));
				glyphInfo.setPartRefine(SBOLData.refinements.getKey(glyphRole));
			}
			URI glyphType = glyphComponent.getDefinition().getTypes().toArray(new URI[0])[0];
			glyphInfo.setPartType(SBOLData.types.getKey(glyphType));
			if (glyphComponent.getDefinition().getSequences().size() > 0)
				glyphInfo.setSequence(glyphComponent.getDefinition().getSequences().iterator().next().getElements());
			glyphInfo.setVersion(glyphComponent.getVersion());
			if (glyphComponent.getDefinition()
					.getAnnotation(new QName(uriPrefix, "containerCell", annPrefix)) != null) {
				TreeSet<MxCell> subCells = new TreeSet<MxCell>(idSorter);
				sbolToMxGraphObjects(glyphComponent.getDefinition(), subCells);
				glyphInfo.setModel(objectsToGraph(subCells));
			}
			glyphCell.setInfo(glyphInfo);

			cells.add(glyphCell);

		}
	}

}
