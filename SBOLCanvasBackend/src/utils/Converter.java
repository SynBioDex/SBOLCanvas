package utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Set;
import java.util.TreeSet;

import javax.xml.namespace.QName;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.sbolstandard.core2.AccessType;
import org.sbolstandard.core2.Component;
import org.sbolstandard.core2.ComponentDefinition;
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
import org.xml.sax.SAXException;

import data.GlyphInfo;
import data.MxCell;
import data.MxGeometry;

public class Converter {

	static String uriPrefix = "https://sbolcanvas.org/";
	static String annPrefix = "mxGraph";

	public static void toSBOL(InputStream graphStream, OutputStream body) {
		// convert the stream to a document
		Document graph = null;
		try {
			DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
			DocumentBuilder builder = factory.newDocumentBuilder();
			graph = builder.parse(graphStream);
		} catch (SAXException | IOException | ParserConfigurationException e1) {
			e1.printStackTrace();
		}

		// sorts cells from visual left to right
		Comparator<MxCell> cellComparator = new Comparator<MxCell>() {

			// The x position implies the order on the strand
			@Override
			public int compare(MxCell o1, MxCell o2) {
				return o1.getGeometry().getX() < o2.getGeometry().getX() ? -1 : 1;
			}

		};

		// create objects from the document
		HashMap<Integer, MxCell> containers = new HashMap<Integer, MxCell>();
		HashMap<Integer, MxCell> backbones = new HashMap<Integer, MxCell>();
		HashMap<Integer, Set<MxCell>> glyphSets = new HashMap<Integer, Set<MxCell>>();

		graph.normalize();
		NodeList nList = graph.getElementsByTagName("mxCell");
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
				cell.setInfo(info);
			}

