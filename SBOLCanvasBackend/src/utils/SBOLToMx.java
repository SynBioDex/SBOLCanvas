package utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.StringWriter;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.Set;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.TransformerFactoryConfigurationError;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.sbolstandard.core2.Component;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.FunctionalComponent;
import org.sbolstandard.core2.Interaction;
import org.sbolstandard.core2.Location;
import org.sbolstandard.core2.MapsTo;
import org.sbolstandard.core2.ModuleDefinition;
import org.sbolstandard.core2.OrientationType;
import org.sbolstandard.core2.Participation;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLReader;
import org.sbolstandard.core2.SBOLValidationException;
import org.sbolstandard.core2.SequenceAnnotation;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;

import com.mxgraph.io.mxCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.util.mxConstants;
import com.mxgraph.view.mxGraph;

import data.GlyphInfo;
import data.InteractionInfo;

public class SBOLToMx extends Converter {

	public SBOLToMx() {
		glyphInfoDict = new Hashtable<String, GlyphInfo>();
	}
	
	public void toGraph(InputStream sbolStream, OutputStream graphStream)
			throws SBOLValidationException, IOException, SBOLConversionException, ParserConfigurationException,
			TransformerException, SAXException, URISyntaxException {
		// load the sbol file into the proper objects
		SBOLDocument document = SBOLReader.read(sbolStream);
		toGraph(document, graphStream);
	}

	public void toGraph(SBOLDocument document, OutputStream graphStream)
			throws IOException, ParserConfigurationException, TransformerException, SBOLValidationException,
			SAXException, URISyntaxException {

		document.setDefaultURIprefix(URI_PREFIX);

		// set up the graph and glyphdict
		mxGraph graph = new mxGraph();
		mxGraphModel model = (mxGraphModel) graph.getModel();
		model.setMaintainEdgeParent(false);
		mxCell cell0 = (mxCell) model.getCell("0");
		cell0.setValue(glyphInfoDict);
		
		layoutHelper = new LayoutHelper(document, graph);

		ModuleDefinition modDef = null;
		if (document.getRootModuleDefinitions().size() > 0) {
			modDef = document.getRootModuleDefinitions().iterator().next();
		}

		// top level component definitions
		Set<ComponentDefinition> compDefs = document.getComponentDefinitions();
		Set<ComponentDefinition> handledCompDefs = new HashSet<ComponentDefinition>();
		if (modDef != null) {
			handledCompDefs = createModuleView(document, graph, modDef);
		}

		// we don't want to create views for componentDefinitions handled in the module
		// definition (proteins)
		compDefs.removeAll(handledCompDefs);
		for (ComponentDefinition compDef : compDefs) {
			createComponentView(document, graph, compDef);
		}

		// convert the objects to the graph xml
		graphStream.write(encodeMxGraphObject(model).getBytes());
	}

	public void toSubGraph(InputStream sbolStream, OutputStream graphStream) throws SBOLValidationException,
			IOException, SBOLConversionException, SAXException, ParserConfigurationException,
			TransformerFactoryConfigurationError, TransformerException, URISyntaxException {
		SBOLDocument document = SBOLReader.read(sbolStream);
		toSubGraph(document, graphStream);
	}

	public void toSubGraph(SBOLDocument document, OutputStream graphStream)
			throws SAXException, IOException, ParserConfigurationException, SBOLValidationException,
			TransformerFactoryConfigurationError, TransformerException, URISyntaxException {
		// set up the graph and glyphdict
		mxGraph graph = new mxGraph();
		mxGraphModel model = (mxGraphModel) graph.getModel();
		model.setMaintainEdgeParent(false);
		mxCell cell0 = (mxCell) model.getCell("0");
		cell0.setValue(glyphInfoDict);

		layoutHelper = new LayoutHelper(document, graph);
		
		// top level component definition
		ComponentDefinition rootCompDef = document.getRootComponentDefinitions().iterator().next();

		graph.insertVertex((mxCell) model.getCell("1"), null, rootCompDef.getIdentity().toString(), 0, 0, 0, 0);

		Set<ComponentDefinition> compDefs = document.getComponentDefinitions();

		for (ComponentDefinition compDef : compDefs) {
			createComponentView(document, graph, compDef);
		}

		// convert the objects to the graph xml
		graphStream.write(encodeMxGraphObject(model).getBytes());
	}
	
