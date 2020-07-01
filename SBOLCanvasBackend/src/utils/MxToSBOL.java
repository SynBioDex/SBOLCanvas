package utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;
import java.util.Set;

import javax.xml.namespace.QName;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactoryConfigurationError;

import org.sbolstandard.core2.AccessType;
import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.Component;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.DirectionType;
import org.sbolstandard.core2.FunctionalComponent;
import org.sbolstandard.core2.GenericTopLevel;
import org.sbolstandard.core2.Interaction;
import org.sbolstandard.core2.ModuleDefinition;
import org.sbolstandard.core2.OrientationType;
import org.sbolstandard.core2.RefinementType;
import org.sbolstandard.core2.RestrictionType;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLValidationException;
import org.sbolstandard.core2.SBOLWriter;
import org.sbolstandard.core2.Sequence;
import org.sbolstandard.core2.SequenceAnnotation;
import org.sbolstandard.core2.SystemsBiologyOntology;
import org.sbolstandard.core2.TopLevel;
import org.synbiohub.frontend.SynBioHubException;
import org.w3c.dom.Document;
import org.xml.sax.SAXException;

import com.mxgraph.io.mxCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.model.mxGraphModel.Filter;
import com.mxgraph.util.mxConstants;
import com.mxgraph.util.mxUtils;
import com.mxgraph.util.mxXmlUtils;
import com.mxgraph.view.mxGraph;

import data.CanvasAnnotation;
import data.GlyphInfo;
import data.InteractionInfo;

public class MxToSBOL extends Converter {