			if (cell.getStyle().contains("circuitContainer")) {
				containers.put(cell.getId(), cell);
			} else if (cell.getStyle().contains("backbone")) {
				// TODO remove me when the user can set the displayID
				cell.setInfo(new GlyphInfo());
				cell.getInfo().setDisplayID("cd" + cell.getId());
				backbones.put(cell.getId(), cell);
			} else if (cell.getStyle().contains("glyph")) {
				if (glyphSets.get(cell.getParent()) != null) {
					glyphSets.get(cell.getParent()).add(cell);
				} else {
					TreeSet<MxCell> set = new TreeSet<MxCell>(cellComparator);
					set.add(cell);
					glyphSets.put(cell.getParent(), set);
				}
			}
		}

		// create the document
		SBOLDocument document = new SBOLDocument();
		document.setDefaultURIprefix(uriPrefix);
		document.setComplete(true);
		document.setCreateDefaults(true);

		try {
			// create the top level component definitions, aka strands
			for (MxCell backboneCell : backbones.values()) {
				MxCell containerCell = containers.get(backboneCell.getParent());
				ComponentDefinition backboneCD = document.createComponentDefinition(
						backboneCell.getInfo().getDisplayID(), ComponentDefinition.DNA_REGION);
				backboneCD.addRole(SequenceOntology.ENGINEERED_REGION);

				// container annotations
				backboneCD.createAnnotation(new QName(uriPrefix, "Cid", annPrefix), containerCell.getId());
				backboneCD.createAnnotation(new QName(uriPrefix, "Cvertex", annPrefix), containerCell.isVertex());
				backboneCD.createAnnotation(new QName(uriPrefix, "Cconnectable", annPrefix), containerCell.isConnectable());
				backboneCD.createAnnotation(new QName(uriPrefix, "Cstyle", annPrefix), containerCell.getStyle());
				backboneCD.createAnnotation(new QName(uriPrefix, "Cx", annPrefix),
						containerCell.getGeometry().getX());
				backboneCD.createAnnotation(new QName(uriPrefix, "Cy", annPrefix),
						containerCell.getGeometry().getY());
				backboneCD.createAnnotation(new QName(uriPrefix, "Cwidth", annPrefix),
						containerCell.getGeometry().getWidth());
				backboneCD.createAnnotation(new QName(uriPrefix, "Cheight", annPrefix),
						containerCell.getGeometry().getHeight());

				// backbone geometry
				backboneCD.createAnnotation(new QName(uriPrefix, "Bid", annPrefix), backboneCell.getId());
				backboneCD.createAnnotation(new QName(uriPrefix, "Bvertex", annPrefix), backboneCell.isVertex());
				backboneCD.createAnnotation(new QName(uriPrefix, "Bconnectable", annPrefix), backboneCell.isConnectable());
				backboneCD.createAnnotation(new QName(uriPrefix, "Bstyle", annPrefix), backboneCell.getStyle());
				backboneCD.createAnnotation(new QName(uriPrefix, "Bx", annPrefix),
						backboneCell.getGeometry().getX());
				backboneCD.createAnnotation(new QName(uriPrefix, "By", annPrefix),
						backboneCell.getGeometry().getY());
				backboneCD.createAnnotation(new QName(uriPrefix, "Bwidth", annPrefix),
						backboneCell.getGeometry().getWidth());
				backboneCD.createAnnotation(new QName(uriPrefix, "Bheight", annPrefix),
						backboneCell.getGeometry().getHeight());

				// create the things needed for components
				Component previous = null;
				int count = 0;
				int start = 0, end = 0;
				for (MxCell glyphCell : glyphSets.get(containerCell.getId())) {

					// component definition
					ComponentDefinition componentCD = document.createComponentDefinition(
							glyphCell.getInfo().getDisplayID(), SBOLData.types.getValue(glyphCell.getInfo().getPartType()));
					if (glyphCell.getInfo().getPartRefine() == null || glyphCell.getInfo().getPartRefine().equals("")) {
						componentCD.addRole(SBOLData.roles.getValue(glyphCell.getInfo().getPartRole()));
					} else {
						componentCD.addRole(SBOLData.refinements.getValue(glyphCell.getInfo().getPartRefine()));
					}
					componentCD.setName(glyphCell.getInfo().getName());
					componentCD.setDescription(glyphCell.getInfo().getDescription());

					// component
					Component component = backboneCD.createComponent(glyphCell.getInfo().getDisplayID(),
							AccessType.PUBLIC, componentCD.getDisplayId());

					// component sequence
					if (glyphCell.getInfo().getSequence() != null || !glyphCell.getInfo().getSequence().equals("")) {
						Sequence seq = document.createSequence(componentCD.getDisplayId() + "Sequence",
								glyphCell.getInfo().getSequence(), Sequence.IUPAC_DNA);
						componentCD.addSequence(seq.getIdentity());
					}

					// cell annotation
					component.createAnnotation(new QName(uriPrefix, "id", annPrefix), glyphCell.getId());
					component.createAnnotation(new QName(uriPrefix, "style", annPrefix), glyphCell.getStyle());
					component.createAnnotation(new QName(uriPrefix, "vertex", annPrefix), glyphCell.isVertex());
					component.createAnnotation(new QName(uriPrefix, "connectable", annPrefix),
							glyphCell.isConnectable());

					// geometry annotation
					component.createAnnotation(new QName(uriPrefix, "x", annPrefix),
							glyphCell.getGeometry().getX());
					component.createAnnotation(new QName(uriPrefix, "y", annPrefix),
							glyphCell.getGeometry().getY());
					component.createAnnotation(new QName(uriPrefix, "width", annPrefix),
							glyphCell.getGeometry().getWidth());
					component.createAnnotation(new QName(uriPrefix, "height", annPrefix),
							glyphCell.getGeometry().getHeight());

					// sequence constraints
					if (previous != null) {
						backboneCD.createSequenceConstraint(backboneCD.getDisplayId() + "Constraint" + count,
								RestrictionType.PRECEDES, previous.getIdentity(), component.getIdentity());
						previous = component;
					}

					// container sequence
					if (glyphCell.getInfo().getSequence() != null && !glyphCell.getInfo().getSequence().equals("")) {
						start = end + 1;
						end = start + glyphCell.getInfo().getSequence().length() - 1;
						SequenceAnnotation annotation = backboneCD.createSequenceAnnotation(
								backboneCD.getDisplayId() + "Annotation" + count, "location" + count, start, end,
								OrientationType.INLINE);
						annotation.setComponent(component.getIdentity());
					}

					count++;
				}
			}

			// write to body
			SBOLWriter.setKeepGoing(true);
			SBOLWriter.write(document, body);

		} catch (SBOLValidationException | SBOLConversionException e) {
			e.printStackTrace();
		}
	}

	public static void toGraph(InputStream sbolStream, OutputStream mxGraphStream) {
		try {
			// sort the MxCell's by their id
			Comparator<MxCell> cellComparator = new Comparator<MxCell>() {

				@Override
				public int compare(MxCell o1, MxCell o2) {
					return o1.getId() - o2.getId();
				}

			};

			// load the sbol file into the proper objects
			SBOLDocument document = SBOLReader.read(sbolStream);
			Set<ComponentDefinition> backboneCDs = document.getRootComponentDefinitions();
			TreeSet<MxCell> cells = new TreeSet<MxCell>(cellComparator);

			// cells that need to be there for some reason
			MxCell first = new MxCell();
			first.setId(0);
			cells.add(first);
			MxCell second = new MxCell();
			second.setId(1);
			second.setParent(0);
			cells.add(second);

			// top level component definitions
			for (ComponentDefinition backboneCD : backboneCDs) {
				
				// container data
				MxCell containerCell = new MxCell();
				containerCell.setParent(1);
				containerCell.setId(backboneCD.getAnnotation(new QName(uriPrefix, "Cid", annPrefix)).getIntegerValue());
				containerCell.setVertex(backboneCD.getAnnotation(new QName(uriPrefix, "Cvertex", annPrefix)).getBooleanValue());
				containerCell.setConnectable(backboneCD.getAnnotation(new QName(uriPrefix, "Cconnectable", annPrefix)).getBooleanValue());
				containerCell.setStyle(backboneCD.getAnnotation(new QName(uriPrefix, "Cstyle", annPrefix)).getStringValue());
				
				// container geometry
				MxGeometry containerGeometry = new MxGeometry();
				containerGeometry.setX(backboneCD.getAnnotation(new QName(uriPrefix, "Cx", annPrefix)).getDoubleValue());
				containerGeometry.setY(backboneCD.getAnnotation(new QName(uriPrefix, "Cy", annPrefix)).getDoubleValue());
				containerGeometry.setWidth(backboneCD.getAnnotation(new QName(uriPrefix, "Cwidth", annPrefix)).getDoubleValue());
				containerGeometry.setHeight(backboneCD.getAnnotation(new QName(uriPrefix, "Cheight", annPrefix)).getDoubleValue());
				containerCell.setGeometry(containerGeometry);
				cells.add(containerCell);
				
				// backbone data
				MxCell backboneCell = new MxCell();
				backboneCell.setParent(containerCell.getId());
				backboneCell.setId(backboneCD.getAnnotation(new QName(uriPrefix, "Bid", annPrefix)).getIntegerValue());
				backboneCell.setVertex(backboneCD.getAnnotation(new QName(uriPrefix, "Bvertex", annPrefix)).getBooleanValue());
				backboneCell.setConnectable(backboneCD.getAnnotation(new QName(uriPrefix, "Bconnectable", annPrefix)).getBooleanValue());
				backboneCell.setStyle(backboneCD.getAnnotation(new QName(uriPrefix, "Bstyle", annPrefix)).getStringValue());
				
				// backbone geometry
				MxGeometry backboneGeometry = new MxGeometry();
				backboneGeometry.setX(backboneCD.getAnnotation(new QName(uriPrefix, "Bx", annPrefix)).getDoubleValue());
				backboneGeometry.setY(backboneCD.getAnnotation(new QName(uriPrefix, "By", annPrefix)).getDoubleValue());
				backboneGeometry.setWidth(backboneCD.getAnnotation(new QName(uriPrefix, "Bwidth", annPrefix)).getDoubleValue());
				backboneGeometry.setHeight(backboneCD.getAnnotation(new QName(uriPrefix, "Bheight", annPrefix)).getDoubleValue());
				backboneCell.setGeometry(backboneGeometry);
				cells.add(backboneCell);
				
				// glyphs
				for(Component glyphComponent : backboneCD.getComponents()) {
					
					// glyph data
					MxCell glyphCell = new MxCell();
					glyphCell.setParent(containerCell.getId());
					glyphCell.setId(glyphComponent.getAnnotation(new QName(uriPrefix, "id", annPrefix)).getIntegerValue());
					glyphCell.setVertex(glyphComponent.getAnnotation(new QName(uriPrefix, "vertex", annPrefix)).getBooleanValue());
					glyphCell.setConnectable(glyphComponent.getAnnotation(new QName(uriPrefix, "connectable", annPrefix)).getBooleanValue());
					glyphCell.setStyle(glyphComponent.getAnnotation(new QName(uriPrefix, "style", annPrefix)).getStringValue());
					
					// glyph geometry
					MxGeometry glyphGeometry = new MxGeometry();
					glyphGeometry.setX(glyphComponent.getAnnotation(new QName(uriPrefix, "x", annPrefix)).getDoubleValue());
					glyphGeometry.setY(glyphComponent.getAnnotation(new QName(uriPrefix, "y", annPrefix)).getDoubleValue());
					glyphGeometry.setWidth(glyphComponent.getAnnotation(new QName(uriPrefix, "width", annPrefix)).getDoubleValue());
					glyphGeometry.setHeight(glyphComponent.getAnnotation(new QName(uriPrefix, "height", annPrefix)).getDoubleValue());
					glyphCell.setGeometry(glyphGeometry);
					
					// glyph info
					GlyphInfo glyphInfo = new GlyphInfo();
					glyphInfo.setDescription(glyphComponent.getDescription());
					glyphInfo.setDisplayID(glyphComponent.getDisplayId());
					glyphInfo.setName(glyphComponent.getName());
					URI glyphRole = glyphComponent.getRoles().toArray(new URI[0])[0];
					if(SBOLData.roles.containsValue(glyphRole)) {
						glyphInfo.setPartRole(SBOLData.roles.getKey(glyphRole));
					}else {
						glyphInfo.setPartRole(SBOLData.roles.getKey(SBOLData.parents.get(glyphRole)));
						glyphInfo.setPartRefine(SBOLData.refinements.getKey(glyphRole));
					}
					URI glyphType = glyphComponent.getDefinition().getTypes().toArray(new URI[0])[0];
					glyphInfo.setPartType(SBOLData.types.getKey(glyphType));
					glyphInfo.setSequence(glyphComponent.getDefinition().getSequences().toArray(new String[0])[0]);
					glyphInfo.setVersion(glyphComponent.getVersion());
					glyphCell.setInfo(glyphInfo);
					cells.add(glyphCell);
					
				}
			}
			
			// convert the objects to the graph xml
			
			// convert the objects to an MxGraph
			
		} catch (SBOLValidationException | IOException | SBOLConversionException e) {
			e.printStackTrace();
		}
	}

}