	private Set<ComponentDefinition> createModuleView(SBOLDocument document, mxGraph graph, ModuleDefinition modDef)
			throws SAXException, IOException, ParserConfigurationException, SBOLValidationException,
			URISyntaxException {
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell1 = (mxCell) model.getCell("1");

		Set<ComponentDefinition> handledCompDefs = new HashSet<ComponentDefinition>();

		// create the root view cell
		// TODO pull the the module id when multiple modules are supported.
		mxCell rootViewCell = (mxCell) graph.insertVertex(cell1, "rootView", null, 0, 0, 0, 0, STYLE_MODULE_VIEW);

		// text boxes
		
		mxCell[] textBoxes = layoutHelper.getGraphicalObjects(modDef.getIdentity(), "textBox");
		if (textBoxes != null) {
			for (mxCell textBox : textBoxes) {
				if (textBox.getStyle() != null)
					textBox.setStyle(STYLE_TEXTBOX + ";" + textBox.getStyle());
				else
					textBox.setStyle(STYLE_TEXTBOX);
				model.add(rootViewCell, textBox, 0);
			}
		}

		// only non mapped FunctionalComponents represent top level strands so filter
		// them
		Set<FunctionalComponent> modDefFCs = modDef.getFunctionalComponents();
		Set<FunctionalComponent> notMappedFCs = modDef.getFunctionalComponents();
		HashMap<URI, URI> uriMaps = new HashMap<URI, URI>();
		for (FunctionalComponent funcComp : modDefFCs) {
			Set<MapsTo> mapsTos = funcComp.getMapsTos();
			if (mapsTos != null && mapsTos.size() > 0) {
				for (MapsTo mapsTo : mapsTos) {
					FunctionalComponent mappedFC = modDef.getFunctionalComponent(mapsTo.getLocalIdentity());
					notMappedFCs.remove(mappedFC);
					uriMaps.put(mapsTo.getLocalIdentity(), mapsTo.getRemoteIdentity());
				}
			}
		}

		// create the top level component definitions and proteins
		HashMap<String, mxCell> compToCell = new HashMap<String, mxCell>();
		for (FunctionalComponent funcComp : notMappedFCs) {
			ComponentDefinition compDef = funcComp.getDefinition();

			// proteins
			if (!compDef.getTypes().contains(ComponentDefinition.DNA_REGION)) {
				// proteins don't have a mapping, but we need it for interactions

				mxCell protien = layoutHelper.getGraphicalObject(modDef.getIdentity(), funcComp.getDisplayId());
				if (protien != null) {
					if (protien.getStyle() != null)
						protien.setStyle(STYLE_MOLECULAR_SPECIES + ";" + protien.getStyle());
					else
						protien.setStyle(STYLE_MOLECULAR_SPECIES);
					protien.setValue(compDef.getIdentity().toString());
					model.add(rootViewCell, protien, 0);
				} else {
					protien = (mxCell) graph.insertVertex(rootViewCell, null, compDef.getIdentity().toString(), 0, 0, 0,
							0, STYLE_MOLECULAR_SPECIES);
				}
				compToCell.put(funcComp.getIdentity() + "_" + compDef.getIdentity(), protien);
				GlyphInfo info = genGlyphInfo(compDef);
				glyphInfoDict.put(info.getFullURI(), info);
				handledCompDefs.add(compDef);
				continue;
			}

			// add the container cell and backbone
			mxCell container = layoutHelper.getGraphicalObject(modDef.getIdentity(), funcComp.getDisplayId());
			if (container != null) {
				if (container.getStyle() != null)
					container.setStyle(STYLE_CIRCUIT_CONTAINER + ";" + container.getStyle());
				else
					container.setStyle(STYLE_CIRCUIT_CONTAINER);
				container.setValue(compDef.getIdentity().toString());
				model.add(rootViewCell, container, 0);
			} else {
				container = (mxCell) graph.insertVertex(rootViewCell, null, compDef.getIdentity().toString(), 0, 0, 0,
						0, STYLE_CIRCUIT_CONTAINER);
			}
			mxCell backbone = layoutHelper.getGraphicalObject(compDef.getIdentity(), compDef.getDisplayId());
			if (backbone != null) {
				if (backbone.getStyle() != null)
					backbone.setStyle(STYLE_BACKBONE + ";" + backbone.getStyle());
				else
					backbone.setStyle(STYLE_BACKBONE);
				model.add(container, backbone, 0);
			} else {
				backbone = (mxCell) graph.insertVertex(container, null, null, 0, 0, 0, 0, STYLE_BACKBONE);
			}
			GlyphInfo info = genGlyphInfo(compDef);
			glyphInfoDict.put(info.getFullURI(), info);

			// glyphs
			Component[] glyphArray = compDef.getSortedComponents().toArray(new Component[0]);
			double maxX = 0;
			for (int glyphIndex = 0; glyphIndex < glyphArray.length; glyphIndex++) {
				Component glyphComponent = glyphArray[glyphIndex];
				mxCell glyphCell = layoutHelper.getGraphicalObject(compDef.getIdentity(), glyphComponent.getDisplayId());
				if (glyphCell != null) {
					glyphCell.setValue(glyphComponent.getDefinition().getIdentity().toString());
					if (glyphCell.getStyle() != null)
						glyphCell.setStyle(STYLE_SEQUENCE_FEATURE + ";" + glyphCell.getStyle());
					else
						glyphCell.setStyle(STYLE_SEQUENCE_FEATURE);
					model.add(container, glyphCell, glyphIndex);
				} else {
					glyphCell = (mxCell) graph.insertVertex(container, null,
							glyphComponent.getDefinition().getIdentity().toString(), maxX++, 0, 0, 0,
							STYLE_SEQUENCE_FEATURE);
				}

				// style filp
				SequenceAnnotation seqAnn = compDef.getSequenceAnnotation(glyphComponent);
				if (seqAnn != null) {
					Location loc = seqAnn.getLocations().iterator().next();
					if (loc.getOrientation() == OrientationType.REVERSECOMPLEMENT) {
						graph.setCellStyles(mxConstants.STYLE_DIRECTION, "west", new Object[] { glyphCell });
					}
				}

				// store the cell so we can use it in interactions
				for (MapsTo mapsTo : funcComp.getMapsTos()) {
					if (mapsTo.getLocalDefinition().equals(glyphComponent.getDefinition())) {
						compToCell.put(mapsTo.getLocalIdentity() + "_" + glyphComponent.getIdentity(), glyphCell);
						break;
					}
				}
			}
		}

		// interactions
		Set<Interaction> interactions = modDef.getInteractions();
		for (Interaction interaction : interactions) {
			mxCell edge = layoutHelper.getGraphicalObject(modDef.getIdentity(), interaction.getDisplayId());
			if (edge != null) {
				if (edge.getStyle() != null)
					edge.setStyle(STYLE_INTERACTION + ";" + edge.getStyle());
				else
					edge.setStyle(STYLE_INTERACTION);
				edge = (mxCell) model.add(rootViewCell, edge, 0);
			} else {
				edge = (mxCell) graph.insertEdge(rootViewCell, null, null, null, null);
			}
			edge.setValue(genInteractionInfo(interaction));

			URI targetType = getParticipantType(false, interaction.getTypes());
			URI sourceType = getParticipantType(true, interaction.getTypes());

			Participation[] participations = interaction.getParticipations().toArray(new Participation[0]);
			for (int i = 0; i < participations.length; i++) {
				// theoretically more than 2, but we currently only support 2
				if (participations[i].getRoles().contains(sourceType)) {
					URI mappedURI = uriMaps.get(participations[i].getParticipant().getIdentity());
					if (mappedURI == null)
						mappedURI = participations[i].getParticipant().getDefinition().getIdentity();
					mxCell source = compToCell.get(participations[i].getParticipant().getIdentity() + "_" + mappedURI);
					edge.setSource(source);
				} else if (participations[i].getRoles().contains(targetType)) {
					URI mappedURI = uriMaps.get(participations[i].getParticipant().getIdentity());
					if (mappedURI == null)
						mappedURI = participations[i].getParticipant().getDefinition().getIdentity();
					mxCell target = compToCell.get(participations[i].getParticipant().getIdentity() + "_" + mappedURI);
					edge.setTarget(target);
				}
			}
		}

		return handledCompDefs;
	}

