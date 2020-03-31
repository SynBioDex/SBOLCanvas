package utils;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.StringWriter;
import java.net.URI;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.LinkedList;
import java.util.Set;
import java.util.TreeSet;

import javax.xml.namespace.QName;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerConfigurationException;
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
import com.mxgraph.io.mxCodec;
import com.mxgraph.io.mxCodecRegistry;
import com.mxgraph.io.mxObjectCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.model.mxGraphModel.Filter;
import com.mxgraph.util.mxUtils;
import com.mxgraph.util.mxXmlUtils;
import com.mxgraph.view.mxGraph;

import data.GlyphInfo;
import data.InteractionInfo;
import data.MxCell;
import data.MxGeometry;
import data.MxPoint;

public class Converter {

	private static Gson gson = new Gson();

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

	// these are here because of the possibility of having a mix of having/not
	// having cell annotations
	// it's easier to generate them every time
	private int nextID = 2;

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
			SBOLConversionException, ParserConfigurationException, TransformerException {
		// load the sbol file into the proper objects
		SBOLDocument document = SBOLReader.read(sbolStream);
		toGraph(document, graphStream);
	}

	public void toGraph(SBOLDocument document, OutputStream graphStream)
			throws IOException, ParserConfigurationException, TransformerException, SBOLValidationException {
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
		Set<ComponentDefinition> topCDs = document.getRootComponentDefinitions();
		for (ComponentDefinition topCD : topCDs) {
			if (modDef == null) {
				// If we're importing a sub part, the main cell was attached to the component
				// which we no longer have

				mxCell cell1 = (mxCell) model.getCell("1");
				GlyphInfo info = genGlyphInfo(topCD);
				mxCell cell = (mxCell) graph.insertVertex(cell1, "" + nextID++, "", 0, 0, 0, 0);

				cell.setInfo(genGlyphInfo(topCD));
				cell.setGeometry(new MxGeometry());
				cell.setCollapsed(true);
				cell.setVertex(true);
				cell.setId(nextID);
				nextID++;
				cells.put(cell.getId(), cell);
				compDefToMxGraphObjects(topCD, cell.getId());
			} else {
				compDefToMxGraphObjects(topCD);
			}
		}

		if (modDef != null) {
			// edges
			modDefToMxGraphObjects(modDef);
		}

		// convert the objects to the graph xml
		if (modDef != null)
			graphStream.write(objectsToGraph().getBytes());
		else
			graphStream.write(objectsToSubGraph().getBytes());
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
		mxCell[] textBoxes = Arrays.stream(mxGraphModel.filterCells(viewChildren, textBoxFilter)).toArray(mxCell[]::new);
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
				component.createAnnotation(new QName(uriPrefix, "glyphcell", annPrefix), encodeMxGraphObject(glyph));

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

	private void createModuleView(SBOLDocument document, mxGraph graph, ModuleDefinition modDef) throws SAXException, IOException, ParserConfigurationException {
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell1 = (mxCell) model.getCell("1");
		
		// create the root view cell
		//TODO pull the the module id when multiple modules are supported.
		mxCell rootViewCell = (mxCell) graph.insertVertex(cell1, "rootView", null, 0, 0, 0, 0);
		
		// text boxes
		Annotation textBoxAnn = modDef.getAnnotation(new QName(uriPrefix, "textBoxes", annPrefix));
		if(textBoxAnn != null) {
			mxCell[] textBoxes = Arrays.stream((Object[]) decodeMxGraphObject(textBoxAnn.getStringValue())).toArray(mxCell[]::new);
			for(mxCell textBox : textBoxes) {
				model.add(rootViewCell, textBox, 0);
			}
		}
		
		// interactions
		Set<Interaction> interactions = modDef.getInteractions();
		for(Interaction interaction : interactions) {
			Annotation interactionAnn = interaction.getAnnotation(new QName(uriPrefix, "edge", annPrefix));
			mxCell edge = null;
			if(interactionAnn != null) {
				edge = (mxCell) decodeMxGraphObject(interactionAnn.getStringValue());
				model.add(rootViewCell, edge, 0);
			}else {
				edge = (mxCell) graph.insertEdge(rootViewCell, null, null, null, null);
			}
			edge.setValue(genInteractionInfo(interaction));
			
			URI targetType = getParticipantType(false, interaction.getTypes().iterator().next());
			URI sourceType = getParticipantType(true, interaction.getTypes().iterator().next());
			
			Participation[] participations = interaction.getParticipations().toArray(new Participation[0]);
			for(int i = 0; i < participations.length; i++) {
				// theoretically more than 2, but we currently only support 2
				if (participations[i].getRoles().iterator().next().equals(sourceType)) {
					edge.setSource(defToID.get(participations[i].getParticipant().getDefinition()));
				} else if (participations[i].getRoles().iterator().next().equals(targetType)) {
					edge.setTarget(defToID.get(participations[i].getParticipant().getDefinition()));
				}
			}
		}
	}
	
	// call after compDefToMxGraphObjects
		private void modDefToMxGraphObjects(ModuleDefinition modDef) {
			Annotation textBoxAnn = modDef.getAnnotation(new QName(uriPrefix, "textBoxes", annPrefix));
			if (textBoxAnn != null) {
				MxCell[] textBoxes = gson.fromJson(textBoxAnn.getStringValue(), MxCell[].class);
				for (MxCell textBox : textBoxes) {
					textBox.setId(nextID);
					nextID++;
					textBox.setParent(1);
					cells.put(textBox.getId(), textBox);
				}
			}

			Set<Interaction> interactions = modDef.getInteractions();
			for (Interaction interaction : interactions) {
				Annotation interactionAnn = interaction.getAnnotation(new QName(uriPrefix, "edge", annPrefix));
				MxCell edge = null;
				if (interactionAnn != null) {
					edge = gson.fromJson(
							interaction.getAnnotation(new QName(uriPrefix, "edge", annPrefix)).getStringValue(),
							MxCell.class);
				} else {
					edge = new MxCell();
					edge.setEdge(true);
				}
				edge.setId(nextID);
				nextID++;
				edge.setParent(1);
				InteractionInfo info = new InteractionInfo();
				info.setDisplayID(interaction.getDisplayId());
				info.setInteractionType(SBOLData.interactions.getKey(interaction.getTypes().iterator().next()));
				edge.setInfo(info);
				edge.setGeometry(new MxGeometry());
				edge.getGeometry().setSourcePoint(new MxPoint());
				edge.getGeometry().setTargetPoint(new MxPoint());

				URI targetType = getParticipantType(false, interaction.getTypes().iterator().next());
				URI sourceType = getParticipantType(true, interaction.getTypes().iterator().next());

				Participation[] participations = interaction.getParticipations().toArray(new Participation[0]);
				for (int i = 0; i < participations.length; i++) {
					// theoretically more than 2, but we currently only support 2
					if (participations[i].getRoles().iterator().next().equals(sourceType)) {
						edge.setSource(defToID.get(participations[i].getParticipant().getDefinition()));
					} else if (participations[i].getRoles().iterator().next().equals(targetType)) {
						edge.setTarget(defToID.get(participations[i].getParticipant().getDefinition()));
					}
				}

				cells.put(edge.getId(), edge);
			}
		}
	
	private void createComponentView(SBOLDocument document, mxGraph graph, ComponentDefinition compDef) throws SAXException, IOException, ParserConfigurationException, SBOLValidationException {
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell1 = (mxCell) model.getCell("1");
		
		// create the glyphInfo and store it in the dictionary
		GlyphInfo info = genGlyphInfo(compDef);
		glyphInfoDict.put(info.getDisplayID(), info);
		
		// create the top view cell
		mxCell viewCell = (mxCell) graph.insertVertex(cell1, compDef.getDisplayId(), null, 0, 0, 0, 0);
		
		// if there are text boxes add them
		Annotation textBoxAnn = compDef.getAnnotation(new QName(uriPrefix, "textBoxes", annPrefix));
		if(textBoxAnn != null) {
			mxCell[] textBoxes = Arrays.stream((Object[]) decodeMxGraphObject(textBoxAnn.getStringValue())).toArray(mxCell[]::new);
			for (mxCell textBox : textBoxes) {
				model.add(viewCell, textBox, 0);
			}
		}
		
		// add the container cell and backbone
		Annotation containerAnn = compDef.getAnnotation(new QName(uriPrefix, "containerCell", annPrefix));
		mxCell container = null;
		mxCell backbone = null;
		if(containerAnn != null) {
			container = (mxCell) decodeMxGraphObject(containerAnn.getStringValue());
			model.add(viewCell, container, 0);			
			Annotation backboneAnn = compDef.getAnnotation(new QName(uriPrefix, "backboneCell", annPrefix));
			backbone = (mxCell) decodeMxGraphObject(backboneAnn.getStringValue());
			model.add(container, backbone, 0);
		}else {
			container = (mxCell) graph.insertVertex(viewCell, null, null, 0, 0, 0, 0, "circuitContainer");
			backbone = (mxCell) graph.insertVertex(container, null, null, 0, 0, 0, 0, "backbone");
		}
		
		// glyphs
		Component[] glyphArray = compDef.getSortedComponents().toArray(new Component[0]);
		for(int glyphIndex = 0; glyphIndex < glyphArray.length; glyphIndex++) {
			Component glyphComponent = glyphArray[glyphIndex];
			Annotation glyphAnn = glyphComponent.getAnnotation(new QName(uriPrefix, "glyphCell", annPrefix));
			mxCell glyphCell = null;
			double maxX = 0;
			if(glyphAnn != null) {
				glyphCell = (mxCell) decodeMxGraphObject(glyphAnn.getStringValue());
				maxX = glyphCell.getGeometry().getX();
				model.add(container, glyphCell, glyphIndex);
			}else {
				graph.insertVertex(container, null, glyphComponent.getDefinition().getDisplayId(), maxX++, 0, 0, 0, "sequenceFeatureGlyph");
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
		mxCodec codec = new mxCodec();
		// turn the string into a Node
		Element node = DocumentBuilderFactory.newInstance().newDocumentBuilder()
				.parse(new ByteArrayInputStream(xml.getBytes())).getDocumentElement();
		return codec.decode(node);
	}

	/*
	 * private void createMxGraphObjects(Document document) { document.normalize();
	 * NodeList nList = document.getElementsByTagName("mxCell"); for (int temp = 0;
	 * temp < nList.getLength(); temp++) { Node node = nList.item(temp);
	 * 
	 * // cell info Element cellElement = (Element) node; MxCell cell = new
	 * MxCell(); cell.setId(Integer.parseInt(cellElement.getAttribute("id")));
	 * cell.setValue(cellElement.getAttribute("value"));
	 * cell.setStyle(cellElement.getAttribute("style")); if
	 * (cellElement.hasAttribute("vertex"))
	 * cell.setVertex(Integer.parseInt(cellElement.getAttribute("vertex")) == 1); if
	 * (cellElement.hasAttribute("edge"))
	 * cell.setEdge(Integer.parseInt(cellElement.getAttribute("edge")) == 1); if
	 * (cellElement.hasAttribute("connectable"))
	 * cell.setConnectable(Integer.parseInt(cellElement.getAttribute("connectable"))
	 * == 1); if (cellElement.hasAttribute("collapsed"))
	 * cell.setCollapsed(Integer.parseInt(cellElement.getAttribute("collapsed")) ==
	 * 1); if (cellElement.hasAttribute("parent"))
	 * cell.setParent(Integer.parseInt(cellElement.getAttribute("parent"))); else
	 * cell.setParent(-1); if (cellElement.hasAttribute("source"))
	 * cell.setSource(Integer.parseInt(cellElement.getAttribute("source"))); if
	 * (cellElement.hasAttribute("target"))
	 * cell.setTarget(Integer.parseInt(cellElement.getAttribute("target")));
	 * 
	 * // geometry info if
	 * (cellElement.getElementsByTagName("mxGeometry").getLength() > 0) { Element
	 * geoElement = (Element)
	 * cellElement.getElementsByTagName("mxGeometry").item(0); MxGeometry geometry =
	 * new MxGeometry(); if (geoElement.hasAttribute("x"))
	 * geometry.setX(Double.parseDouble(geoElement.getAttribute("x"))); if
	 * (geoElement.hasAttribute("y"))
	 * geometry.setY(Double.parseDouble(geoElement.getAttribute("y"))); if
	 * (geoElement.hasAttribute("width"))
	 * geometry.setWidth(Double.parseDouble(geoElement.getAttribute("width"))); if
	 * (geoElement.hasAttribute("height"))
	 * geometry.setHeight(Double.parseDouble(geoElement.getAttribute("height"))); if
	 * (geoElement.getElementsByTagName("Array").getLength() > 0) {
	 * LinkedList<MxPoint> points = new LinkedList<MxPoint>(); Element arrayElement
	 * = (Element) geoElement.getElementsByTagName("Array").item(0); NodeList
	 * pointNodes = arrayElement.getElementsByTagName("mxPoint"); for (int
	 * pointIndex = 0; pointIndex < pointNodes.getLength(); pointIndex++) { Element
	 * pointElement = (Element) pointNodes.item(pointIndex); MxPoint point = new
	 * MxPoint(); if (pointElement.hasAttribute("x"))
	 * point.setX(Double.parseDouble(pointElement.getAttribute("x"))); else
	 * point.setX(0); if (pointElement.hasAttribute("y"))
	 * point.setY(Integer.parseInt(pointElement.getAttribute("y"))); else
	 * point.setY(0); points.add(point); } geometry.setPoints(points); } if
	 * (geoElement.getElementsByTagName("mxPoint").getLength() > 0) { NodeList
	 * pointNodes = geoElement.getElementsByTagName("mxPoint"); for (int pointIndex
	 * = 0; pointIndex < pointNodes.getLength(); pointIndex++) { Element
	 * pointElement = (Element) pointNodes.item(pointIndex); MxPoint point = new
	 * MxPoint(); if(pointElement.hasAttribute("x"))
	 * point.setX(Double.parseDouble(pointElement.getAttribute("x"))); else
	 * point.setX(0); if(pointElement.hasAttribute("y"))
	 * point.setY(Double.parseDouble(pointElement.getAttribute("y"))); else
	 * point.setY(0); if (pointElement.getAttribute("as").equals("sourcePoint")) {
	 * geometry.setSourcePoint(point); } if
	 * (pointElement.getAttribute("as").equals("targetPoint")) {
	 * geometry.setTargetPoint(point); }
	 * 
	 * }
	 * 
	 * } cell.setGeometry(geometry); }
	 * 
	 * // glyph info if (cellElement.getElementsByTagName("GlyphInfo").getLength() >
	 * 0) { Element infoElement = (Element)
	 * cellElement.getElementsByTagName("GlyphInfo").item(0); GlyphInfo info = new
	 * GlyphInfo(); info.setPartType(infoElement.getAttribute("partType"));
	 * info.setPartRole(infoElement.getAttribute("partRole"));
	 * info.setPartRefine(infoElement.getAttribute("partRefine"));
	 * info.setDisplayID(infoElement.getAttribute("displayID"));
	 * info.setName(infoElement.getAttribute("name"));
	 * info.setDescription(infoElement.getAttribute("description"));
	 * info.setVersion(infoElement.getAttribute("version"));
	 * info.setSequence(infoElement.getAttribute("sequence"));
	 * info.setUriPrefix(infoElement.getAttribute("uriPrefix")); cell.setInfo(info);
	 * }
	 * 
	 * // interaction info if
	 * (cellElement.getElementsByTagName("InteractionInfo").getLength() > 0) {
	 * Element infoElement = (Element)
	 * cellElement.getElementsByTagName("InteractionInfo").item(0); InteractionInfo
	 * info = new InteractionInfo();
	 * info.setDisplayID(infoElement.getAttribute("displayID"));
	 * info.setInteractionType(infoElement.getAttribute("interactionType"));
	 * info.setFromParticipationType(infoElement.getAttribute(
	 * "fromParticipationType"));
	 * info.setToParticipationType(infoElement.getAttribute("toParticipationType"));
	 * cell.setInfo(info); }
	 * 
	 * if (cell.isEdge()) { edges.add(cell); } else if
	 * (cell.getStyle().contains("circuitContainer")) { if
	 * (containers.containsKey(cell.getParent())) {
	 * containers.get(cell.getParent()).put(cell.getId(), cell); } else {
	 * HashMap<Integer, MxCell> subContainers = new HashMap<Integer, MxCell>();
	 * subContainers.put(cell.getId(), cell); containers.put(cell.getParent(),
	 * subContainers); } } else if (cell.getStyle().contains("backbone")) { // TODO
	 * remove me when the user can set the displayID GlyphInfo glyphInfo = new
	 * GlyphInfo(); glyphInfo.setDisplayID("cd" + cell.getId());
	 * cell.setInfo(glyphInfo); backbones.put(cell.getParent(), cell); } else if
	 * (proteins != null && cell.getStyle().contains("molecularSpeciesGlyph")) {
	 * proteins.add(cell); } else if (cell.getStyle().contains("textBox")) { if
	 * (textSets.get(cell.getParent()) != null) {
	 * textSets.get(cell.getParent()).add(cell); } else { LinkedList<MxCell> list =
	 * new LinkedList<MxCell>(); list.add(cell); textSets.put(cell.getParent(),
	 * list); } } else if (cell.getStyle().contains("sequenceFeatureGlyph")) { if
	 * (glyphSets.get(cell.getParent()) != null) {
	 * glyphSets.get(cell.getParent()).add(cell); } else { TreeSet<MxCell> set = new
	 * TreeSet<MxCell>(geoSorter); set.add(cell); glyphSets.put(cell.getParent(),
	 * set); } } cells.put(cell.getId(), cell); } }
	 * 
	 */
	/**
	 * Takes the mxGraph objects and converts them to an xml that can be used to
	 * override a cell in mxGraph.
	 * 
	 * @return
	 * @throws ParserConfigurationException
	 * @throws TransformerException
	 */
	private String objectsToSubGraph() throws ParserConfigurationException, TransformerException {
		DocumentBuilderFactory documentFactory = DocumentBuilderFactory.newInstance();
		DocumentBuilder documentBuilder = documentFactory.newDocumentBuilder();
		Document graphDocument = documentBuilder.newDocument();

		Element root = graphDocument.createElement("root");
		graphDocument.appendChild(root);

		for (MxCell cell : cells.values()) {
			root.appendChild(cell.encode(graphDocument));
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

	/**
	 * Takes the mxGraph objects and converts them to an xml that can be used to
	 * override the model in mxGraph.
	 * 
	 * @return
	 * @throws ParserConfigurationException
	 * @throws TransformerException
	 */
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
			root.appendChild(cell.encode(graphDocument));
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
