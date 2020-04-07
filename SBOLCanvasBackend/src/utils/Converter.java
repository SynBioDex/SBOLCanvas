package utils;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.StringWriter;
import java.net.URI;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;
import java.util.Set;

import javax.xml.namespace.QName;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.TransformerFactoryConfigurationError;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.sbolstandard.core2.AccessType;
import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.Component;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.DirectionType;
import org.sbolstandard.core2.FunctionalComponent;
import org.sbolstandard.core2.Interaction;
import org.sbolstandard.core2.MapsTo;
import org.sbolstandard.core2.ModuleDefinition;
import org.sbolstandard.core2.OrientationType;
import org.sbolstandard.core2.Participation;
import org.sbolstandard.core2.RefinementType;
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
import org.xml.sax.SAXException;

import com.mxgraph.io.mxCodec;
import com.mxgraph.io.mxCodecRegistry;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.model.mxGraphModel.Filter;
import com.mxgraph.util.mxUtils;
import com.mxgraph.util.mxXmlUtils;
import com.mxgraph.view.mxGraph;

import data.GlyphInfo;
import data.InteractionInfo;

public class Converter {

	static String uriPrefix = "https://sbolcanvas.org/";
	static String annPrefix = "SBOLCanvas";

	/**
	 * Filters mxCells that contain "textBox" in the style string
	 */
	static Filter textBoxFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains("textBox");
		}
	};

	/**
	 * Filters mxCells that contain "protein" in the style string
	 */
	static Filter proteinFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains("molecularSpeciesGlyph");
		}
	};

	/**
	 * Filters mxCells that contain "circuitContainer" in the style string
	 */
	static Filter containerFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains("circuitContainer");
		}
	};

	/**
	 * Filters mxCells that contain "backbone" in the style string
	 */
	static Filter backboneFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains("backbone");
		}
	};

	/**
	 * Filters mxCells that contain "sequenceFeatureGlyph" in the style string
	 */
	static Filter sequenceFeatureFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains("sequenceFeatureGlyph");
		}
	};

	static {
		// Necessary for encoding/decoding GlyphInfo and InteractionInfo
		mxCodecRegistry.addPackage("data");
	};

	private Hashtable<String, GlyphInfo> glyphInfoDict = new Hashtable<String, GlyphInfo>();

	@SuppressWarnings("unchecked")
	public void toSBOL(InputStream graphStream, OutputStream sbolStream, String filename)
			throws SAXException, IOException, ParserConfigurationException, SBOLValidationException,
			SBOLConversionException, TransformerFactoryConfigurationError, TransformerException {
		// read in the mxGraph
		mxGraph graph = parseGraph(graphStream);
		mxGraphModel model = (mxGraphModel) graph.getModel();
		glyphInfoDict = (Hashtable<String, GlyphInfo>) ((mxCell) model.getCell("0")).getValue();

		// create the document
		SBOLDocument document = new SBOLDocument();
		document.setDefaultURIprefix(uriPrefix);
		document.setComplete(true);
		document.setCreateDefaults(true);

		// Arrays.stream is the java 8 way to cast Object[] to some other array
		mxCell[] viewCells = Arrays.stream(mxGraphModel.getChildCells(model, model.getCell("1"), true, false))
				.toArray(mxCell[]::new);

		// construct the module/component definitions
		for (mxCell viewCell : viewCells) {
			Object[] viewChildren = mxGraphModel.getChildCells(model, viewCell, true, true);
			mxCell[] circuitContainers = Arrays.stream(mxGraphModel.filterCells(viewChildren, containerFilter))
					.toArray(mxCell[]::new);
			mxCell[] proteins = Arrays.stream(mxGraphModel.filterCells(viewChildren, proteinFilter))
					.toArray(mxCell[]::new);
			// TODO remove rootView when modDefs are supported
			if (viewCell.getId().equals("rootView") || circuitContainers.length > 1 || proteins.length > 0) {
				// TODO when moddefs are supported the id should already be correct
				// module definitions
				((mxCell) viewCell).setId(filename);
				createModuleDefinition(document, model, viewCell);
			} else {
				// component definitions
				createComponentDefinition(document, model, viewCell);
			}
		}

		// link the module/component definitions
		for (mxCell viewCell : viewCells) {
			Object[] viewChildren = mxGraphModel.getChildCells(model, viewCell, true, true);
			mxCell[] circuitContainers = Arrays.stream(mxGraphModel.filterCells(viewChildren, containerFilter))
					.toArray(mxCell[]::new);
			mxCell[] proteins = Arrays.stream(mxGraphModel.filterCells(viewChildren, proteinFilter))
					.toArray(mxCell[]::new);
			if (viewCell.getId().equals(filename) || circuitContainers.length > 1 || proteins.length > 0) {
				// module definitions
				linkModuleDefinition(document, model, viewCell);
			} else {
				// component definitions
				linkComponentDefinition(document, model, viewCell);
			}
		}

		// write to body
		SBOLWriter.setKeepGoing(true);
		SBOLWriter.write(document, sbolStream);
	}

	public void toGraph(InputStream sbolStream, OutputStream graphStream) throws SBOLValidationException, IOException,
			SBOLConversionException, ParserConfigurationException, TransformerException, SAXException {
		// load the sbol file into the proper objects
		SBOLDocument document = SBOLReader.read(sbolStream);
		toGraph(document, graphStream);
	}

	public void toGraph(SBOLDocument document, OutputStream graphStream) throws IOException,
			ParserConfigurationException, TransformerException, SBOLValidationException, SAXException {
		// set up the graph and glyphdict
		mxGraph graph = new mxGraph();
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell0 = (mxCell) model.getCell("0");
		cell0.setValue(glyphInfoDict);

		ModuleDefinition modDef = null;
		if (document.getRootModuleDefinitions().size() > 0) {
			modDef = document.getRootModuleDefinitions().iterator().next();
		}

		// top level component definitions
		Set<ComponentDefinition> compDefs = document.getComponentDefinitions();
		Set<ComponentDefinition> handledCompDefs = createModuleView(document, graph, modDef);

		// we don't want to create views for componentDefinitions handled in the module
		// definition (top level strands/proteins)
		compDefs.removeAll(handledCompDefs);
		for (ComponentDefinition compDef : compDefs) {
			createComponentView(document, graph, compDef);
		}

		// convert the objects to the graph xml
		graphStream.write(encodeMxGraphObject(model).getBytes());
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

	private void createModuleDefinition(SBOLDocument document, mxGraphModel model, mxCell viewCell)
			throws SBOLValidationException, TransformerFactoryConfigurationError, TransformerException {
		mxCell[] viewChildren = Arrays.stream(mxGraphModel.getChildCells(model, viewCell, true, false))
				.toArray(mxCell[]::new);
		mxCell[] circuitContainers = Arrays.stream(mxGraphModel.filterCells(viewChildren, containerFilter))
				.toArray(mxCell[]::new);
		mxCell[] proteins = Arrays.stream(mxGraphModel.filterCells(viewChildren, proteinFilter)).toArray(mxCell[]::new);
		mxCell[] textBoxes = Arrays.stream(mxGraphModel.filterCells(viewChildren, textBoxFilter))
				.toArray(mxCell[]::new);

		ModuleDefinition modDef = document.createModuleDefinition(viewCell.getId());

		// text boxes
		if (textBoxes.length > 0) {
			modDef.createAnnotation(new QName(uriPrefix, "textBoxes", annPrefix), encodeMxGraphObject(textBoxes));
		}

		// proteins
		for (mxCell protein : proteins) {
			// proteins also have glyphInfos
			GlyphInfo proteinInfo = (GlyphInfo) glyphInfoDict.get(protein.getValue());
			ComponentDefinition proteinCD = document.createComponentDefinition(proteinInfo.getDisplayID(),
					proteinInfo.getVersion(), SBOLData.types.getValue(proteinInfo.getPartType()));
			proteinCD.setDescription(proteinInfo.getDescription());
			proteinCD.setName(proteinInfo.getName());
			proteinCD.addRole(SystemsBiologyOntology.INHIBITOR); // TODO determine from interaction
			modDef.createFunctionalComponent(proteinCD.getDisplayId(), AccessType.PUBLIC, proteinCD.getIdentity(),
					DirectionType.INOUT);
			// the layout information in the component definition
			proteinCD.createAnnotation(new QName(uriPrefix, "protein", annPrefix), encodeMxGraphObject(protein));
		}

		// component definitions
		for (mxCell circuitContainer : circuitContainers) {
			// TODO placeholder component definitions
			// pull from glyph dict with container.value when modDefs support editing
			// glyphInfo of containers
			ComponentDefinition containerCD = document.createComponentDefinition("cd" + circuitContainer.getId(),
					ComponentDefinition.DNA_REGION);
			containerCD.addRole(SequenceOntology.ENGINEERED_REGION);

			// store extra graph information
			mxCell[] containerChildren = Arrays.stream(mxGraphModel.getChildCells(model, circuitContainer, true, false))
					.toArray(mxCell[]::new);
			mxCell backboneCell = (mxCell) mxGraphModel.filterCells(containerChildren, backboneFilter)[0];

			containerCD.createAnnotation(new QName(uriPrefix, "containerCell", annPrefix),
					encodeMxGraphObject(circuitContainer));
			containerCD.createAnnotation(new QName(uriPrefix, "backboneCell", annPrefix),
					encodeMxGraphObject(backboneCell));

			modDef.createFunctionalComponent(containerCD.getDisplayId(), AccessType.PUBLIC, containerCD.getIdentity(),
					DirectionType.INOUT);
		}
	}

	private void createComponentDefinition(SBOLDocument document, mxGraphModel model, mxCell viewCell)
			throws SBOLValidationException, TransformerFactoryConfigurationError, TransformerException {
		// get the glyph info associated with this view cell
		GlyphInfo glyphInfo = glyphInfoDict.get(viewCell.getId());

		// if there isn't a uri prefix give it the default
		if (glyphInfo.getUriPrefix() == null || glyphInfo.getUriPrefix().equals(""))
			glyphInfo.setUriPrefix(uriPrefix);

		ComponentDefinition compDef = document.createComponentDefinition(glyphInfo.getUriPrefix(),
				glyphInfo.getDisplayID(), glyphInfo.getVersion(), SBOLData.types.getValue(glyphInfo.getPartType()));

		if (glyphInfo.getPartRefine() == null || glyphInfo.getPartRefine().equals("")) {
			// if there isn't a part refine set the role
			compDef.addRole(SBOLData.roles.getValue(glyphInfo.getPartRole()));
		} else {
			// otherwise set the part refinement
			compDef.addRole(SBOLData.refinements.getValue(glyphInfo.getPartRefine()));
		}

		compDef.setName(glyphInfo.getName());
		compDef.setDescription(glyphInfo.getDescription());

		// component sequence
		if (glyphInfo.getSequence() != null && !glyphInfo.getSequence().equals("")) {
			Sequence seq = document.createSequence(compDef.getDisplayId() + "Sequence", glyphInfo.getSequence(),
					Sequence.IUPAC_DNA);
			compDef.addSequence(seq.getIdentity());
		}

		// store extra mxGraph information
		Object[] viewChildren = mxGraphModel.getChildCells(model, viewCell, true, false);
		mxCell[] textBoxes = Arrays.stream(mxGraphModel.filterCells(viewChildren, textBoxFilter))
				.toArray(mxCell[]::new);
		mxCell containerCell = (mxCell) mxGraphModel.filterCells(viewChildren, containerFilter)[0];
		Object[] containerChildren = mxGraphModel.getChildCells(model, containerCell, true, false);
		mxCell backboneCell = (mxCell) mxGraphModel.filterCells(containerChildren, backboneFilter)[0];

		compDef.createAnnotation(new QName(uriPrefix, "textBoxes", annPrefix), encodeMxGraphObject(textBoxes));
		compDef.createAnnotation(new QName(uriPrefix, "containerCell", annPrefix), encodeMxGraphObject(containerCell));
		compDef.createAnnotation(new QName(uriPrefix, "backboneCell", annPrefix), encodeMxGraphObject(backboneCell));
	}

	private void linkModuleDefinition(SBOLDocument document, mxGraphModel model, mxCell viewCell)
			throws SBOLValidationException, TransformerFactoryConfigurationError, TransformerException {
		mxCell[] viewChildren = Arrays.stream(mxGraphModel.getChildCells(model, viewCell, true, false))
				.toArray(mxCell[]::new);
		mxCell[] circuitContainers = Arrays.stream(mxGraphModel.filterCells(viewChildren, containerFilter))
				.toArray(mxCell[]::new);
		mxCell[] edges = Arrays.stream(mxGraphModel.getChildCells(model, viewCell, false, true)).toArray(mxCell[]::new);

		ModuleDefinition modDef = document.getModuleDefinition(viewCell.getId(), null);

		// components for component definitions
		for (mxCell circuitContainer : circuitContainers) {
			ComponentDefinition compDef = document.getComponentDefinition("cd" + circuitContainer.getId(), null);
			Object[] containerChildren = mxGraphModel.getChildCells(model, circuitContainer, true, false);
			mxCell[] glyphs = Arrays.stream(mxGraphModel.filterCells(containerChildren, sequenceFeatureFilter))
					.toArray(mxCell[]::new);
			Component previous = null;
			int count = 0, start = 0, end = 0;
			for (mxCell glyph : glyphs) {

				GlyphInfo info = glyphInfoDict.get(glyph.getValue());
				ComponentDefinition glyphCD = document.getComponentDefinition((String) glyph.getValue(), null);
				Component component = compDef.createComponent(info.getDisplayID() + "_" + glyph.getId(),
						AccessType.PUBLIC, glyphCD.getDisplayId(), info.getVersion());

				// cell annotation
				component.createAnnotation(new QName(uriPrefix, "glyphCell", annPrefix), encodeMxGraphObject(glyph));

				// sequence constraints
				if (previous != null) {
					compDef.createSequenceConstraint(compDef.getDisplayId() + "Constraint" + count,
							RestrictionType.PRECEDES, previous.getIdentity(), component.getIdentity());
				}

				// container sequence annotation
				int length = getSequenceLength(document, glyphCD);
				if (length > 0) {
					start = end + 1;
					end = start + length - 1;
					SequenceAnnotation annotation = compDef.createSequenceAnnotation(
							compDef.getDisplayId() + "Annotation" + count, "location" + count, start, end,
							OrientationType.INLINE);
					annotation.setComponent(component.getIdentity());
				}

				previous = component;
				count++;
			}
		}

		// edges to interactions
		for (mxCell edge : edges) {
			// interaction
			InteractionInfo intInfo = (InteractionInfo) edge.getValue();
			Interaction interaction = modDef.createInteraction(intInfo.getDisplayID(),
					SBOLData.interactions.getValue(intInfo.getInteractionType()));
			interaction.createAnnotation(new QName(uriPrefix, "edge", annPrefix), encodeMxGraphObject(edge));

			// participants
			GlyphInfo sourceInfo = null;
			GlyphInfo targetInfo = null;
			if (edge.getSource() != null)
				sourceInfo = glyphInfoDict.get(edge.getSource().getValue());
			if (edge.getTarget() != null)
				targetInfo = glyphInfoDict.get(edge.getTarget().getValue());

			// source participant
			if (sourceInfo != null) {
				FunctionalComponent sourceFC = modDef.getFunctionalComponent(sourceInfo.getDisplayID());
				if (sourceFC == null) {
					ComponentDefinition sourceCD = document.getComponentDefinition(sourceInfo.getDisplayID(), null);
					sourceFC = modDef.createFunctionalComponent(sourceInfo.getDisplayID(), AccessType.PUBLIC,
							sourceCD.getIdentity(), DirectionType.INOUT);

					// the functional component doesn't represent a top level componentDefinition,
					// so create a mapsTo
					FunctionalComponent parentFC = modDef
							.getFunctionalComponent("cd" + edge.getSource().getParent().getId());
					ComponentDefinition parentCD = parentFC.getDefinition();
					String componentID = edge.getSource().getValue() + "_" + edge.getSource().getId();
					Component sourceComponent = parentCD.getComponent(componentID);
					parentFC.createMapsTo("mapsTo_" + componentID, RefinementType.USEREMOTE, sourceFC.getIdentity(),
							sourceComponent.getIdentity());
				}
				interaction.createParticipation(sourceInfo.getDisplayID(), sourceFC.getIdentity(),
						getParticipantType(true, interaction.getTypes().iterator().next()));
			}

			// target participant
			if (targetInfo != null) {
				FunctionalComponent targetFC = modDef.getFunctionalComponent(targetInfo.getDisplayID());
				if (targetFC == null) {
					ComponentDefinition targetCD = document.getComponentDefinition(targetInfo.getDisplayID(), null);
					targetFC = modDef.createFunctionalComponent(targetInfo.getDisplayID(), AccessType.PUBLIC,
							targetCD.getIdentity(), DirectionType.INOUT);

					// the functional component doesn't represent a top level componentDefinition,
					// so create a mapsTo
					FunctionalComponent parentFC = modDef
							.getFunctionalComponent("cd" + edge.getTarget().getParent().getId());
					ComponentDefinition parentCD = parentFC.getDefinition();
					String componentID = edge.getTarget().getValue() + "_" + edge.getTarget().getId();
					Component targetComponent = parentCD.getComponent(componentID);
					parentFC.createMapsTo("mapsTo_" + componentID, RefinementType.USEREMOTE, targetFC.getIdentity(),
							targetComponent.getIdentity());
				}
				interaction.createParticipation(targetInfo.getDisplayID(), targetFC.getIdentity(),
						getParticipantType(false, interaction.getTypes().iterator().next()));
			}

		}

	}

	private void linkComponentDefinition(SBOLDocument document, mxGraphModel model, mxCell viewCell)
			throws SBOLValidationException, TransformerFactoryConfigurationError, TransformerException {
		mxCell[] viewChildren = Arrays.stream(mxGraphModel.getChildCells(model, viewCell, true, false))
				.toArray(mxCell[]::new);
		mxCell circuitContainer = (mxCell) mxGraphModel.filterCells(viewChildren, containerFilter)[0];

		ComponentDefinition compDef = document.getComponentDefinition((String) viewCell.getId(), null);
		Object[] containerChildren = mxGraphModel.getChildCells(model, circuitContainer, true, false);
		mxCell[] glyphs = Arrays.stream(mxGraphModel.filterCells(containerChildren, sequenceFeatureFilter))
				.toArray(mxCell[]::new);
		Component previous = null;
		int count = 0, start = 0, end = 0;
		for (mxCell glyph : glyphs) {

			GlyphInfo info = glyphInfoDict.get(glyph.getValue());
			ComponentDefinition glyphCD = document.getComponentDefinition((String) glyph.getValue(), null);
			Component component = compDef.createComponent(info.getDisplayID(), AccessType.PUBLIC,
					glyphCD.getDisplayId());// , info.getVersion());

			// cell annotation
			component.createAnnotation(new QName(uriPrefix, "glyphCell", annPrefix), encodeMxGraphObject(glyph));

			// sequence constraints
			if (previous != null) {
				compDef.createSequenceConstraint(compDef.getDisplayId() + "Constraint" + count,
						RestrictionType.PRECEDES, previous.getIdentity(), component.getIdentity());
			}

			// container sequence annotation
			int length = getSequenceLength(document, glyphCD);
			if (length > 0) {
				start = end + 1;
				end = start + length - 1;
				SequenceAnnotation annotation = compDef.createSequenceAnnotation(
						compDef.getDisplayId() + "Annotation" + count, "location" + count, start, end,
						OrientationType.INLINE);
				annotation.setComponent(component.getIdentity());
			}

			previous = component;
			count++;
		}
	}

	private Set<ComponentDefinition> createModuleView(SBOLDocument document, mxGraph graph, ModuleDefinition modDef)
			throws SAXException, IOException, ParserConfigurationException, SBOLValidationException {
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell1 = (mxCell) model.getCell("1");

		Set<ComponentDefinition> handledCompDefs = new HashSet<ComponentDefinition>();

		// create the root view cell
		// TODO pull the the module id when multiple modules are supported.
		mxCell rootViewCell = (mxCell) graph.insertVertex(cell1, "rootView", null, 0, 0, 0, 0);

		// text boxes
		Annotation textBoxAnn = modDef.getAnnotation(new QName(uriPrefix, "textBoxes", annPrefix));
		if (textBoxAnn != null) {
			@SuppressWarnings("unchecked")
			List<mxCell> textBoxes = (List<mxCell>) decodeMxGraphObject(textBoxAnn.getStringValue());
			for (mxCell textBox : textBoxes) {
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
		HashMap<URI, mxCell> compToCell = new HashMap<URI, mxCell>();
		for (FunctionalComponent funcComp : notMappedFCs) {
			ComponentDefinition compDef = funcComp.getDefinition();
			
			// proteins
			if(!compDef.getTypes().iterator().next().equals(ComponentDefinition.DNA_REGION)) {
				// proteins don't have a mapping, but we need it for interactions
				Annotation protienAnn = compDef.getAnnotation(new QName(uriPrefix, "protein", annPrefix));
				mxCell protien = null;
				if(protienAnn != null) {
					protien = (mxCell) decodeMxGraphObject(protienAnn.getStringValue());
					model.add(rootViewCell, protien, 0);
				}else {
					protien = (mxCell) graph.insertVertex(rootViewCell, null, null, 0, 0, 0, 0, "molecularSpeciesGlyph");
				}
				compToCell.put(compDef.getIdentity(), protien);
				GlyphInfo info = genGlyphInfo(compDef);
				glyphInfoDict.put(info.getDisplayID(), info);
				continue;
			}

			// add the container cell and backbone
			Annotation containerAnn = compDef.getAnnotation(new QName(uriPrefix, "containerCell", annPrefix));
			mxCell container = null;
			mxCell backbone = null;
			if (containerAnn != null) {
				container = (mxCell) decodeMxGraphObject(containerAnn.getStringValue());
				model.add(rootViewCell, container, 0);
				Annotation backboneAnn = compDef.getAnnotation(new QName(uriPrefix, "backboneCell", annPrefix));
				backbone = (mxCell) decodeMxGraphObject(backboneAnn.getStringValue());
				model.add(container, backbone, 0);
			} else {
				container = (mxCell) graph.insertVertex(rootViewCell, null, null, 0, 0, 0, 0, "circuitContainer");
				backbone = (mxCell) graph.insertVertex(container, null, null, 0, 0, 0, 0, "backbone");
			}

			// glyphs
			Component[] glyphArray = compDef.getSortedComponents().toArray(new Component[0]);
			for (int glyphIndex = 0; glyphIndex < glyphArray.length; glyphIndex++) {
				Component glyphComponent = glyphArray[glyphIndex];
				Annotation glyphAnn = glyphComponent.getAnnotation(new QName(uriPrefix, "glyphCell", annPrefix));
				mxCell glyphCell = null;
				double maxX = 0;
				if (glyphAnn != null) {
					glyphCell = (mxCell) decodeMxGraphObject(glyphAnn.getStringValue());
					maxX = glyphCell.getGeometry().getX();
					model.add(container, glyphCell, glyphIndex);
				} else {
					glyphCell = (mxCell) graph.insertVertex(container, null,
							glyphComponent.getDefinition().getDisplayId(), maxX++, 0, 0, 0, "sequenceFeatureGlyph");
				}
				// store the cell so we can use it in interactions
				compToCell.put(glyphComponent.getIdentity(), glyphCell);
			}
			handledCompDefs.add(compDef);
		}

		// interactions
		Set<Interaction> interactions = modDef.getInteractions();
		for (Interaction interaction : interactions) {
			Annotation interactionAnn = interaction.getAnnotation(new QName(uriPrefix, "edge", annPrefix));
			mxCell edge = null;
			if (interactionAnn != null) {
				edge = (mxCell) decodeMxGraphObject(interactionAnn.getStringValue());
				edge = (mxCell) model.add(rootViewCell, edge, 0);
			} else {
				edge = (mxCell) graph.insertEdge(rootViewCell, null, null, null, null);
			}
			edge.setValue(genInteractionInfo(interaction));

			URI targetType = getParticipantType(false, interaction.getTypes().iterator().next());
			URI sourceType = getParticipantType(true, interaction.getTypes().iterator().next());

			Participation[] participations = interaction.getParticipations().toArray(new Participation[0]);
			for (int i = 0; i < participations.length; i++) {
				// theoretically more than 2, but we currently only support 2
				if (participations[i].getRoles().iterator().next().equals(sourceType)) {
					URI mappedURI = uriMaps.get(participations[i].getParticipant().getIdentity());
					if(mappedURI == null)
						mappedURI = participations[i].getParticipant().getDefinition().getIdentity();
					mxCell source = compToCell.get(mappedURI);
					edge.setSource(source);
				} else if (participations[i].getRoles().iterator().next().equals(targetType)) {
					URI mappedURI = uriMaps.get(participations[i].getParticipant().getIdentity());
					if(mappedURI == null)
						mappedURI = participations[i].getParticipant().getDefinition().getIdentity();
					mxCell target = compToCell.get(mappedURI);
					edge.setTarget(target);
				}
			}
		}

		return handledCompDefs;
	}

	private void createComponentView(SBOLDocument document, mxGraph graph, ComponentDefinition compDef)
			throws SAXException, IOException, ParserConfigurationException, SBOLValidationException {
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell1 = (mxCell) model.getCell("1");

		// create the glyphInfo and store it in the dictionary
		GlyphInfo info = genGlyphInfo(compDef);
		glyphInfoDict.put(info.getDisplayID(), info);

		// create the top view cell
		mxCell viewCell = (mxCell) graph.insertVertex(cell1, compDef.getDisplayId(), null, 0, 0, 0, 0);

		// if there are text boxes add them
		Annotation textBoxAnn = compDef.getAnnotation(new QName(uriPrefix, "textBoxes", annPrefix));
		if (textBoxAnn != null) {
			@SuppressWarnings("unchecked")
			List<mxCell> textBoxes = (List<mxCell>) decodeMxGraphObject(textBoxAnn.getStringValue());
			for (mxCell textBox : textBoxes) {
				model.add(viewCell, textBox, 0);
			}
		}

		// add the container cell and backbone
		Annotation containerAnn = compDef.getAnnotation(new QName(uriPrefix, "containerCell", annPrefix));
		mxCell container = null;
		mxCell backbone = null;
		if (containerAnn != null) {
			container = (mxCell) decodeMxGraphObject(containerAnn.getStringValue());
			model.add(viewCell, container, 0);
			Annotation backboneAnn = compDef.getAnnotation(new QName(uriPrefix, "backboneCell", annPrefix));
			backbone = (mxCell) decodeMxGraphObject(backboneAnn.getStringValue());
			model.add(container, backbone, 0);
		} else {
			container = (mxCell) graph.insertVertex(viewCell, null, null, 0, 0, 0, 0, "circuitContainer");
			backbone = (mxCell) graph.insertVertex(container, null, null, 0, 0, 0, 0, "backbone");
		}

		// glyphs
		Component[] glyphArray = compDef.getSortedComponents().toArray(new Component[0]);
		for (int glyphIndex = 0; glyphIndex < glyphArray.length; glyphIndex++) {
			Component glyphComponent = glyphArray[glyphIndex];
			Annotation glyphAnn = glyphComponent.getAnnotation(new QName(uriPrefix, "glyphCell", annPrefix));
			mxCell glyphCell = null;
			double maxX = 0;
			if (glyphAnn != null) {
				glyphCell = (mxCell) decodeMxGraphObject(glyphAnn.getStringValue());
				maxX = glyphCell.getGeometry().getX();
				model.add(container, glyphCell, glyphIndex);
			} else {
				graph.insertVertex(container, null, glyphComponent.getDefinition().getDisplayId(), maxX++, 0, 0, 0,
						"sequenceFeatureGlyph");
			}
		}
	}

	private mxGraph parseGraph(InputStream graphStream) throws IOException {
		mxGraph graph = new mxGraph();
		Document document = mxXmlUtils.parseXml(mxUtils.readInputStream(graphStream));
		mxCodec codec = new mxCodec(document);
		codec.decode(document.getDocumentElement(), graph.getModel());
		return graph;
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

	private Object decodeMxGraphObject(String xml) throws SAXException, IOException, ParserConfigurationException {
		Document stringDoc = mxXmlUtils.parseXml(xml);
		mxCodec codec = new mxCodec(stringDoc);
		Node node = stringDoc.getDocumentElement();
		Object obj = codec.decode(node);
		return obj;
	}

	private GlyphInfo genGlyphInfo(ComponentDefinition glyphCD) {
		GlyphInfo glyphInfo = new GlyphInfo();
		glyphInfo.setDescription(glyphCD.getDescription());
		glyphInfo.setDisplayID(glyphCD.getDisplayId());
		glyphInfo.setName(glyphCD.getName());
		URI glyphRole = glyphCD.getRoles().toArray(new URI[0])[0];
		if (SBOLData.roles.containsValue(glyphRole)) {
			glyphInfo.setPartRole(SBOLData.roles.getKey(glyphRole));
		} else {
			glyphInfo.setPartRole(SBOLData.roles.getKey(SBOLData.parents.get(glyphRole)));
			glyphInfo.setPartRefine(SBOLData.refinements.getKey(glyphRole));
		}
		URI glyphType = glyphCD.getTypes().toArray(new URI[0])[0];
		glyphInfo.setPartType(SBOLData.types.getKey(glyphType));
		if (glyphCD.getSequences().size() > 0)
			glyphInfo.setSequence(glyphCD.getSequences().iterator().next().getElements());
		glyphInfo.setVersion(glyphCD.getVersion());
		// String identity = glyphCD.getIdentity().toString();
		// int lastIndex = 0;
		// if (glyphInfo.getVersion() != null)
		// lastIndex = identity.lastIndexOf(glyphInfo.getDisplayID() + "/" +
		// glyphInfo.getVersion());
		// else
		// lastIndex = identity.lastIndexOf(glyphInfo.getDisplayID());
		// glyphInfo.setUriPrefix(identity.substring(0, lastIndex - 1));
		glyphInfo.setUriPrefix(uriPrefix.substring(0, uriPrefix.length() - 1));
		return glyphInfo;
	}

	private InteractionInfo genInteractionInfo(Interaction interaction) {
		InteractionInfo info = new InteractionInfo();
		info.setDisplayID(interaction.getDisplayId());
		info.setInteractionType(SBOLData.interactions.getKey(interaction.getTypes().iterator().next()));
		return info;
	}

	private URI getParticipantType(boolean source, URI interactionType) {
		if (interactionType.equals(SystemsBiologyOntology.BIOCHEMICAL_REACTION)) {
			return source ? SystemsBiologyOntology.REACTANT : SystemsBiologyOntology.PRODUCT;
		} else if (interactionType.equals(SystemsBiologyOntology.CONTROL)) {
			return source ? SystemsBiologyOntology.MODIFIER : SystemsBiologyOntology.MODIFIED;
		} else if (interactionType.equals(SystemsBiologyOntology.DEGRADATION)) {
			return SystemsBiologyOntology.REACTANT;
		} else if (interactionType.equals(SystemsBiologyOntology.GENETIC_PRODUCTION)) {
			return source ? SystemsBiologyOntology.TEMPLATE : SystemsBiologyOntology.PRODUCT;
		} else if (interactionType.equals(SystemsBiologyOntology.INHIBITION)) {
			return source ? SystemsBiologyOntology.INHIBITOR : SystemsBiologyOntology.INHIBITED;
		} else if (interactionType.equals(SystemsBiologyOntology.NON_COVALENT_BINDING)) {
			return source ? SystemsBiologyOntology.REACTANT : SystemsBiologyOntology.PRODUCT;
		} else if (interactionType.equals(SystemsBiologyOntology.STIMULATION)) {
			return source ? SystemsBiologyOntology.STIMULATOR : SystemsBiologyOntology.STIMULATED;
		}
		return null;
	}

}
