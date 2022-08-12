package utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;
import java.util.Set;

import javax.xml.namespace.QName;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactoryConfigurationError;

import org.sbolstandard.core2.AccessType;
import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.CombinatorialDerivation;
import org.sbolstandard.core2.Component;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.DirectionType;
import org.sbolstandard.core2.FunctionalComponent;
import org.sbolstandard.core2.GenericTopLevel;
import org.sbolstandard.core2.Interaction;
import org.sbolstandard.core2.ModuleDefinition;
import org.sbolstandard.core2.OperatorType;
import org.sbolstandard.core2.Module;
import org.sbolstandard.core2.OrientationType;
import org.sbolstandard.core2.Participation;
import org.sbolstandard.core2.RefinementType;
import org.sbolstandard.core2.RestrictionType;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLValidationException;
import org.sbolstandard.core2.SBOLWriter;
import org.sbolstandard.core2.Sequence;
import org.sbolstandard.core2.SequenceAnnotation;
import org.sbolstandard.core2.StrategyType;
import org.sbolstandard.core2.SystemsBiologyOntology;
import org.sbolstandard.core2.TopLevel;
import org.sbolstandard.core2.VariableComponent;
import org.synbiohub.frontend.SynBioHubException;
import org.synbiohub.frontend.SynBioHubFrontend;
import org.w3c.dom.Document;

import com.mxgraph.io.mxCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.util.mxConstants;
import com.mxgraph.util.mxUtils;
import com.mxgraph.util.mxXmlUtils;
import com.mxgraph.view.mxGraph;

import data.CanvasAnnotation;
import data.Info;
import data.GlyphInfo;
import data.IdentifiedInfo;
import data.InteractionInfo;
import data.ModuleInfo;
import data.VariableComponentInfo;
import data.CombinatorialInfo;

public class MxToSBOL extends Converter {

	private HashMap<String, String> userTokens;

	public MxToSBOL() {
		this(null);
	}

	public MxToSBOL(HashMap<String, String> userTokens) {
		infoDict = new Hashtable<String, Info>();
		combinatorialDict = new Hashtable<String, CombinatorialInfo>();
		interactionDict = new Hashtable<String, InteractionInfo>();
		this.userTokens = userTokens;
	}

	public void toSBOL(InputStream graphStream, OutputStream sbolStream)
			throws IOException, SBOLConversionException, URISyntaxException, SBOLValidationException,
			TransformerFactoryConfigurationError, TransformerException, SynBioHubException {
		SBOLDocument document = setupDocument(graphStream);

		// write to body
		SBOLWriter.setKeepGoing(true);
		SBOLWriter.write(document, sbolStream);
	}

	public void toGenBank(InputStream graphStream, OutputStream outputStream)
			throws SBOLConversionException, IOException, URISyntaxException, SBOLValidationException,
			TransformerFactoryConfigurationError, TransformerException, SynBioHubException {
		SBOLDocument document = setupDocument(graphStream);

		// write to body
		SBOLWriter.setKeepGoing(true);
		SBOLWriter.write(document, outputStream, SBOLDocument.GENBANK);
	}

	public void toGFF(InputStream graphStream, OutputStream outputStream)
			throws IOException, SBOLConversionException, URISyntaxException, SBOLValidationException,
			TransformerFactoryConfigurationError, TransformerException, SynBioHubException {
		SBOLDocument document = setupDocument(graphStream);

		// write to body
		SBOLWriter.setKeepGoing(true);
		SBOLWriter.write(document, outputStream, SBOLDocument.GFF3format);
	}

	public void toFasta(InputStream graphStream, OutputStream outputStream)
			throws IOException, SBOLConversionException, URISyntaxException, SBOLValidationException,
			TransformerFactoryConfigurationError, TransformerException, SynBioHubException {
		SBOLDocument document = setupDocument(graphStream);

		// write to body
		SBOLWriter.setKeepGoing(true);
		SBOLWriter.write(document, outputStream, SBOLDocument.FASTAformat);
	}