	/**
	 * Filters mxCells that contain "textBox" in the style string
	 */
	static Filter textBoxFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_TEXTBOX);
		}
	};

	/**
	 * Filters mxCells that contain "protein" in the style string
	 */
	static Filter proteinFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_MOLECULAR_SPECIES);
		}
	};

	/**
	 * Filters mxCells that contain "circuitContainer" in the style string
	 */
	static Filter containerFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_CIRCUIT_CONTAINER);
		}
	};

	/**
	 * Filters mxCells that contain "backbone" in the style string
	 */
	static Filter backboneFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_BACKBONE);
		}
	};

	/**
	 * Filters mxCells that contain "sequenceFeatureGlyph" in the style string
	 */
	static Filter sequenceFeatureFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_SEQUENCE_FEATURE);
		}
	};

	public MxToSBOL() {
		glyphInfoDict = new Hashtable<String, GlyphInfo>();
	}

	@SuppressWarnings("unchecked")
	public void toSBOL(InputStream graphStream, OutputStream sbolStream, String filename) throws SAXException,
			IOException, ParserConfigurationException, SBOLValidationException, SBOLConversionException,
			TransformerFactoryConfigurationError, TransformerException, URISyntaxException, SynBioHubException {
		// read in the mxGraph
		mxGraph graph = parseGraph(graphStream);
		mxGraphModel model = (mxGraphModel) graph.getModel();
		glyphInfoDict = (Hashtable<String, GlyphInfo>) ((mxCell) model.getCell("0")).getValue();

		// create the document
		SBOLDocument document = new SBOLDocument();
		document.setDefaultURIprefix(URI_PREFIX);
		document.setComplete(true);
		document.setCreateDefaults(true);

		layoutHelper = new LayoutHelper(document, graph);

		// Arrays.stream is the java 8 way to cast Object[] to some other array
		mxCell[] viewCells = Arrays.stream(mxGraphModel.getChildCells(model, model.getCell("1"), true, false))
				.toArray(mxCell[]::new);

		// filter the circuit containers and create component definitions
		for (mxCell viewCell : viewCells) {
			mxCell[] viewChildren = Arrays.stream(mxGraphModel.getChildCells(model, viewCell, true, false))
					.toArray(mxCell[]::new);
			mxCell[] circuitContainers = Arrays.stream(mxGraphModel.filterCells(viewChildren, containerFilter))
					.toArray(mxCell[]::new);
			for (mxCell circuitContainer : circuitContainers) {
				// avoid duplicates from aliases in modules
//				if (document.getComponentDefinition(new URI((String) circuitContainer.getValue())) != null)
//					continue;
				if (layoutHelper.getGraphicalLayout(URI.create((String) circuitContainer.getValue())) != null)
					continue;
				createComponentDefinition(document, graph, model, circuitContainer);
			}
		}

		// construct the module definitions, and add text annotations for component
		// definitions
		for (mxCell viewCell : viewCells) {
			Object[] viewChildren = mxGraphModel.getChildCells(model, viewCell, true, true);
			mxCell[] circuitContainers = Arrays.stream(mxGraphModel.filterCells(viewChildren, containerFilter))
					.toArray(mxCell[]::new);
			mxCell[] proteins = Arrays.stream(mxGraphModel.filterCells(viewChildren, proteinFilter))
					.toArray(mxCell[]::new);
			if (viewCell.getStyle().equals(STYLE_MODULE_VIEW) || circuitContainers.length > 1 || proteins.length > 0) {
				// TODO when moddefs are supported the id should already be correct
				// module definitions
				((mxCell) viewCell).setId(filename);
				createModuleDefinition(document, graph, model, viewCell);
			} else {
				// component definitions
				attachTextBoxAnnotation(model, viewCell, URI.create(viewCell.getId()));
			}
		}

		// link the component definitions (create components and set up references)
		Set<String> handledContainers = new HashSet<String>();
		for (mxCell viewCell : viewCells) {
			Object[] viewChildren = mxGraphModel.getChildCells(model, viewCell, true, false);
			mxCell[] circuitContainers = Arrays.stream(mxGraphModel.filterCells(viewChildren, containerFilter))
					.toArray(mxCell[]::new);
			for (mxCell circuitContainer : circuitContainers) {
				if (handledContainers.contains((String) circuitContainer.getValue()))
					continue;
				linkComponentDefinition(document, graph, model, circuitContainer);
				handledContainers.add((String) circuitContainer.getValue());
			}
		}

		// link the module definitions
		for (mxCell viewCell : viewCells) {
			Object[] viewChildren = mxGraphModel.getChildCells(model, viewCell, true, true);
			mxCell[] circuitContainers = Arrays.stream(mxGraphModel.filterCells(viewChildren, containerFilter))
					.toArray(mxCell[]::new);
			mxCell[] proteins = Arrays.stream(mxGraphModel.filterCells(viewChildren, proteinFilter))
					.toArray(mxCell[]::new);
			if (viewCell.getStyle().equals(STYLE_MODULE_VIEW) || circuitContainers.length > 1 || proteins.length > 0) {
				// module definitions
				linkModuleDefinition(document, graph, model, viewCell);
			}
		}
		
		// write to body
		SBOLWriter.setKeepGoing(true);
		SBOLWriter.write(document, sbolStream);
	}

	/**
	 * @param document
	 * @param model
	 * @param viewCell
	 * @throws SBOLValidationException
	 * @throws TransformerFactoryConfigurationError
	 * @throws TransformerException
	 * @throws URISyntaxException
	 */
	private void createModuleDefinition(SBOLDocument document, mxGraph graph, mxGraphModel model, mxCell viewCell)
			throws SBOLValidationException, TransformerFactoryConfigurationError, TransformerException,
			URISyntaxException {
		mxCell[] viewChildren = Arrays.stream(mxGraphModel.getChildCells(model, viewCell, true, false))
				.toArray(mxCell[]::new);
		mxCell[] circuitContainers = Arrays.stream(mxGraphModel.filterCells(viewChildren, containerFilter))
				.toArray(mxCell[]::new);
		mxCell[] proteins = Arrays.stream(mxGraphModel.filterCells(viewChildren, proteinFilter)).toArray(mxCell[]::new);
		mxCell[] textBoxes = Arrays.stream(mxGraphModel.filterCells(viewChildren, textBoxFilter))
				.toArray(mxCell[]::new);

		ModuleDefinition modDef = document.createModuleDefinition(viewCell.getId());
		layoutHelper.createGraphicalLayout(modDef.getIdentity(), modDef.getDisplayId() + "_Layout");

		// text boxes
		if (textBoxes.length > 0) {
			attachTextBoxAnnotation(model, viewCell, modDef.getIdentity());
		}

		// proteins
		for (mxCell protein : proteins) {
			// proteins also have glyphInfos
			GlyphInfo proteinInfo = (GlyphInfo) glyphInfoDict.get(protein.getValue());
			ComponentDefinition proteinCD = document.getComponentDefinition(new URI((String) protein.getValue()));
			if (proteinCD == null) {
				proteinCD = document.createComponentDefinition(proteinInfo.getDisplayID(), proteinInfo.getVersion(),
						SBOLData.types.getValue(proteinInfo.getPartType()));
				proteinCD.setDescription(proteinInfo.getDescription());
				proteinCD.setName(proteinInfo.getName());
				proteinCD.addRole(SystemsBiologyOntology.INHIBITOR); // TODO determine from interaction
			}
			FunctionalComponent proteinFuncComp = modDef.createFunctionalComponent(
					proteinCD.getDisplayId() + "_" + protein.getId(), AccessType.PUBLIC, proteinCD.getIdentity(),
					DirectionType.INOUT);
			// the layout information in the component definition
			layoutHelper.addGraphicalNode(modDef.getIdentity(), proteinFuncComp.getDisplayId(), protein);
		}

		// component definitions (should already have been created, just need to link
		// them with functional components)
		for (mxCell circuitContainer : circuitContainers) {

			GlyphInfo glyphInfo = glyphInfoDict.get(circuitContainer.getValue());

			FunctionalComponent funcComp = modDef.createFunctionalComponent(
					glyphInfo.getDisplayID() + "_" + circuitContainer.getId(), AccessType.PUBLIC,
					URI.create(glyphInfo.getFullURI()), DirectionType.INOUT);

			// store extra graph information
			layoutHelper.addGraphicalNode(modDef.getIdentity(), funcComp.getDisplayId(), circuitContainer);
			GenericTopLevel layout = layoutHelper.getGraphicalLayout(URI.create(glyphInfo.getFullURI()));
			layoutHelper.addLayoutRef(modDef.getIdentity(), layout.getIdentity(),
					glyphInfo.getDisplayID() + "_Reference");
		}
	}

	private void createComponentDefinition(SBOLDocument document, mxGraph graph, mxGraphModel model,
			mxCell circuitContainer) throws URISyntaxException, SBOLValidationException,
			TransformerFactoryConfigurationError, TransformerException, SynBioHubException {

		//

		// get the glyph info associated with this view cell
		GlyphInfo glyphInfo = glyphInfoDict.get(circuitContainer.getValue());

		// store extra mxGraph information
		Object[] containerChildren = mxGraphModel.getChildCells(model, circuitContainer, true, false);
		mxCell backboneCell = (mxCell) mxGraphModel.filterCells(containerChildren, backboneFilter)[0];
		URI identity = URI.create(glyphInfo.getFullURI());
		layoutHelper.createGraphicalLayout(identity, glyphInfo.getDisplayID() + "_Layout");
		layoutHelper.addGraphicalNode(identity, "container", circuitContainer);
		layoutHelper.addGraphicalNode(identity, "backbone", backboneCell);

		// if the uri isn't one of the synbiohub ones, skip the object
		for (String registry : SBOLData.registries) {
			if (glyphInfo.getUriPrefix().contains(registry)) {
				document.addRegistry(registry);
				return;
			}
		}

		// if there isn't a uri prefix give it the default
		if (glyphInfo.getUriPrefix() == null || glyphInfo.getUriPrefix().equals(""))
			glyphInfo.setUriPrefix(URI_PREFIX);

		ComponentDefinition compDef = document.createComponentDefinition(glyphInfo.getUriPrefix(),
				glyphInfo.getDisplayID(), glyphInfo.getVersion(), SBOLData.types.getValue(glyphInfo.getPartType()));
		if (glyphInfo.getOtherTypes() != null) {
			for (String type : glyphInfo.getOtherTypes()) {
				compDef.addType(new URI(type));
			}
		}

		if (glyphInfo.getPartRefine() == null || glyphInfo.getPartRefine().equals("")) {
			// if there isn't a part refine set the role
			if (glyphInfo.getPartRole() == null || glyphInfo.getPartRole().equals("")) {
				glyphInfo.setPartRole(STYLE_NGA);
			}
			compDef.addRole(SBOLData.roles.getValue(glyphInfo.getPartRole()));
		} else {
			// otherwise set the part refinement
			compDef.addRole(SBOLData.refinements.getValue(glyphInfo.getPartRefine()));
		}
		if (glyphInfo.getOtherRoles() != null) {
			for (String role : glyphInfo.getOtherRoles()) {
				compDef.addRole(new URI(role));
			}
		}

		compDef.setName(glyphInfo.getName());
		compDef.setDescription(glyphInfo.getDescription());

		// component sequence
		if (glyphInfo.getSequence() != null && !glyphInfo.getSequence().equals("")) {
			Sequence sequence = document.createSequence(compDef.getDisplayId() + "_sequence", glyphInfo.getSequence(),
					Sequence.IUPAC_DNA);
			compDef.addSequence(sequence.getIdentity());
//			if(glyphInfo.getSequenceURI() != null && !glyphInfo.getUriPrefix().equals(Converter.URI_PREFIX))
//				compDef.addSequence(URI.create(glyphInfo.getSequenceURI()));
		}

		if (glyphInfo.getAnnotations() != null) {
			convertCanvasAnnotations(glyphInfo.getAnnotations(), compDef);
		}

		if (glyphInfo.getDerivedFroms() != null) {
			for (String derivedFrom : glyphInfo.getDerivedFroms()) {
				compDef.addWasDerivedFrom(URI.create(derivedFrom));
			}
		}

		// TODO come back to me when the activity objects are round tripping
//		if(glyphInfo.getGeneratedBys() != null) {
//			for(String generatedBy : glyphInfo.getGeneratedBys()) {
//				compDef.addWasGeneratedBy(URI.create(generatedBy));
//			}
//		}
	}

	private void linkModuleDefinition(SBOLDocument document, mxGraph graph, mxGraphModel model, mxCell viewCell)
			throws SBOLValidationException, TransformerFactoryConfigurationError, TransformerException,
			URISyntaxException {
		mxCell[] edges = Arrays.stream(mxGraphModel.getChildCells(model, viewCell, false, true)).toArray(mxCell[]::new);

		ModuleDefinition modDef = document.getModuleDefinition(viewCell.getId(), null);

		// edges to interactions
		for (mxCell edge : edges) {

			// interaction
			InteractionInfo intInfo = (InteractionInfo) edge.getValue();
			Interaction interaction = modDef.createInteraction(intInfo.getDisplayID(),
					SBOLData.interactions.getValue(intInfo.getInteractionType()));
			layoutHelper.addGraphicalNode(modDef.getIdentity(), interaction.getDisplayId(), edge);

			// participants
			mxCell source = (mxCell) edge.getSource();
			mxCell target = (mxCell) edge.getTarget();
			GlyphInfo sourceInfo = null;
			GlyphInfo targetInfo = null;
			if (source != null)
				sourceInfo = glyphInfoDict.get(source.getValue());
			if (target != null)
				targetInfo = glyphInfoDict.get(target.getValue());

			// source participant
			if (source != null) {
				FunctionalComponent sourceFC = getOrCreateParticipant(document, modDef, sourceInfo, source);
				interaction.createParticipation(sourceInfo.getDisplayID() + "_" + source.getId(),
						sourceFC.getIdentity(), getParticipantType(true, interaction.getTypes()));
			}

			// target participant
			if (target != null) {
				FunctionalComponent targetFC = getOrCreateParticipant(document, modDef, targetInfo, target);
				interaction.createParticipation(targetInfo.getDisplayID() + "_" + target.getId(),
						targetFC.getIdentity(), getParticipantType(false, interaction.getTypes()));
			}

		}

	}

	private void linkComponentDefinition(SBOLDocument document, mxGraph graph, mxGraphModel model,
			mxCell circuitContainer) throws SBOLValidationException, TransformerFactoryConfigurationError,
			TransformerException, URISyntaxException {

		ComponentDefinition compDef = document.getComponentDefinition(URI.create((String) circuitContainer.getValue()));
		Object[] containerChildren = mxGraphModel.getChildCells(model, circuitContainer, true, false);
		mxCell[] glyphs = Arrays.stream(mxGraphModel.filterCells(containerChildren, sequenceFeatureFilter))
				.toArray(mxCell[]::new);

		if (compDef.getComponents().size() > 0) {
			// the component definition was pulled in from a registry
			List<Component> components = compDef.getSortedComponents();
			for (mxCell glyph : glyphs) {
				GlyphInfo info = glyphInfoDict.get(glyph.getValue());
				Component component = components.get(glyph.getParent().getIndex(glyph) - 1);

				// cell annotation
				layoutHelper.addGraphicalNode(compDef.getIdentity(), component.getDisplayId(), glyph);
				GenericTopLevel layout = layoutHelper.getGraphicalLayout(URI.create(info.getFullURI()));
				layoutHelper.addLayoutRef(compDef.getIdentity(), layout.getIdentity(),
						component.getDefinition().getDisplayId() + "_Reference");
			}
		} else {
			// the component definition was created by us and has no components
			Component previous = null;
			int count = 0, start = 0, end = 0;
			for (mxCell glyph : glyphs) {
				GlyphInfo info = glyphInfoDict.get(glyph.getValue());
				ComponentDefinition glyphCD = document.getComponentDefinition(URI.create((String) glyph.getValue()));
				Component component = compDef.createComponent(
						info.getDisplayID() + "_" + glyph.getParent().getIndex(glyph), AccessType.PUBLIC,
						URI.create((String) glyph.getValue()));

				// cell annotation
				layoutHelper.addGraphicalNode(compDef.getIdentity(), component.getDisplayId(), glyph);
				GenericTopLevel layout = layoutHelper.getGraphicalLayout(URI.create(info.getFullURI()));
				layoutHelper.addLayoutRef(compDef.getIdentity(), layout.getIdentity(),
						component.getDefinition().getDisplayId() + "_Reference");

				// sequence constraints
				if (previous != null) {
					compDef.createSequenceConstraint(compDef.getDisplayId() + "Constraint" + count,
							RestrictionType.PRECEDES, previous.getIdentity(), component.getIdentity());
				}

				// container sequence annotation
				OrientationType orientation = OrientationType.INLINE;
				String direction = (String) graph.getCellStyle(glyph).get(mxConstants.STYLE_DIRECTION);
				if (direction != null && !direction.equals("east")) {
					orientation = OrientationType.REVERSECOMPLEMENT;
				}
				int length = getSequenceLength(document, glyphCD);
				if (length > 0) {
					start = end + 1;
					end = start + length - 1;
					SequenceAnnotation annotation = compDef.createSequenceAnnotation(
							compDef.getDisplayId() + "Annotation" + count, "location" + count, start, end, orientation);
					annotation.setComponent(component.getIdentity());
				} else {
					SequenceAnnotation annotation = compDef.createSequenceAnnotation(
							compDef.getDisplayId() + "Annotation" + count, "location" + count, orientation);
					annotation.setComponent(component.getIdentity());
				}

				previous = component;
				count++;
			}
		}
	}

	private void attachTextBoxAnnotation(mxGraphModel model, mxCell viewCell, URI objectRef)
			throws SBOLValidationException, TransformerFactoryConfigurationError, TransformerException,
			URISyntaxException {

		// store extra mxGraph information
		Object[] viewChildren = mxGraphModel.getChildCells(model, viewCell, true, false);
		mxCell[] textBoxes = Arrays.stream(mxGraphModel.filterCells(viewChildren, textBoxFilter))
				.toArray(mxCell[]::new);

		for (mxCell textBox : textBoxes) {
			layoutHelper.addGraphicalNode(objectRef, "textBox", textBox);
		}
	}

	private static List<Annotation> convertCanvasAnnotations(CanvasAnnotation[] canvasAnnotations)
			throws SBOLValidationException {
		return convertCanvasAnnotations(canvasAnnotations, null);
	}

	private static List<Annotation> convertCanvasAnnotations(CanvasAnnotation[] canvasAnnotations, TopLevel topLevel)
			throws SBOLValidationException {
		ArrayList<Annotation> annotations = new ArrayList<Annotation>();
		for (CanvasAnnotation canvasAnn : canvasAnnotations) {
			Annotation annotation = null;
			QName qName = new QName(canvasAnn.getNamespaceURI(), canvasAnn.getLocalPart(), canvasAnn.getPrefix());
			if (canvasAnn.getStringValue() != null) {
				if (topLevel != null)
					annotation = topLevel.createAnnotation(qName, canvasAnn.getStringValue());
				else
					annotation = new Annotation(qName, canvasAnn.getStringValue());
			} else if (canvasAnn.getUriValue() != null) {
				if (topLevel != null)
					annotation = topLevel.createAnnotation(qName, canvasAnn.getUriValue());
				else
					annotation = new Annotation(qName, canvasAnn.getUriValue());
			} else if (canvasAnn.getAnnotations() != null) {
				QName nestedQName = new QName(canvasAnn.getNestedNamespaceURI(), canvasAnn.getNestedLocalPart(),
						canvasAnn.getNestedPrefix());
				List<Annotation> subAnnotations = convertCanvasAnnotations(canvasAnn.getAnnotations());
				if (topLevel != null) {
					annotation = topLevel.createAnnotation(qName, nestedQName, null, subAnnotations);
					annotation.setNestedIdentity(canvasAnn.getNestedURI());
				} else {
					// the nested annotation constructor is private, the only way to do this without
					// the parent annotation is to create an empty annotation
					annotation = new Annotation(qName, "");
					annotation.setNestedQName(nestedQName);
					annotation.setNestedIdentity(canvasAnn.getNestedURI());
					annotation.setAnnotations(subAnnotations);
				}
			}
			annotations.add(annotation);
		}

		return annotations;
	}

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

	private FunctionalComponent getOrCreateParticipant(SBOLDocument document, ModuleDefinition modDef,
			GlyphInfo partInfo, mxCell part) throws SBOLValidationException {
		FunctionalComponent sourceFC = modDef.getFunctionalComponent(partInfo.getDisplayID() + "_" + part.getId());
		if (sourceFC == null) {
			ComponentDefinition sourceCD = document.getComponentDefinition(URI.create((String) part.getValue()));
			sourceFC = modDef.createFunctionalComponent(partInfo.getDisplayID() + "_" + part.getId(), AccessType.PUBLIC,
					sourceCD.getIdentity(), DirectionType.INOUT);

			// the functional component doesn't represent a top level componentDefinition,
			// so create a mapsTo
			GlyphInfo parentInfo = glyphInfoDict.get(part.getParent().getValue());
			FunctionalComponent parentFC = modDef
					.getFunctionalComponent(parentInfo.getDisplayID() + "_" + part.getParent().getId());
			ComponentDefinition parentCD = parentFC.getDefinition();
			String componentID = partInfo.getDisplayID() + "_" + part.getParent().getIndex(part);
			Component sourceComponent = parentCD.getComponent(componentID);
			parentFC.createMapsTo("mapsTo_" + componentID, RefinementType.USEREMOTE, sourceFC.getIdentity(),
					sourceComponent.getIdentity());
		}
		return sourceFC;
	}

	private mxGraph parseGraph(InputStream graphStream) throws IOException {
		mxGraph graph = new mxGraph();
		((mxGraphModel) graph.getModel()).setMaintainEdgeParent(false);
		Document document = mxXmlUtils.parseXml(mxUtils.readInputStream(graphStream));
		mxCodec codec = new mxCodec(document);
		codec.decode(document.getDocumentElement(), graph.getModel());
		return graph;
	}

}
