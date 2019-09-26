package utils;

import java.io.OutputStream;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Set;
import java.util.TreeSet;

import javax.xml.namespace.QName;

import org.sbolstandard.core2.AccessType;
import org.sbolstandard.core2.Component;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.OrientationType;
import org.sbolstandard.core2.RestrictionType;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLValidationException;
import org.sbolstandard.core2.SBOLWriter;
import org.sbolstandard.core2.Sequence;
import org.sbolstandard.core2.SequenceAnnotation;
import org.sbolstandard.core2.SequenceOntology;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import data.GlyphInfo;
import data.MxCell;
import data.MxGeometry;

public class Converter {

	public static void toSBOL(Document graph, OutputStream body) {
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
				cell.getInfo().setDisplayID("cd"+cell.getId());
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
		String uriPrefix = "https://sbolcanvas.org/";
		String annPrefix = "mxGraph";
		SBOLDocument document = new SBOLDocument();
		document.setDefaultURIprefix(uriPrefix);
		document.setComplete(true);
		document.setCreateDefaults(true);

		try {
			// create the top level component definitions, aka strands
			for (MxCell backboneCell : backbones.values()) {
				MxCell containerCell = containers.get(backboneCell.getParent());
				ComponentDefinition backboneCD = document.createComponentDefinition(backboneCell.getInfo().getDisplayID(),
						ComponentDefinition.DNA_REGION);
				backboneCD.addRole(SequenceOntology.ENGINEERED_REGION);

				// container annotations
				backboneCD.createAnnotation(new QName(uriPrefix, "containerCellID", annPrefix), containerCell.getId());
				backboneCD.createAnnotation(new QName(uriPrefix, "containerGeometryX", annPrefix),
						containerCell.getGeometry().getX());
				backboneCD.createAnnotation(new QName(uriPrefix, "containerGeometryY", annPrefix),
						containerCell.getGeometry().getY());
				backboneCD.createAnnotation(new QName(uriPrefix, "containerGeometryWidth", annPrefix),
						containerCell.getGeometry().getWidth());
				backboneCD.createAnnotation(new QName(uriPrefix, "containerGeometryHeight", annPrefix),
						containerCell.getGeometry().getHeight());

				// backbone geometry
				backboneCD.createAnnotation(new QName(uriPrefix, "backboneGeometryX", annPrefix),
						backboneCell.getGeometry().getX());
				backboneCD.createAnnotation(new QName(uriPrefix, "backboneGeometryY", annPrefix),
						backboneCell.getGeometry().getY());
				backboneCD.createAnnotation(new QName(uriPrefix, "backboneGeometryWidth", annPrefix),
						backboneCell.getGeometry().getWidth());
				backboneCD.createAnnotation(new QName(uriPrefix, "backboneGeometryHeight", annPrefix),
						backboneCell.getGeometry().getHeight());

				// create the things needed for components
				Component previous = null;
				int count = 0;
				int start = 0, end = 0;
				for (MxCell glyphCell : glyphSets.get(containerCell.getId())) {

					// component definition
					ComponentDefinition componentCD = document.createComponentDefinition(
							glyphCell.getInfo().getDisplayID(), SBOLData.types.get(glyphCell.getInfo().getPartType()));
					if (glyphCell.getInfo().getPartRefine() == null || glyphCell.getInfo().getPartRefine().equals("")) {
						componentCD.addRole(SBOLData.roles.get(glyphCell.getInfo().getPartRole()));
					} else {
						componentCD.addRole(SBOLData.refinements.get(glyphCell.getInfo().getPartRefine()));
					}
					componentCD.setName(glyphCell.getInfo().getName());
					componentCD.setDescription(glyphCell.getInfo().getDescription());

					// component
					Component component = backboneCD.createComponent(
									glyphCell.getInfo().getDisplayID(), AccessType.PUBLIC, componentCD.getDisplayId());

					// component sequence
					if (glyphCell.getInfo().getSequence() != null) {
						Sequence seq = document.createSequence(componentCD.getDisplayId() + "Sequence",
								glyphCell.getInfo().getSequence(), Sequence.IUPAC_DNA);
						componentCD.addSequence(seq.getIdentity());
					}

					// cell annotation
					component.createAnnotation(new QName(uriPrefix, "cellID", annPrefix), glyphCell.getId());
					component.createAnnotation(new QName(uriPrefix, "cellStyle", annPrefix), glyphCell.getStyle());
					component.createAnnotation(new QName(uriPrefix, "cellVertex", annPrefix), glyphCell.getVertex());
					component.createAnnotation(new QName(uriPrefix, "cellConnectable", annPrefix),
							glyphCell.isConnectable());

					// geometry annotation
					component.createAnnotation(new QName(uriPrefix, "geometryX", annPrefix),
							glyphCell.getGeometry().getX());
					component.createAnnotation(new QName(uriPrefix, "geometryY", annPrefix), glyphCell.getGeometry().getY());
					component.createAnnotation(new QName(uriPrefix, "geometryWidth", annPrefix),
							glyphCell.getGeometry().getWidth());
					component.createAnnotation(new QName(uriPrefix, "geometryHeight", annPrefix),
							glyphCell.getGeometry().getHeight());

					// sequence constraints
					if (previous != null) {
						backboneCD.createSequenceConstraint(backboneCD.getDisplayId()+"Constraint" + count,
								RestrictionType.PRECEDES, previous.getIdentity(), component.getIdentity());
						previous = component;
					}

					// container sequence
					start = end + 1;
					end = start + glyphCell.getInfo().getSequence().length()-1;
					SequenceAnnotation annotation = backboneCD.createSequenceAnnotation(backboneCD.getDisplayId()+"Annotation" + count,
							"location" + count, start, end, OrientationType.INLINE);
					annotation.setComponent(component.getIdentity());
					
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

	public static String toGraph(String sbol) {
		
		return null;

	}

}