	private void createComponentView(SBOLDocument document, mxGraph graph, ComponentDefinition compDef)
			throws SAXException, IOException, ParserConfigurationException, SBOLValidationException,
			URISyntaxException {
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell1 = (mxCell) model.getCell("1");

		// create the glyphInfo and store it in the dictionary
		GlyphInfo info = genGlyphInfo(compDef);
		glyphInfoDict.put(info.getFullURI(), info);

		// create the top view cell
		mxCell viewCell = (mxCell) graph.insertVertex(cell1, compDef.getIdentity().toString(), null, 0, 0, 0, 0,
				STYLE_COMPONENT_VIEW);

		// if there are text boxes add them
		mxCell[] textBoxes = layoutHelper.getGraphicalObjects(compDef.getIdentity(), "textBox");
		if (textBoxes != null) {
			for (mxCell textBox : textBoxes) {
				if (textBox.getStyle() != null)
					textBox.setStyle(STYLE_TEXTBOX + ";" + textBox.getStyle());
				else
					textBox.setStyle(STYLE_TEXTBOX);
				model.add(viewCell, textBox, 0);
			}
		}

		// add the container cell and backbone
		// TODO somehow merge the container and backbone into one graphical layout tied
		// to the component definition
		mxCell container = layoutHelper.getGraphicalObject(compDef.getIdentity(), "container");
		if (container != null) {
			if(container.getStyle() != null)
				container.setStyle(STYLE_CIRCUIT_CONTAINER+";"+container.getStyle());
			else
				container.setStyle(STYLE_CIRCUIT_CONTAINER);
			container.setValue(compDef.getIdentity().toString());
			model.add(viewCell, container, 0);
		} else {
			container = (mxCell) graph.insertVertex(viewCell, null, compDef.getIdentity().toString(), 0, 0, 0, 0,
					STYLE_CIRCUIT_CONTAINER);
		}

		mxCell backbone = layoutHelper.getGraphicalObject(compDef.getIdentity(), "backbone");
		if (backbone != null) {
			if (backbone.getStyle() != null)
				backbone.setStyle(STYLE_BACKBONE + ";" + backbone.getStyle());
			else
				backbone.setStyle(STYLE_BACKBONE);
			model.add(container, backbone, 0);
		} else {
			backbone = (mxCell) graph.insertVertex(container, null, null, 0, 0, 0, 0, STYLE_BACKBONE);
		}

		// glyphs
		Component[] glyphArray = compDef.getSortedComponents().toArray(new Component[0]);
		for (int glyphIndex = 0; glyphIndex < glyphArray.length; glyphIndex++) {
			Component glyphComponent = glyphArray[glyphIndex];
			mxCell glyphCell = layoutHelper.getGraphicalObject(compDef.getIdentity(), glyphComponent.getDisplayId());
			double maxX = 0;
			if (glyphCell != null) {
				maxX = glyphCell.getGeometry().getX();
				if(glyphCell.getStyle() != null)
					glyphCell.setStyle(STYLE_SEQUENCE_FEATURE+";"+glyphCell.getStyle());
				else
					glyphCell.setStyle(STYLE_SEQUENCE_FEATURE);
				glyphCell.setValue(glyphComponent.getDefinition().getIdentity().toString());
				model.add(container, glyphCell, glyphIndex);
			} else {
				glyphCell = (mxCell) graph.insertVertex(container, null,
						glyphComponent.getDefinition().getIdentity().toString(), maxX++, 0, 0, 0,
						STYLE_SEQUENCE_FEATURE);
			}

			// style flip
			SequenceAnnotation seqAnn = compDef.getSequenceAnnotation(glyphComponent);
			if (seqAnn != null) {
				Location loc = seqAnn.getLocations().iterator().next();
				if (loc.getOrientation() == OrientationType.REVERSECOMPLEMENT) {
					graph.setCellStyles(mxConstants.STYLE_DIRECTION, "west", new Object[] { glyphCell });
				}
			}

		}
	}
	