	public void toSBOL1(InputStream graphStream, OutputStream outputStream)
			throws IOException, SBOLConversionException, URISyntaxException, SBOLValidationException,
			TransformerFactoryConfigurationError, TransformerException, SynBioHubException {
		SBOLDocument document = setupDocument(graphStream);

		// write to body
		SBOLWriter.setKeepGoing(true);
		SBOLWriter.write(document, outputStream, SBOLDocument.RDFV1);
	}

	@SuppressWarnings("unchecked")
	public SBOLDocument setupDocument(InputStream graphStream) throws IOException, URISyntaxException,
			SBOLValidationException, TransformerFactoryConfigurationError, TransformerException, SynBioHubException {
		// read in the mxGraph
		mxGraph graph = parseGraph(graphStream);
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell0 = (mxCell) model.getCell("0");
		ArrayList<Object> dataContainer = (ArrayList<Object>) cell0.getValue();
		infoDict = loadDictionary(dataContainer, INFO_DICT_INDEX);
		combinatorialDict = loadDictionary(dataContainer, COMBINATORIAL_DICT_INDEX);
		interactionDict = loadDictionary(dataContainer, INTERACTION_DICT_INDEX);

		// cells may show up in the child array not based on their x location
		enforceChildOrdering(model, graph);

		// create the document
		SBOLDocument document = new SBOLDocument();
		document.setDefaultURIprefix(URI_PREFIX);
		document.setComplete(true);
		document.setCreateDefaults(true);

		// add registries that we're logged into
		for (String key : userTokens.keySet()) {
			SynBioHubFrontend registry = document.addRegistry(key);
			registry.setUser(userTokens.get(key));
		}

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
				// module definitions
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

		// create the combinatorials
		for (CombinatorialInfo info : combinatorialDict.values()) {
			createCombinatorial(document, graph, model, info);
		}

		// link the combinatorials
		for (CombinatorialInfo info : combinatorialDict.values()) {
			linkCombinatorial(document, graph, model, info);
		}

		return document;
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

		ModuleInfo modInfo = (ModuleInfo) infoDict.get(viewCell.getId());

		// if the uri is one of the synbiohub ones, just add the layout
		boolean layoutOnly = false;
		for (String registry : SBOLData.registries) {
			if (modInfo.getUriPrefix().contains(registry)) {
				// if we're not logged in, it still needs to be added to the document
				if (document.getRegistry(registry) == null) {
					document.addRegistry(registry);
				}
				if (userTokens.containsKey(registry) || modInfo.getUriPrefix().contains("/public/")) {
					layoutOnly = true;
					break;
				}
			}
		}

		if (modInfo.getUriPrefix() == null || modInfo.getUriPrefix().equals(""))
			modInfo.setUriPrefix(URI_PREFIX);
		
		ModuleDefinition modDef = null;
		if(layoutOnly) {
			modDef = document.getModuleDefinition(new URI(modInfo.getFullURI()));
		}else {
			modDef = document.createModuleDefinition(modInfo.getUriPrefix(), modInfo.getDisplayID(),
					modInfo.getVersion());			
		}
		layoutHelper.createGraphicalLayout(modDef.getIdentity(), modDef.getDisplayId() + "_Layout");

		// text boxes
		if (textBoxes.length > 0) {
			attachTextBoxAnnotation(model, viewCell, modDef.getIdentity());
		}
		
		// proteins
		for (mxCell protein : proteins) {
			// proteins also have glyphInfos
			GlyphInfo proteinInfo = (GlyphInfo) infoDict.get(protein.getValue());
			if (proteinInfo.getUriPrefix() == null)
				proteinInfo.setUriPrefix(URI_PREFIX);
			FunctionalComponent proteinFuncComp = null;
			if (!layoutOnly) {
				ComponentDefinition proteinCD = document.getComponentDefinition(new URI((String) protein.getValue()));
				if (proteinCD == null) {
					proteinCD = document.createComponentDefinition(proteinInfo.getUriPrefix(),
							proteinInfo.getDisplayID(), proteinInfo.getVersion(),
							SBOLData.types.getValue(proteinInfo.getPartType()));
					proteinCD.setDescription(proteinInfo.getDescription());
					proteinCD.setName(proteinInfo.getName());
					proteinCD.addRole(SystemsBiologyOntology.INHIBITOR); // TODO determine from interaction
				}
				proteinFuncComp = modDef.createFunctionalComponent(proteinCD.getDisplayId() + "_" + protein.getId(),
						AccessType.PUBLIC, proteinCD.getIdentity(), DirectionType.INOUT);
			} else {
				// find the correct functionalComponent from the set of functional components
				Set<FunctionalComponent> funcComps = modDef.getFunctionalComponents();
				for (FunctionalComponent funcComp : funcComps) {
					if (funcComp.getDefinitionIdentity().toString().equals((String) protein.getValue())) {
						proteinFuncComp = funcComp;
						break;
					}
				}
			}
			// the layout information in the component definition
			layoutHelper.addGraphicalNode(modDef.getIdentity(), proteinFuncComp.getDisplayId(), protein);
		}

		// component definitions (should already have been created, just need to link
		// them with functional components)
		for (mxCell circuitContainer : circuitContainers) {

			GlyphInfo glyphInfo = (GlyphInfo) infoDict.get(circuitContainer.getValue());
			FunctionalComponent circuitFuncComp = null;
			if (!layoutOnly) {
				circuitFuncComp = modDef.createFunctionalComponent(
						glyphInfo.getDisplayID() + "_" + circuitContainer.getId(), AccessType.PUBLIC,
						URI.create(glyphInfo.getFullURI()), DirectionType.INOUT);
			} else {
				Set<FunctionalComponent> funcComps = modDef.getFunctionalComponents();
				for (FunctionalComponent funcComp : funcComps) {
					if (funcComp.getDefinitionIdentity().toString().equals((String) circuitContainer.getValue())) {
						circuitFuncComp = funcComp;
						break;
					}
				}
			}
			// store extra graph information
			layoutHelper.addGraphicalNode(modDef.getIdentity(), circuitFuncComp.getDisplayId(), circuitContainer);
			GenericTopLevel layout = layoutHelper.getGraphicalLayout(URI.create(glyphInfo.getFullURI()));
			layoutHelper.addLayoutRef(modDef.getIdentity(), layout.getIdentity(),
					glyphInfo.getDisplayID() + "_Reference");
		}
	}

