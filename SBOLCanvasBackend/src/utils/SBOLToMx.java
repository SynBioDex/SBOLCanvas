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
import java.util.List;
import java.util.Set;
import java.util.Stack;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.TransformerFactoryConfigurationError;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.Component;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.ComponentInstance;
import org.sbolstandard.core2.FunctionalComponent;
import org.sbolstandard.core2.Identified;
import org.sbolstandard.core2.Interaction;
import org.sbolstandard.core2.Location;
import org.sbolstandard.core2.MapsTo;
import org.sbolstandard.core2.ModuleDefinition;
import org.sbolstandard.core2.Module;
import org.sbolstandard.core2.OrientationType;
import org.sbolstandard.core2.Participation;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLReader;
import org.sbolstandard.core2.SBOLValidationException;
import org.sbolstandard.core2.Sequence;
import org.sbolstandard.core2.SequenceAnnotation;
import org.w3c.dom.Node;
import org.xml.sax.SAXException;

import com.mxgraph.io.mxCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.util.mxConstants;
import com.mxgraph.view.mxGraph;

import data.CanvasAnnotation;
import data.Info;
import data.GlyphInfo;
import data.InteractionInfo;
import data.ModuleInfo;

public class SBOLToMx extends Converter {

	HashMap<ComponentInstance, mxCell> compToCell;
	HashMap<FunctionalComponent, ComponentInstance> mappings;

	public SBOLToMx() {
		infoDict = new Hashtable<String, Info>();
		compToCell = new HashMap<ComponentInstance, mxCell>();
		mappings = new HashMap<FunctionalComponent, ComponentInstance>();
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
		cell0.setValue(infoDict);

		layoutHelper = new LayoutHelper(document, graph);

		ModuleDefinition rootModDef = null;
		if (document.getRootModuleDefinitions().size() > 0) {
			rootModDef = document.getRootModuleDefinitions().iterator().next();
			graph.insertVertex((mxCell) model.getCell("1"), null, rootModDef.getIdentity().toString(), 0, 0, 0, 0);
		}

		if (rootModDef == null) {
			ComponentDefinition rootCompDef = document.getRootComponentDefinitions().iterator().next();
			graph.insertVertex((mxCell) model.getCell("1"), null, rootCompDef.getIdentity().toString(), 0, 0, 0, 0);
		}

		// top level component definitions
		Set<ComponentDefinition> compDefs = getComponentDefinitions(document);
		Set<ComponentDefinition> handledCompDefs = new HashSet<ComponentDefinition>();
		for (ModuleDefinition modDef : document.getModuleDefinitions()) {
			handledCompDefs.addAll(createModuleView(document, graph, modDef));
		}
		
		// link interactions after all modules have been created, as the internal references can cross modules
		for(ModuleDefinition modDef : document.getModuleDefinitions()) {
			setupModuleInteractions(document, graph, modDef);
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

	private Set<ComponentDefinition> createModuleView(SBOLDocument document, mxGraph graph, ModuleDefinition modDef)
			throws SAXException, IOException, ParserConfigurationException, SBOLValidationException,
			URISyntaxException {
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell1 = (mxCell) model.getCell("1");

		// create the moduleInfo and store it in the dictionary
		ModuleInfo modInfo = genModuleInfo(modDef);
		infoDict.put(modInfo.getFullURI(), modInfo);

		Set<ComponentDefinition> handledCompDefs = new HashSet<ComponentDefinition>();

		// create the root view cell
		mxCell rootViewCell = (mxCell) graph.insertVertex(cell1, modDef.getIdentity().toString(), null, 0, 0, 0, 0,
				STYLE_MODULE_VIEW);

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
		for (FunctionalComponent funcComp : modDefFCs) {
			Set<MapsTo> mapsTos = funcComp.getMapsTos();
			if (mapsTos != null && mapsTos.size() > 0) {
				for (MapsTo mapsTo : mapsTos) {
					FunctionalComponent mappedFC = modDef.getFunctionalComponent(mapsTo.getLocalIdentity());
					notMappedFCs.remove(mappedFC);
					mappings.put((FunctionalComponent) mapsTo.getLocal(), (ComponentInstance) mapsTo.getRemote());
				}
			}
		}
		// modules contain mapsTos as well
		Set<Module> modules = modDef.getModules();
		for (Module module : modules) {
			Set<MapsTo> mapsTos = module.getMapsTos();
			if (mapsTos != null && mapsTos.size() > 0) {
				for (MapsTo mapsTo : mapsTos) {
					FunctionalComponent mappedFC = modDef.getFunctionalComponent(mapsTo.getLocalIdentity());
					notMappedFCs.remove(mappedFC);
					mappings.put((FunctionalComponent) mapsTo.getLocal(), (FunctionalComponent) mapsTo.getRemote());
				}
			}
		}

		// create the top level component definitions and proteins
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
				compToCell.put(funcComp, protien);
				GlyphInfo info = genGlyphInfo(compDef);
				infoDict.put(info.getFullURI(), info);
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
			compToCell.put(funcComp, container);
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
			infoDict.put(info.getFullURI(), info);

			// glyphs
			Component[] glyphArray = compDef.getSortedComponents().toArray(new Component[0]);
			double maxX = 0;
			for (int glyphIndex = 0; glyphIndex < glyphArray.length; glyphIndex++) {
				Component glyphComponent = glyphArray[glyphIndex];
				mxCell glyphCell = layoutHelper.getGraphicalObject(compDef.getIdentity(),
						glyphComponent.getDisplayId());
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
						compToCell.put((FunctionalComponent) mapsTo.getLocal(), glyphCell);
						break;
					}
				}
			}
		}