	private GlyphInfo genGlyphInfo(ComponentDefinition glyphCD) {
		GlyphInfo glyphInfo = new GlyphInfo();
		glyphInfo.setDescription(glyphCD.getDescription());
		glyphInfo.setDisplayID(glyphCD.getDisplayId());
		glyphInfo.setName(glyphCD.getName());

		// There will only be one visual related role
		ArrayList<String> otherRoles = new ArrayList<String>();
		for (URI glyphRole : glyphCD.getRoles()) {
			if (SBOLData.roles.containsValue(glyphRole)) {
				glyphInfo.setPartRole(SBOLData.roles.getKey(glyphRole));
			} else if (SBOLData.refinements.containsValue(glyphRole)) {
				glyphInfo.setPartRole(SBOLData.roles.getKey(SBOLData.parents.get(glyphRole)));
				glyphInfo.setPartRefine(SBOLData.refinements.getKey(glyphRole));
			} else {
				otherRoles.add(glyphRole.toString());
			}
		}
		glyphInfo.setOtherRoles(otherRoles.toArray(new String[0]));

		// There will only be one important type
		ArrayList<String> otherTypes = new ArrayList<String>();
		for (URI glyphType : glyphCD.getTypes()) {
			if (SBOLData.types.containsValue(glyphType)) {
				glyphInfo.setPartType(SBOLData.types.getKey(glyphType));
			} else {
				otherTypes.add(glyphType.toString());
			}
		}
		glyphInfo.setOtherTypes(otherTypes.toArray(new String[0]));

		if (glyphCD.getSequences().size() > 0)
			glyphInfo.setSequence(glyphCD.getSequences().iterator().next().getElements());
		glyphInfo.setVersion(glyphCD.getVersion());
		String identity = glyphCD.getIdentity().toString();
		int lastIndex = 0;
		if (glyphInfo.getVersion() != null)
			lastIndex = identity.lastIndexOf(glyphInfo.getDisplayID() + "/" + glyphInfo.getVersion());
		else
			lastIndex = identity.lastIndexOf(glyphInfo.getDisplayID());
		glyphInfo.setUriPrefix(identity.substring(0, lastIndex - 1));
		// glyphInfo.setUriPrefix(uriPrefix.substring(0, uriPrefix.length() - 1));
		return glyphInfo;
	}
	
	private InteractionInfo genInteractionInfo(Interaction interaction) {
		InteractionInfo info = new InteractionInfo();
		info.setDisplayID(interaction.getDisplayId());
		info.setInteractionType(SBOLData.interactions.getKey(interaction.getTypes().iterator().next()));
		return info;
	}
	
	private String encodeMxGraphObject(Object obj) throws TransformerFactoryConfigurationError, TransformerException {
		mxCodec codec = new mxCodec();
		Node cellNode = codec.encode(obj);
		StringWriter sw = new StringWriter();
		Transformer t = TransformerFactory.newInstance().newTransformer();
		t.setOutputProperty(OutputKeys.OMIT_XML_DECLARATION, "yes");
		t.setOutputProperty(OutputKeys.INDENT, "no");
		t.transform(new DOMSource(cellNode), new StreamResult(sw));
		return sw.toString();
	}
	
//	private Object decodeMxGraphObject(String xml) throws SAXException, IOException, ParserConfigurationException {
//		Document stringDoc = mxXmlUtils.parseXml(xml);
//		mxCodec codec = new mxCodec(stringDoc);
//		Node node = stringDoc.getDocumentElement();
//		Object obj = codec.decode(node);
//		return obj;
//	}
	
}
