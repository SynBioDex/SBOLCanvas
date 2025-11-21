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
import javax.xml.stream.XMLStreamException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactoryConfigurationError;

// JSBML API Docs: https://sbml.org/jsbml/files/doc/api/1.6.1/overview-summary.html
import org.sbml.jsbml.SBMLDocument;
import org.sbml.jsbml.SBO;
import org.sbml.jsbml.Model;
import org.sbml.jsbml.Species;
import org.sbml.jsbml.Compartment;

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

public class MxToSBML extends Converter {

	private HashMap<String, String> userTokens;

	public MxToSBML() {
		this(null);
	}

	public MxToSBML(HashMap<String, String> userTokens) {
		infoDict = new Hashtable<String, Info>();
		combinatorialDict = new Hashtable<String, CombinatorialInfo>();
		interactionDict = new Hashtable<String, InteractionInfo>();
		this.userTokens = userTokens;
	}

	public void toSBML(InputStream graphStream, OutputStream sbmlStream)
			throws IOException, URISyntaxException, TransformerFactoryConfigurationError,
			TransformerException, SynBioHubException, XMLStreamException {

		SBMLDocument document = setupDocument(graphStream);

		// Write to SBML document stream
		// https://sbml.org/jsbml/files/doc/api/1.6.1/org/sbml/jsbml/SBMLWriter.html
		org.sbml.jsbml.TidySBMLWriter.write(document, sbmlStream, "SBOLCanvas", "1.0", ' ', (short) 2);
	}

	@SuppressWarnings("unchecked")
	private SBMLDocument setupDocument(InputStream graphStream) throws IOException,
			TransformerFactoryConfigurationError, TransformerException, URISyntaxException {
		// read in the mxGraph
		mxGraph graph = parseGraph(graphStream);
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell0 = (mxCell) model.getCell("0");
		ArrayList<Object> dataContainer = (ArrayList<Object>) cell0.getValue();
		infoDict = loadDictionary(dataContainer, INFO_DICT_INDEX);
		combinatorialDict = loadDictionary(dataContainer, COMBINATORIAL_DICT_INDEX);
		interactionDict = loadDictionary(dataContainer, INTERACTION_DICT_INDEX);

		// Create the SBML document
		// https://sbml.org/jsbml/files/doc/api/1.6.1/org/sbml/jsbml/SBMLDocument.html
		SBMLDocument document = new SBMLDocument(3, 2);

		// Create the model
		// https://sbml.org/jsbml/files/doc/api/1.6.1/org/sbml/jsbml/Model.html
		Model sbmlModel = document.createModel("sbolcanvas_model");

		// Create the default "Cell" compartment
		// https://sbml.org/jsbml/files/doc/api/1.6.1/org/sbml/jsbml/Compartment.html
		Compartment compartment = sbmlModel.createCompartment("Cell");
		compartment.setName("Cell");
		compartment.setSize(1.0);
		compartment.setConstant(true);

		// Search the graph to find species
		mxCell[] viewCells = Arrays.stream(mxGraphModel.getChildCells(model, model.getCell("1"), true, false))
				.toArray(mxCell[]::new);

		for (mxCell viewCell : viewCells) {
			// Filter for all "Molecular Species" glyphs
			Object[] viewChildren = mxGraphModel.getChildCells(model, viewCell, true, false);
			mxCell[] speciesGlyphs = Arrays.stream(mxGraphModel.filterCells(viewChildren, molecularSpeciesFilter))
					.toArray(mxCell[]::new);

			for (mxCell glyph : speciesGlyphs) {
				createSpecies(sbmlModel, glyph);
			}
		}

		return document;
	}

	/**
	 * Creates an SBML Species object from an SBOLCanvas glyph.
	 * 
	 * @param model The SBML Model to add the species to.
	 * @param glyph The mxCell representing the species in the graph.
	 */
	private void createSpecies(Model model, mxCell glyph) {
		GlyphInfo glyphInfo = (GlyphInfo) infoDict.get(glyph.getValue());

		// Create the Species
		// https://sbml.org/jsbml/files/doc/api/1.6.1/org/sbml/jsbml/Species.html
		// `SBML ID` field is the label in iBioSim. Use Name, or fallback to Display ID
		String speciesId = glyphInfo.getDisplayID();
		if (glyphInfo.getName() != null && !glyphInfo.getName().isEmpty()) {
			speciesId = glyphInfo.getName();
		}

		// (To Do) ID be valid SId format:
		//   - starts with a text character (add prefix)
		//   - no spaces (replace with _)
		//   - no special characters (replace with _)
		//   - unique (append count increment)

		Species species = model.createSpecies(speciesId);

		// Create Compartment (required)
		species.setCompartment("Cell");

		// Set Name (optional)
		if (glyphInfo.getName() != null && !glyphInfo.getName().isEmpty()) {
			species.setName(glyphInfo.getName());
		}

		// Set SBO term for species type
		String partType = glyphInfo.getPartType();
		URI typeURI = SBOLData.types.getValue(partType);

		if (typeURI != null) {
			if (typeURI.equals(org.sbolstandard.core2.ComponentDefinition.PROTEIN)) {
				// Protein -> Polypeptide chain (SBO:0000252)
				species.setSBOTerm(252);
			} else if (typeURI.equals(org.sbolstandard.core2.ComponentDefinition.DNA_MOLECULE) ||
					typeURI.equals(org.sbolstandard.core2.ComponentDefinition.DNA_REGION)) {
				// DNA -> Deoxyribonucleic acid (SBO:0000251)
				species.setSBOTerm(251);
			} else if (typeURI.equals(org.sbolstandard.core2.ComponentDefinition.RNA_MOLECULE) ||
					typeURI.equals(org.sbolstandard.core2.ComponentDefinition.RNA_REGION)) {
				// RNA -> Ribonucleic acid (SBO:0000250)
				species.setSBOTerm(250);
			} else if (typeURI.equals(org.sbolstandard.core2.ComponentDefinition.SMALL_MOLECULE)) {
				// Small molecule -> Simple chemical (SBO:0000247)
				species.setSBOTerm(247);
			} else if (typeURI.equals(org.sbolstandard.core2.ComponentDefinition.COMPLEX)) {
				// Complex -> Non-covalent complex (SBO:0000253)
				species.setSBOTerm(253);
			}
		}

		// Set Boundary Condition
		// Read from simulationData map, default to false if not set
		boolean boundaryCondition = false;
		if (glyphInfo.getSimulationData() != null && glyphInfo.getSimulationData().containsKey("boundaryCondition")) {
			Object bcValue = glyphInfo.getSimulationData().get("boundaryCondition");
			if (bcValue instanceof Boolean) {
				boundaryCondition = (Boolean) bcValue;
			} else if (bcValue instanceof String) {
				boundaryCondition = Boolean.parseBoolean((String) bcValue);
			}
		}
		species.setBoundaryCondition(boundaryCondition);

		// Set Initial Amount
		species.setInitialAmount(0.0);
		// Set HasOnlySubstanceUnits
		// true = amount (molecules)
		species.setHasOnlySubstanceUnits(true);
		// Set Constant
		species.setConstant(false);
	}

	// == helper methods
	// copied from `SBOLCanvasBackend/src/utils/MxToSBOL.java`
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