		// create modules
		for (Module module : modDef.getModules()) {
			mxCell moduleCell = layoutHelper.getGraphicalObject(modDef.getIdentity(), module.getDisplayId());
			if (moduleCell != null) {
				moduleCell.setValue(module.getDefinition().getIdentity().toString());
				if (moduleCell.getStyle() != null)
					moduleCell.setStyle(STYLE_MODULE + ";" + moduleCell.getStyle());
				else
					moduleCell.setStyle(STYLE_MODULE);
				model.add(rootViewCell, moduleCell, 0);
			} else {
				moduleCell = (mxCell) graph.insertVertex(rootViewCell, null,
						module.getDefinition().getIdentity().toString(), 0, 0, 0, 0, STYLE_MODULE);
			}

			// store the cell so we can use it in interactions
			for (MapsTo mapsTo : module.getMapsTos()) {
				compToCell.put((FunctionalComponent) mapsTo.getLocal(), moduleCell);
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
		infoDict.put(info.getFullURI(), info);

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
		mxCell container = layoutHelper.getGraphicalObject(compDef.getIdentity(), "container");
		if (container != null) {
			if (container.getStyle() != null)
				container.setStyle(STYLE_CIRCUIT_CONTAINER + ";" + container.getStyle());
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
				if (glyphCell.getStyle() != null)
					glyphCell.setStyle(STYLE_SEQUENCE_FEATURE + ";" + glyphCell.getStyle());
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

	private void setupModuleInteractions(SBOLDocument document, mxGraph graph, ModuleDefinition modDef) {
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell rootViewCell = (mxCell) model.getCell(modDef.getIdentity().toString());

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
					mxCell source = compToCell.get(participations[i].getParticipant());
					edge.setSource(source);
					if (source.getStyle().contains(STYLE_MODULE)) {
						mxCell referenced = compToCell.get(mappings.get(participations[i].getParticipant()));
						((InteractionInfo) edge.getValue()).setFromURI(referenced.getValue()+"_"+referenced.getId());
					}
				} else if (participations[i].getRoles().contains(targetType)) {
					mxCell target = compToCell.get(participations[i].getParticipant());
					edge.setTarget(target);
					if (target.getStyle().contains(STYLE_MODULE)) {
						mxCell referenced = compToCell.get(mappings.get(participations[i].getParticipant()));
						((InteractionInfo) edge.getValue()).setToURI(referenced.getValue()+"_"+referenced.getId());
					}
				}
			}
		}
	}

