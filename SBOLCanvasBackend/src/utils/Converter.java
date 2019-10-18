package utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.StringWriter;
import java.net.URI;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedList;
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
import org.sbolstandard.core2.FunctionalComponent;
import org.sbolstandard.core2.Interaction;
import org.sbolstandard.core2.ModuleDefinition;
import org.sbolstandard.core2.OrientationType;
import org.sbolstandard.core2.Participation;
import org.sbolstandard.core2.RestrictionType;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLReader;
import org.sbolstandard.core2.SBOLValidationException;
import org.sbolstandard.core2.SBOLWriter;
import org.sbolstandard.core2.Sequence;
import org.sbolstandard.core2.SequenceAnnotation;
import org.sbolstandard.core2.SequenceOntology;
import org.sbolstandard.core2.SystemsBiologyOntology;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import com.google.gson.Gson;

import data.GlyphInfo;
import data.InteractionInfo;
import data.MxCell;
import data.MxGeometry;
import data.MxPoint;

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

	private HashMap<Integer, HashMap<Integer, MxCell>> containers = new HashMap<Integer, HashMap<Integer, MxCell>>();
	private HashMap<Integer, MxCell> backbones = new HashMap<Integer, MxCell>();
	private LinkedList<MxCell> proteins = new LinkedList<MxCell>();
	private LinkedList<MxCell> textBoxes = new LinkedList<MxCell>();
	private HashMap<Integer, Set<MxCell>> glyphSets = new HashMap<Integer, Set<MxCell>>();
	private LinkedList<MxCell> edges = new LinkedList<MxCell>();
	private HashMap<Integer, MxCell> cells = new HashMap<Integer, MxCell>();

	public void toSBOL(InputStream graphStream, OutputStream sbolStream) {
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
		createMxGraphObjects(graph);

		// create the document
		SBOLDocument document = new SBOLDocument();
		document.setDefaultURIprefix(uriPrefix);
		document.setComplete(true);
		document.setCreateDefaults(true);

		try {
			// top level module definition that contains all strands and proteins
			ModuleDefinition modDef = document.createModuleDefinition("CanvasModDef");
			if (textBoxes.size() > 0) {
				modDef.createAnnotation(new QName(uriPrefix, "textBoxes", annPrefix),
						gson.toJson(textBoxes.toArray(new MxCell[0])));
			}

			// create the proteins
			for (MxCell protein : proteins) {
				GlyphInfo proteinInfo = (GlyphInfo) protein.getInfo();
				ComponentDefinition proteinCD = document.createComponentDefinition(proteinInfo.getDisplayID(),
						ComponentDefinition.PROTEIN);
				proteinCD.addRole(SystemsBiologyOntology.INHIBITOR);
				modDef.createFunctionalComponent(proteinCD.getDisplayId(), AccessType.PUBLIC, proteinCD.getIdentity(),
						DirectionType.INOUT);
				proteinCD.createAnnotation(new QName(uriPrefix, "protein", annPrefix), gson.toJson(protein));
			}

			// create the top level component definitions, aka strands
			HashMap<Integer, MxCell> topContainers = containers.get(1);
			if (topContainers != null)
				for (MxCell containerCell : topContainers.values()) {
					MxCell backboneCell = backbones.get(containerCell.getId());
					ComponentDefinition containerCD = document.createComponentDefinition(
							((GlyphInfo) backboneCell.getInfo()).getDisplayID(), ComponentDefinition.DNA_REGION);
					containerCD.addRole(SequenceOntology.ENGINEERED_REGION);

					modDef.createFunctionalComponent(containerCD.getDisplayId(), AccessType.PUBLIC,
							containerCD.getIdentity(), DirectionType.INOUT);

					createComponentDefinition(document, containerCD, containerCell, backboneCell);
				}

			// edges to interactions
			for (MxCell edge : edges) {
				// interaction
				InteractionInfo intInfo = (InteractionInfo) edge.getInfo();
				Interaction interaction = modDef.createInteraction(intInfo.getDisplayID(),
						SBOLData.interactions.getValue(intInfo.getInteractionType()));
				interaction.createAnnotation(new QName(uriPrefix, "edge", annPrefix), gson.toJson(edge));

				// participants
				GlyphInfo sourceInfo = null;
				GlyphInfo targetInfo = null;
				if (edge.getSource() > 0)
					sourceInfo = (GlyphInfo) cells.get(edge.getSource()).getInfo();
				if (edge.getTarget() > 0)
					targetInfo = (GlyphInfo) cells.get(edge.getTarget()).getInfo();

				// source participant
				if (sourceInfo != null) {
					FunctionalComponent sourceFC = modDef.getFunctionalComponent(sourceInfo.getDisplayID());
					if (sourceFC == null) {
						ComponentDefinition sourceCD = document.getComponentDefinition(sourceInfo.getDisplayID(), null);
						sourceFC = modDef.createFunctionalComponent(sourceInfo.getDisplayID(), AccessType.PUBLIC,
								sourceCD.getIdentity(), DirectionType.INOUT);
					}
					if (intInfo.getFromParticipationType() != null && !intInfo.getFromParticipationType().equals(""))
						interaction.createParticipation(sourceInfo.getDisplayID(), sourceFC.getIdentity(),
								SBOLData.participations.getValue(intInfo.getFromParticipationType()));
				}

				// target participant
				if (targetInfo != null) {
					FunctionalComponent targetFC = modDef.getFunctionalComponent(targetInfo.getDisplayID());
					if (targetFC == null) {
						ComponentDefinition targetCD = document.getComponentDefinition(targetInfo.getDisplayID(), null);
						targetFC = modDef.createFunctionalComponent(targetInfo.getDisplayID(), AccessType.PUBLIC,
								targetCD.getIdentity(), DirectionType.INOUT);
					}
					if (intInfo.getToParticipationType() != null && !intInfo.getToParticipationType().equals(""))
						interaction.createParticipation(targetInfo.getDisplayID(), targetFC.getIdentity(),
								SBOLData.participations.getValue(intInfo.getToParticipationType()));
				}

			}

			// write to body
			SBOLWriter.setKeepGoing(true);
			SBOLWriter.write(document, sbolStream);
		} catch (SBOLValidationException | SBOLConversionException e) {
			e.printStackTrace();
		}
	}

	public void toGraph(InputStream sbolStream, OutputStream graphStream) {
		try {
			// load the sbol file into the proper objects
			SBOLDocument document = SBOLReader.read(sbolStream);
			Set<ComponentDefinition> backboneCDs = document.getRootComponentDefinitions();
			ModuleDefinition modDef = document.getRootModuleDefinitions().iterator().next();
			Annotation textAnn = modDef.getAnnotation(new QName(uriPrefix, "textBoxes", annPrefix));
			MxCell[] textBoxes = null;
			if (textAnn != null) {
				textBoxes = gson.fromJson(textAnn.getStringValue(), MxCell[].class);
				for (MxCell cell : textBoxes) {
					cells.put(cell.getId(), cell);
				}
			}

			// top level component definitions
			for (ComponentDefinition backboneCD : backboneCDs) {
				compDefToMxGraphObjects(backboneCD);
			}

			// edges
			modDefToMxGraphObjects(document.getModuleDefinitions().iterator().next());

			// convert the objects to the graph xml
			graphStream.write(objectsToGraph().getBytes());

		} catch (SBOLValidationException | IOException | SBOLConversionException | ParserConfigurationException
				| TransformerException e) {
			e.printStackTrace();
		}
	}

	// helpers

	private int getSequenceLength(SBOLDocument document, ComponentDefinition componentDef) {
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

	private void createComponentDefinition(SBOLDocument document, ComponentDefinition compDef, MxCell container,
			MxCell backbone) throws SBOLValidationException {
		// container and backbone stuff
		compDef.createAnnotation(new QName(uriPrefix, "containerCell", annPrefix), gson.toJson(container));
		compDef.createAnnotation(new QName(uriPrefix, "backboneCell", annPrefix), gson.toJson(backbone));

		// create the things needed for components
		Component previous = null;
		int count = 0;
		int start = 0, end = 0;
		Set<MxCell> glyphs = glyphSets.get(container.getId());
		if (glyphs != null) {
			for (MxCell glyphCell : glyphs) {

				// component definition
				GlyphInfo glyphInfo = (GlyphInfo) glyphCell.getInfo();
				ComponentDefinition componentCD = document.createComponentDefinition(glyphInfo.getDisplayID(),
						SBOLData.types.getValue(glyphInfo.getPartType()));
				if (glyphInfo.getPartRefine() == null || glyphInfo.getPartRefine().equals("")) {
					componentCD.addRole(SBOLData.roles.getValue(glyphInfo.getPartRole()));
				} else {
					componentCD.addRole(SBOLData.refinements.getValue(glyphInfo.getPartRefine()));
				}
				componentCD.setName(glyphInfo.getName());
				componentCD.setDescription(glyphInfo.getDescription());

				// component
				Component component = compDef.createComponent(glyphInfo.getDisplayID(), AccessType.PUBLIC,
						componentCD.getDisplayId());

				// composite
				if (containers.containsKey(glyphCell.getId())) {
					// composite
					MxCell subContainer = containers.get(glyphCell.getId()).values().iterator().next();
					MxCell subBackbone = backbones.get(subContainer.getId());
					createComponentDefinition(document, componentCD, subContainer, subBackbone);
				}

				// sequence
				if (!containers.containsKey(glyphCell.getId())) {
					// component sequence
					if (glyphInfo.getSequence() != null && !glyphInfo.getSequence().equals("")) {
						Sequence seq = document.createSequence(componentCD.getDisplayId() + "Sequence",
								glyphInfo.getSequence(), Sequence.IUPAC_DNA);
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

	private void createMxGraphObjects(Document document) {
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
				cell.setVertex(Integer.parseInt(cellElement.getAttribute("vertex")) == 1);
			if (cellElement.hasAttribute("edge"))
				cell.setEdge(Integer.parseInt(cellElement.getAttribute("edge")) == 1);
			if (cellElement.hasAttribute("connectable"))
				cell.setConnectable(Integer.parseInt(cellElement.getAttribute("connectable")) == 1);
			if (cellElement.hasAttribute("collapsed"))
				cell.setCollapsed(Integer.parseInt(cellElement.getAttribute("collapsed")) == 1);
			if (cellElement.hasAttribute("parent"))
				cell.setParent(Integer.parseInt(cellElement.getAttribute("parent")));
			else
				cell.setParent(-1);
			if (cellElement.hasAttribute("source"))
				cell.setSource(Integer.parseInt(cellElement.getAttribute("source")));
			if (cellElement.hasAttribute("target"))
				cell.setTarget(Integer.parseInt(cellElement.getAttribute("target")));

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
				if (geoElement.getElementsByTagName("Array").getLength() > 0) {
					LinkedList<MxPoint> points = new LinkedList<MxPoint>();
					Element arrayElement = (Element) geoElement.getElementsByTagName("Array").item(0);
					NodeList pointNodes = arrayElement.getElementsByTagName("mxPoint");
					for (int pointIndex = 0; pointIndex < pointNodes.getLength(); pointIndex++) {
						Element pointElement = (Element) pointNodes.item(pointIndex);
						MxPoint point = new MxPoint();
						if (pointElement.hasAttribute("x"))
							point.setX(Double.parseDouble(pointElement.getAttribute("x")));
						else
							point.setX(0);
						if (pointElement.hasAttribute("y"))
							point.setY(Integer.parseInt(pointElement.getAttribute("y")));
						else
							point.setY(0);
						points.add(point);
					}
					geometry.setPoints(points);
				}
				if (geoElement.getElementsByTagName("mxPoint").getLength() > 0) {
					NodeList pointNodes = geoElement.getElementsByTagName("mxPoint");
					for (int pointIndex = 0; pointIndex < pointNodes.getLength(); pointIndex++) {
						Element pointElement = (Element) pointNodes.item(pointIndex);
						MxPoint point = new MxPoint();
						point.setX(Double.parseDouble(pointElement.getAttribute("x")));
						point.setY(Double.parseDouble(pointElement.getAttribute("y")));
						if (pointElement.getAttribute("as").equals("sourcePoint")) {
							geometry.setSourcePoint(point);
						}
						if (pointElement.getAttribute("as").equals("targetPoint")) {
							geometry.setTargetPoint(point);
						}

					}

				}
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
				cell.setInfo(info);
			}

			// interaction info
			if (cellElement.getElementsByTagName("InteractionInfo").getLength() > 0) {
				Element infoElement = (Element) cellElement.getElementsByTagName("InteractionInfo").item(0);
				InteractionInfo info = new InteractionInfo();
				info.setDisplayID(infoElement.getAttribute("displayID"));
				info.setInteractionType(infoElement.getAttribute("interactionType"));
				info.setFromParticipationType(infoElement.getAttribute("fromParticipationType"));
				info.setToParticipationType(infoElement.getAttribute("toParticipationType"));
				cell.setInfo(info);
			}

			if (cell.isEdge()) {
				edges.add(cell);
			} else if (cell.getStyle().contains("circuitContainer")) {
				if (containers.containsKey(cell.getParent())) {
					containers.get(cell.getParent()).put(cell.getId(), cell);
				} else {
					HashMap<Integer, MxCell> subContainers = new HashMap<Integer, MxCell>();
					subContainers.put(cell.getId(), cell);
					containers.put(cell.getParent(), subContainers);
				}
			} else if (cell.getStyle().contains("backbone")) {
				// TODO remove me when the user can set the displayID
				GlyphInfo glyphInfo = new GlyphInfo();
				glyphInfo.setDisplayID("cd" + cell.getId());
				cell.setInfo(glyphInfo);
				backbones.put(cell.getParent(), cell);
			} else if (proteins != null && cell.getStyle().contains("molecularSpeciesGlyph")) {
				proteins.add(cell);
			} else if (cell.getStyle().contains("textBox")) {
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
			cells.put(cell.getId(), cell);
		}
	}

	private String objectsToGraph() throws ParserConfigurationException, TransformerException {
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

		for (MxCell cell : cells.values()) {
			// cell
			Element mxCell = graphDocument.createElement("mxCell");
			mxCell.setAttribute("id", "" + cell.getId());
			mxCell.setAttribute("value", cell.getValue());
			mxCell.setAttribute("style", cell.getStyle());
			if(cell.isVertex())
				mxCell.setAttribute("vertex", "1");
			if(cell.isEdge())
				mxCell.setAttribute("edge", "1");
			mxCell.setAttribute("connectable", cell.isConnectable() ? "1" : "0");
			mxCell.setAttribute("parent", "" + cell.getParent());
			if(cell.getSource() > 0)
				mxCell.setAttribute("source", ""+cell.getSource());
			if(cell.getTarget() > 0)
				mxCell.setAttribute("target", ""+cell.getTarget());
			if(cell.isCollapsed())
				mxCell.setAttribute("collapsed", "1");
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
			if(geometry.getSourcePoint() != null) {
				MxPoint sourcePoint = geometry.getSourcePoint();
				Element mxPoint = graphDocument.createElement("mxPoint");
				mxPoint.setAttribute("x", ""+sourcePoint.getX());
				mxPoint.setAttribute("y", ""+sourcePoint.getY());
				mxPoint.setAttribute("as", "sourcePoint");
				mxGeometry.appendChild(mxPoint);
			}
			if(geometry.getTargetPoint() != null) {
				MxPoint targetPoint = geometry.getTargetPoint();
				Element mxPoint = graphDocument.createElement("mxPoint");
				mxPoint.setAttribute("x", ""+targetPoint.getX());
				mxPoint.setAttribute("y", ""+targetPoint.getY());
				mxPoint.setAttribute("as", "targetPoint");
				mxGeometry.appendChild(mxPoint);
			}
			if(geometry.getPoints() != null) {
				Element array = graphDocument.createElement("Array");
				array.setAttribute("as", "points");
				for(MxPoint point : geometry.getPoints()) {
					Element mxPoint = graphDocument.createElement("mxPoint");
					mxPoint.setAttribute("x", ""+point.getX());
					mxPoint.setAttribute("y", ""+point.getY());
					array.appendChild(mxPoint);
				}
				mxGeometry.appendChild(array);
			}
			mxGeometry.setAttribute("as", "geometry");
			mxCell.appendChild(mxGeometry);

			// GlyphInfo
			if (cell.getInfo() != null) {
				if (cell.getInfo() instanceof GlyphInfo) {
					GlyphInfo info = (GlyphInfo) cell.getInfo();
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
					glyphInfo.setAttribute("as", "data");
					mxCell.appendChild(glyphInfo);
				}else if(cell.getInfo() instanceof InteractionInfo) {
					InteractionInfo info = (InteractionInfo) cell.getInfo();
					Element intInfo = graphDocument.createElement("InteractionInfo");
					if(info.getDisplayID() != null)
						intInfo.setAttribute("displayID", info.getDisplayID());
					if(info.getInteractionType() != null)
						intInfo.setAttribute("interactionType", info.getInteractionType());
					if(info.getFromParticipationType() != null)
						intInfo.setAttribute("fromParticipationType", info.getFromParticipationType());
					if(info.getToParticipationType() != null)
						intInfo.setAttribute("toParticipationType", info.getToParticipationType());
					intInfo.setAttribute("as", "data");
					mxCell.appendChild(intInfo);
				}
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

	// call after compDefToMxGraphObjects
	private void modDefToMxGraphObjects(ModuleDefinition modDef) {
		Set<Interaction> interactions = modDef.getInteractions();
		for (Interaction interaction : interactions) {
			MxCell edge = gson.fromJson(
					interaction.getAnnotation(new QName(uriPrefix, "edge", annPrefix)).getStringValue(), MxCell.class);
			InteractionInfo info = new InteractionInfo();
			info.setDisplayID(interaction.getDisplayId());
			info.setInteractionType(SBOLData.interactions.getKey(interaction.getTypes().iterator().next()));
			Set<Participation> participations = interaction.getParticipations();
			for (Participation part : participations) {
				if (edge.getSource() > 0 && part.getDisplayId()
						.equals(((GlyphInfo) cells.get(edge.getSource()).getInfo()).getDisplayID())) {
					info.setFromParticipationType(SBOLData.participations.getKey(part.getRoles().iterator().next()));
				} else if (edge.getTarget() > 0 && part.getDisplayId()
						.equals(((GlyphInfo) cells.get(edge.getTarget()).getInfo()).getDisplayID())) {
					info.setToParticipationType(SBOLData.participations.getKey(part.getRoles().iterator().next()));
				}
			}
			edge.setInfo(info);
			cells.put(edge.getId(), edge);
		}
	}

	private void compDefToMxGraphObjects(ComponentDefinition compDef)
			throws ParserConfigurationException, TransformerException {
		Annotation proteinAnn = compDef.getAnnotation(new QName(uriPrefix, "protein", annPrefix));
		if (proteinAnn != null) {
			MxCell proteinCell = gson.fromJson(proteinAnn.getStringValue(), MxCell.class);
			GlyphInfo info = new GlyphInfo();
			info.setDisplayID(compDef.getDisplayId());
			proteinCell.setInfo(info);
			cells.put(proteinCell.getId(), proteinCell);
			return;
		}
		// container data
		MxCell containerCell = gson.fromJson(
				compDef.getAnnotation(new QName(uriPrefix, "containerCell", annPrefix)).getStringValue(), MxCell.class);
		cells.put(containerCell.getId(), containerCell);

		// backbone data
		MxCell backboneCell = gson.fromJson(
				compDef.getAnnotation(new QName(uriPrefix, "backboneCell", annPrefix)).getStringValue(), MxCell.class);
		cells.put(backboneCell.getId(), backboneCell);

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
				compDefToMxGraphObjects(glyphComponent.getDefinition());
			}
			glyphCell.setInfo(glyphInfo);

			cells.put(glyphCell.getId(), glyphCell);

		}
	}

}