	private void createComponentDefinition(SBOLDocument document, mxGraph graph, mxGraphModel model,
			mxCell circuitContainer) throws URISyntaxException, SBOLValidationException,
			TransformerFactoryConfigurationError, TransformerException, SynBioHubException {

		// get the glyph info associated with this view cell
		GlyphInfo glyphInfo = (GlyphInfo) infoDict.get(circuitContainer.getValue());

		// store extra mxGraph information
		Object[] containerChildren = mxGraphModel.getChildCells(model, circuitContainer, true, false);
		mxCell backboneCell = (mxCell) mxGraphModel.filterCells(containerChildren, backboneFilter)[0];
		URI identity = URI.create(glyphInfo.getFullURI());
		layoutHelper.createGraphicalLayout(identity, glyphInfo.getDisplayID() + "_Layout");
		layoutHelper.addGraphicalNode(identity, "container", circuitContainer);
		layoutHelper.addGraphicalNode(identity, "backbone", backboneCell);

		// if the uri is one of the synbiohub ones, skip the object
		for (String registry : SBOLData.registries) {
			if (glyphInfo.getUriPrefix().contains(registry)) {
				// if we're not logged in, it still needs to be added to the document
				if (document.getRegistry(registry) == null) {
					document.addRegistry(registry);
				}
				if (userTokens.containsKey(registry) || glyphInfo.getUriPrefix().contains("/public/")) {
					return;
				}
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

	private void createCombinatorial(SBOLDocument document, mxGraph graph, mxGraphModel model,
			CombinatorialInfo combInfo) throws SBOLValidationException {
		if (combInfo.getUriPrefix() == null)
			combInfo.setUriPrefix(URI_PREFIX.substring(0, URI_PREFIX.length() - 1));

		// create the combinatorial
		CombinatorialDerivation combDer = document.createCombinatorialDerivation(combInfo.getUriPrefix(),
				combInfo.getDisplayID(), combInfo.getVersion(), URI.create(combInfo.getTemplateURI()));

		// set fields the constructor doesn't give access to
		String strategy = combInfo.getStrategy();
		if (strategy != null) {
			switch (strategy) {
			case "Enumerate":
				combDer.setStrategy(StrategyType.ENUMERATE);
				break;
			case "Sample":
				combDer.setStrategy(StrategyType.SAMPLE);
				break;
			}
		}
		combDer.setName(combInfo.getName());
		combDer.setDescription(combInfo.getDescription());
	}

	private void linkModuleDefinition(SBOLDocument document, mxGraph graph, mxGraphModel model, mxCell viewCell)
			throws SBOLValidationException, TransformerFactoryConfigurationError, TransformerException,
			URISyntaxException {
		mxCell[] viewChildren = Arrays.stream(mxGraphModel.getChildCells(model, viewCell, true, false))
				.toArray(mxCell[]::new);
		mxCell[] modules = Arrays.stream(mxGraphModel.filterCells(viewChildren, moduleFilter)).toArray(mxCell[]::new);
		mxCell[] interactionNodes = Arrays.stream(mxGraphModel.filterCells(viewChildren, interactionNodeFilter))
				.toArray(mxCell[]::new);

		// filter out all edges that connect to interaction nodes
		ArrayList<mxCell> uniqueInteractionCells = new ArrayList<mxCell>();
		for (mxCell edge : Arrays.stream(mxGraphModel.getChildCells(model, viewCell, false, true))
				.toArray(mxCell[]::new)) {
			mxCell source = ((mxCell) edge.getSource());
			mxCell target = ((mxCell) edge.getTarget());
			if ((source != null && source.getStyle().contains(STYLE_INTERACTION_NODE))
					|| (target != null && target.getStyle().contains(STYLE_INTERACTION_NODE))) {
				continue;
			}
			uniqueInteractionCells.add(edge);
		}
		for (mxCell interactionNode : interactionNodes) {
			uniqueInteractionCells.add(interactionNode);
		}
		mxCell[] interactionCells = uniqueInteractionCells.toArray(new mxCell[0]);

		ModuleDefinition modDef = document.getModuleDefinition(URI.create((String) viewCell.getId()));

		ModuleInfo modDefInfo = (ModuleInfo) infoDict.get(modDef.getIdentity().toString());

		// if the uri is one of the synbiohub ones, just add the layout
		boolean layoutOnly = false;
		for (String registry : SBOLData.registries) {
			if (modDefInfo.getUriPrefix().contains(registry)
					&& (userTokens.containsKey(registry) || modDefInfo.getUriPrefix().contains("/public/"))) {
				layoutOnly = true;
				break;
			}
		}

		// module definitions (should already have been created, just need to link
		// them with modules
		if (!layoutOnly) {
			for (mxCell moduleCell : modules) {
				ModuleInfo modInfo = (ModuleInfo) infoDict.get(moduleCell.getValue());
				modDef.createModule(modInfo.getDisplayID() + "_" + moduleCell.getParent().getIndex(moduleCell),
						URI.create((String) moduleCell.getValue()));
				layoutHelper.addGraphicalNode(modDef.getIdentity(),
						modInfo.getDisplayID() + "_" + moduleCell.getParent().getIndex(moduleCell), moduleCell);
			}
		}

		// edges to interactions
		for (mxCell interactionCell : interactionCells) {
			InteractionInfo intInfo = interactionDict.get(interactionCell.getValue());
			Interaction interaction = null;
			if (!layoutOnly) {
				interaction = modDef.createInteraction(intInfo.getDisplayID(),
						SBOLData.interactions.getValue(intInfo.getInteractionType()));
			} else {
				Set<Interaction> interactions = modDef.getInteractions();
				// find the interaction with the correct identity
				for (Interaction inter : interactions) {
					// TODO don't use startsWith here, inter.getIdentity() is including the version number, which isn't tracked in the front end
					if (inter.getIdentity().toString().startsWith((String) intInfo.getFullURI())) {
						interaction = inter;
						break;
					}
				}
			}
			layoutHelper.addGraphicalNode(modDef.getIdentity(), interaction.getDisplayId(), interactionCell);
			if (interactionCell.getStyle().contains(STYLE_INTERACTION_NODE) && layoutOnly) {
				mxCell[] interactionEdges = Arrays.stream(mxGraphModel.getEdges(model, interactionCell))
						.toArray(mxCell[]::new);
				for (mxCell interactionEdge : interactionEdges) {
					attachEdgeToParticipant(document, model, modDef, interaction, layoutOnly, intInfo, interactionEdge);
				}
			}

			// No layout stuff below this part
			if (layoutOnly) {
				return;
			}

			// populate sources and targets
			if (interactionCell.getStyle().contains(STYLE_INTERACTION_NODE)) {
				// multiple sources/targets
				mxCell[] interactionEdges = Arrays.stream(mxGraphModel.getEdges(model, interactionCell))
						.toArray(mxCell[]::new);
				for (mxCell interactionEdge : interactionEdges) {
					boolean isSource = !interactionEdge.getSource().equals(interactionCell);
					addParticipant(document, model, modDef, interaction, isSource, intInfo, interactionEdge);
				}
			} else {
				// single source/target
				addParticipant(document, model, modDef, interaction, true, intInfo, interactionCell);
				addParticipant(document, model, modDef, interaction, false, intInfo, interactionCell);
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
				GlyphInfo info = (GlyphInfo) infoDict.get(glyph.getValue());
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
				GlyphInfo info = (GlyphInfo) infoDict.get(glyph.getValue());
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

	private void linkCombinatorial(SBOLDocument document, mxGraph graph, mxGraphModel model, CombinatorialInfo combInfo)
			throws SBOLValidationException {
		// pull the previously created combinatorial
		CombinatorialDerivation combDer = document.getCombinatorialDerivation(URI.create(combInfo.getFullURI()));

		// get the template, so we can get it's components
		ComponentDefinition template = combDer.getTemplate();
		List<Component> components = template.getSortedComponents();

		// create the variable components
		for (VariableComponentInfo varCompInfo : combInfo.getVariableComponents().values()) {
			if (varCompInfo.getCellID() == null)
				continue;
			// figure out what the operator is
			OperatorType operator = null;
			String operatorString = varCompInfo.getOperator();
			if (operatorString == null)
				operatorString = "";
			switch (operatorString) {
			case "Zero Or One":
				operator = OperatorType.ZEROORONE;
				break;
			case "Zero Or More":
				operator = OperatorType.ZEROORMORE;
				break;
			case "One Or More":
				operator = OperatorType.ONEORMORE;
				break;
			default:
				operator = OperatorType.ONE;
			}

			// we assume that the component is at the same index as the sorted glyphs
			// because we don't have a good way of associating glyphs to components
			// otherwise
			mxCell variableCell = (mxCell) model.getCell(varCompInfo.getCellID());
			Component component = components.get(variableCell.getParent().getIndex(variableCell) - 1);
			VariableComponent varComp = combDer.createVariableComponent(component.getDisplayId() + "_VariableComponent",
					operator, component.getIdentity());
			for (IdentifiedInfo idInfo : varCompInfo.getVariants()) {
				URI partURI = URI.create(idInfo.getUri());
				addRegistry(document, partURI);
				switch (idInfo.getType()) {
				case "collection":
					boolean complete = document.isComplete();
					document.setComplete(false);
					varComp.addVariantCollection(partURI);
					document.setComplete(complete);
					break;
				case "combinatorial":
					varComp.addVariantDerivation(partURI);
					break;
				default:
					varComp.addVariant(partURI);
				}
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

	/**
	 * Adds the registry that the partURI references, if it isn't already added
	 * 
	 * @param document
	 * @param partURI
	 */
	private static void addRegistry(SBOLDocument document, URI partURI) {
		List<SynBioHubFrontend> registries = document.getRegistries();
		// check if it's already been added
		for (SynBioHubFrontend registry : registries) {
			if (partURI.toString().startsWith(registry.getBackendUrl())) {
				return;
			}
		}

		// it wasn't found, so we need to add it without a user token
		// in the future when we allow registries not in the registry list, it's
		// probably best to have the frontend send send it without a user token
		for (String registry : SBOLData.registries) {
			if (partURI.toString().startsWith(registry)) {
				document.addRegistry(registry);
				return;
			}
		}
	}

	/**
	 * Enforces that children of circuit containers start with the backbone, and are
	 * then sorted by their x position.
	 * 
	 * @param model
	 * @param graph
	 */
	private static void enforceChildOrdering(mxGraphModel model, mxGraph graph) {
		mxCell[] viewCells = Arrays.stream(mxGraphModel.getChildCells(model, model.getCell("1"), true, false))
				.toArray(mxCell[]::new);

		for (mxCell viewCell : viewCells) {
			mxCell[] viewChildren = Arrays.stream(mxGraphModel.getChildCells(model, viewCell, true, false))
					.toArray(mxCell[]::new);
			mxCell[] circuitContainers = Arrays.stream(mxGraphModel.filterCells(viewChildren, containerFilter))
					.toArray(mxCell[]::new);
			for (mxCell circuitContainer : circuitContainers) {
				// get the children of the circuit container
				mxCell[] containerChildren = Arrays
						.stream(mxGraphModel.getChildCells(model, circuitContainer, true, false))
						.toArray(mxCell[]::new);
				// sort the children based on x with the backbone at the 0'th position
				Arrays.sort(containerChildren, new Comparator<mxCell>() {
					@Override
					public int compare(mxCell o1, mxCell o2) {
						if (o1.getStyle().contains(STYLE_BACKBONE))
							return -1;
						else if (o2.getStyle().contains(STYLE_BACKBONE)) {
							return 1;
						} else {
							return o1.getGeometry().getX() < o2.getGeometry().getX() ? -1 : 1;
						}
					}
				});

				// remove all the cells from the circuit container
				for (mxCell cell : containerChildren) {
					circuitContainer.remove(cell);
				}

				// add them back at the proper index
				for (int i = 0; i < containerChildren.length; i++) {
					model.add(circuitContainer, containerChildren[i], i);
				}
			}
		}
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

	private void attachEdgeToParticipant(SBOLDocument document, mxGraphModel model, ModuleDefinition modDef,
			Interaction interaction, boolean isSource, InteractionInfo intInfo, mxCell interactionEdge)
			throws URISyntaxException, SBOLValidationException {
		mxCell participantCell = null;
		GlyphInfo participantInfo = null;
		if (isSource) {
			participantCell = (mxCell) interactionEdge.getSource();
		} else {
			participantCell = (mxCell) interactionEdge.getTarget();
		}

		// get the necessary info to generate a participant
		if (participantCell != null && participantCell.getStyle().contains(STYLE_MODULE)) {
			String subPartURI = null;
			if (isSource) {
				subPartURI = intInfo.getFromURI().get(interactionEdge.getId());
			} else {
				subPartURI = intInfo.getToURI().get(interactionEdge.getId());
			}
			String subPartCellID = subPartURI.substring(subPartURI.lastIndexOf("_") + 1);
			String subPartID = subPartURI.substring(0, subPartURI.lastIndexOf("_"));
			participantInfo = (GlyphInfo) infoDict.get(subPartID);
			participantCell = (mxCell) model.getCell(subPartCellID);
		} else if (participantCell != null) {
			participantInfo = (GlyphInfo) infoDict.get(participantCell.getValue());
		}
		Set<Participation> participations = interaction.getParticipations();
		for (Participation participation : participations) {
			FunctionalComponent funcComp = participation.getParticipant();
			if (funcComp.getDefinitionURI().equals(new URI(participantInfo.getFullURI()))) {
				// probably needs something to identify duplicate parts with separate mapstos,
				// but we're getting close to sbol3 where that shouldn't be a problem
				layoutHelper.addGraphicalNode(modDef.getIdentity(), participation.getDisplayId(), interactionEdge);
			}
		}
	}

	private void addParticipant(SBOLDocument document, mxGraphModel model, ModuleDefinition modDef,
			Interaction interaction, boolean isSource, InteractionInfo intInfo, mxCell interactionEdge)
			throws SBOLValidationException {
		mxCell participantCell = null;
		mxCell participantParentCell = null;
		GlyphInfo participantInfo = null;
		if (isSource) {
			participantCell = (mxCell) interactionEdge.getSource();
		} else {
			participantCell = (mxCell) interactionEdge.getTarget();
		}

		// get the necessary info to generate a participant
		if (participantCell != null && participantCell.getStyle().contains(STYLE_MODULE)) {
			String subPartURI = null;
			if (isSource) {
				subPartURI = intInfo.getFromURI().get(interactionEdge.getId());
			} else {
				subPartURI = intInfo.getToURI().get(interactionEdge.getId());
			}
			String subPartCellID = subPartURI.substring(subPartURI.lastIndexOf("_") + 1);
			String subPartID = subPartURI.substring(0, subPartURI.lastIndexOf("_"));
			participantInfo = (GlyphInfo) infoDict.get(subPartID);
			participantParentCell = participantCell;
			participantCell = (mxCell) model.getCell(subPartCellID);
		} else if (participantCell != null) {
			participantInfo = (GlyphInfo) infoDict.get(participantCell.getValue());
			participantParentCell = (mxCell) participantCell.getParent();
		}
        // More null checking here; was getting NullPointerException sometimes
		if (document != null && modDef != null && participantInfo != null && 
                participantCell != null && participantParentCell != null) {
			FunctionalComponent participantFC = getOrCreateParticipantFC(document, modDef, participantInfo,
					participantCell, participantParentCell);
			URI participantRole = getParticipantType(isSource, interaction.getTypes());
			// extract the role refinment if there is one
			if (isSource) {
				String refinementName = intInfo.getSourceRefinement().get(interactionEdge.getId());
				if (refinementName != null)
					participantRole = SBOLData.getInteractionRoleRefinementFromName(refinementName);
			} else {
				String refinementName = intInfo.getTargetRefinement().get(interactionEdge.getId());
				if (refinementName != null)
					participantRole = SBOLData.getInteractionRoleRefinementFromName(refinementName);
			}
			// Issue with display id causing duplicate references in layout
			Participation participation = interaction.createParticipation(
					intInfo.getDisplayID() + "_" + interaction.getParticipations().size(), participantFC.getIdentity(),
					participantRole);
			if ((isSource && interactionEdge.getTarget() != null
					&& interactionEdge.getTarget().getStyle().contains(STYLE_INTERACTION_NODE))
					|| (!isSource && interactionEdge.getSource() != null
							&& interactionEdge.getSource().getStyle().contains(STYLE_INTERACTION_NODE))) {
				layoutHelper.addGraphicalNode(modDef.getIdentity(), participation.getDisplayId(), interactionEdge);
			}
		}
        else {
            System.out.println("RELATED TO GITHUB ISSUE #174: FAILED NULL CHECK");
        }
	}

	private FunctionalComponent getOrCreateParticipantFC(SBOLDocument document, ModuleDefinition modDef,
			GlyphInfo partInfo, mxCell part, mxCell parent) throws SBOLValidationException {
		FunctionalComponent sourceFC = modDef.getFunctionalComponent(partInfo.getDisplayID() + "_" + part.getId());

		if (sourceFC == null) {
			ComponentDefinition sourceCD = document.getComponentDefinition(URI.create((String) part.getValue()));
			sourceFC = modDef.createFunctionalComponent(partInfo.getDisplayID() + "_" + part.getId(), AccessType.PUBLIC,
					sourceCD.getIdentity(), DirectionType.INOUT);

			// the functional component doesn't represent a top level componentDefinition,
			// so create a mapsTo
			if (parent.getStyle().contains(STYLE_MODULE)) {
				ModuleInfo parentInfo = (ModuleInfo) infoDict.get(parent.getValue());
				Module parentModule = modDef
						.getModule(parentInfo.getDisplayID() + "_" + parent.getParent().getIndex(parent));
				FunctionalComponent remoteFC = parentModule.getDefinition()
						.getFunctionalComponent(partInfo.getDisplayID() + "_" + part.getId());
				String componentID = partInfo.getDisplayID() + "_" + part.getParent().getIndex(part);
				parentModule.createMapsTo("mapsTo_" + componentID, RefinementType.USEREMOTE, sourceFC.getIdentity(),
						remoteFC.getIdentity());

			} else {
				GlyphInfo parentInfo = (GlyphInfo) infoDict.get(parent.getValue());
				FunctionalComponent parentFC = modDef
						.getFunctionalComponent(parentInfo.getDisplayID() + "_" + parent.getId());
				ComponentDefinition parentCD = parentFC.getDefinition();
				String componentID = partInfo.getDisplayID() + "_" + parent.getIndex(part);
				Component sourceComponent = parentCD.getComponent(componentID);
				parentFC.createMapsTo("mapsTo_" + componentID, RefinementType.USEREMOTE, sourceFC.getIdentity(),
						sourceComponent.getIdentity());
			}

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

	/**
	 * Dictionaries from the front end sometimes get decoded as array lists. This
	 * method ensures that we load them as hash tables.
	 * 
	 * @param <T>
	 * @param dataContainer
	 * @param dictionaryIndex
	 */
	@SuppressWarnings("unchecked")
	private <T extends Info> Hashtable<String, T> loadDictionary(ArrayList<Object> dataContainer, int dictionaryIndex) {
		// previously was getting out of bounds exception sometimes, 
        // hoping to catch it with this
        if(dictionaryIndex >= dataContainer.size()) {
            System.out.println("ARRAY INDEX OUT OF BOUNDS: " + dictionaryIndex);
            return new Hashtable<String, T>();
        }
        if (dataContainer.get(dictionaryIndex) instanceof ArrayList) {
			// 90% sure it only happens when it's empty meaning that we could just return a
			// empty hash table.
			Hashtable<String, T> dict = new Hashtable<String, T>();
			for (T item : (ArrayList<T>) dataContainer.get(dictionaryIndex)) {
				// nasty instanceof as I couldn't convince the compiler that the abstract method
				// is guaranteed to be implemented
				if (item instanceof GlyphInfo) {
					dict.put(((GlyphInfo) item).getFullURI(), item);
				} else if (item instanceof ModuleInfo) {
					dict.put(((ModuleInfo) item).getFullURI(), item);
				} else if (item instanceof CombinatorialInfo) {
					dict.put(((CombinatorialInfo) item).getFullURI(), item);
				} else if (item instanceof InteractionInfo) {
					dict.put(((InteractionInfo) item).getFullURI(), item);
				}
			}
			return dict;
		} else {
			return (Hashtable<String, T>) dataContainer.get(dictionaryIndex);
		}
	}

}