	private ModuleInfo genModuleInfo(ModuleDefinition modDef) {
		ModuleInfo moduleInfo = new ModuleInfo();
		moduleInfo.setDescription(modDef.getDescription());
		moduleInfo.setDisplayID(modDef.getDisplayId());
		moduleInfo.setName(modDef.getName());
		moduleInfo.setVersion(modDef.getVersion());
		moduleInfo.setUriPrefix(getURIPrefix(modDef));

		return moduleInfo;
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

		if (glyphCD.getSequences().size() > 0) {
			Sequence sequence = glyphCD.getSequences().iterator().next();
			glyphInfo.setSequence(sequence.getElements());
			glyphInfo.setSequenceURI(sequence.getIdentity().toString());
		}
		glyphInfo.setVersion(glyphCD.getVersion());
		glyphInfo.setUriPrefix(getURIPrefix(glyphCD));

		if (glyphCD.getWasDerivedFroms() != null && glyphCD.getWasDerivedFroms().size() > 0) {
			String[] derivedFroms = new String[glyphCD.getWasDerivedFroms().size()];
			int index = 0;
			for (URI derivedFrom : glyphCD.getWasDerivedFroms()) {
				derivedFroms[index] = derivedFrom.toString();
				index++;
			}
			glyphInfo.setDerivedFroms(derivedFroms);
		}

		if (glyphCD.getWasGeneratedBys() != null && glyphCD.getWasGeneratedBys().size() > 0) {
			String[] generatedBys = new String[glyphCD.getWasGeneratedBys().size()];
			int index = 0;
			for (URI generatedBy : glyphCD.getWasGeneratedBys()) {
				generatedBys[index] = generatedBy.toString();
				index++;
			}
			glyphInfo.setGeneratedBys(generatedBys);
		}

		glyphInfo.setAnnotations(convertSBOLAnnotations(glyphCD.getAnnotations()));
		return glyphInfo;
	}

	private InteractionInfo genInteractionInfo(Interaction interaction) {
		InteractionInfo info = new InteractionInfo();
		info.setDisplayID(interaction.getDisplayId());
		info.setInteractionType(SBOLData.interactions.getKey(interaction.getTypes().iterator().next()));
		return info;
	}

	/**
	 * Returns all the component definitions that this document should contain,
	 * including ones obtained from registries
	 * 
	 * @return
	 */
	private static Set<ComponentDefinition> getComponentDefinitions(SBOLDocument document) {
		// scan through components to ensure we have the correct registries set up
		// and set up a component definition set as document.getComponentDefinitions
		// doesn't give us all the dependents
		Set<ComponentDefinition> compDefs = new HashSet<ComponentDefinition>();
		Stack<ComponentDefinition> compDefStack = new Stack<ComponentDefinition>();
		compDefStack.addAll(document.getComponentDefinitions());
		while (compDefStack.size() > 0) {
			ComponentDefinition compDef = compDefStack.pop();
			if (compDefs.contains(compDef))
				continue;
			compDefs.add(compDef);
			for (Component comp : compDef.getComponents()) {
				for (String registry : SBOLData.registries) {
					if (comp.getDefinitionURI().toString().contains(registry)) {
						document.addRegistry(registry);
						compDefStack.push(document.getComponentDefinition(comp.getDefinitionURI()));
						break;
					}
				}
			}
		}

		return compDefs;
	}

	private static CanvasAnnotation[] convertSBOLAnnotations(List<Annotation> annotations) {
		List<CanvasAnnotation> canvasAnnotations = new ArrayList<CanvasAnnotation>();
		for (Annotation annotation : annotations) {
			CanvasAnnotation canvasAnn = new CanvasAnnotation();
			canvasAnn.setQName(annotation.getQName());
			if (annotation.getStringValue() != null) {
				canvasAnn.setStringValue(annotation.getStringValue());
			} else if (annotation.getURIValue() != null) {
				canvasAnn.setUriValue(annotation.getURIValue());
			} else if (annotation.getAnnotations() != null) {
				canvasAnn.setAnnotations(convertSBOLAnnotations(annotation.getAnnotations()));
			}
			canvasAnnotations.add(canvasAnn);
		}
		return canvasAnnotations.toArray(new CanvasAnnotation[0]);
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

	private String getURIPrefix(Identified identified) {
		int lastIndex = 0;
		String identity = identified.getIdentity().toString();
		if (identified.getVersion() != null) {
			lastIndex = identity.lastIndexOf(identified.getDisplayId() + "/" + identified.getVersion());
		} else {
			lastIndex = identity.lastIndexOf(identified.getDisplayId());
		}
		return identity.substring(0, lastIndex - 1);
	}

//	private Object decodeMxGraphObject(String xml) throws SAXException, IOException, ParserConfigurationException {
//		Document stringDoc = mxXmlUtils.parseXml(xml);
//		mxCodec codec = new mxCodec(stringDoc);
//		Node node = stringDoc.getDocumentElement();
//		Object obj = codec.decode(node);
//		return obj;
//	}

}
