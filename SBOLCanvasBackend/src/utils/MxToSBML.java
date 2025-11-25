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
import java.util.LinkedHashMap;

import org.sbolstandard.core2.SequenceOntology;
import org.sbolstandard.core2.SystemsBiologyOntology;

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

import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGeometry;
import com.mxgraph.model.mxGraphModel;
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

	/**
	 * Helper class to group Transcriptional Unit (TU) data.
	 * Backbone is the map key, not stored in the class.
	 */
	private static class TUData {
		mxCell promoterGlyph; // For finding regulation edges (Inhibition/Stimulation)
		Species promoterSpecies; // JSBML Promoter Species object (get ID via .getId())
		List<mxCell> productionEdges;

		TUData(mxCell promoterGlyph, Species promoterSpecies) {
			this.promoterGlyph = promoterGlyph;
			this.promoterSpecies = promoterSpecies;
			this.productionEdges = new ArrayList<>();
		}
	}

	/**
	 * Helper class to bundle Species with its layout geometry.
	 * Key is glyph.getValue() (GlyphInfo URI).
	 */
	private static class SpeciesData {
		Species species; // JSBML Species object
		mxGeometry geometry; // For layout position

		SpeciesData(Species species, mxGeometry geometry) {
			this.species = species;
			this.geometry = geometry;
		}
	}

	/**
	 * Helper class to calculate canvas bounding box.
	 * Find max/min glyph coordinates, normalize layout to those dimensions.
	 */
	private static class LayoutBounds {
		double minX = Double.MAX_VALUE;
		double minY = Double.MAX_VALUE;
		double maxX = Double.MIN_VALUE;
		double maxY = Double.MIN_VALUE;

		void update(mxGeometry geom) {
			if (geom == null)
				return;
			minX = Math.min(minX, geom.getX());
			minY = Math.min(minY, geom.getY());
			maxX = Math.max(maxX, geom.getX() + geom.getWidth());
			maxY = Math.max(maxY, geom.getY() + geom.getHeight());
		}

		double getCanvasWidth(double buffer) {
			return maxX - minX + 2 * buffer;
		}

		double getCanvasHeight(double buffer) {
			return maxY - minY + 2 * buffer;
		}

		double normalizeX(double x, double buffer) {
			return x - minX + buffer;
		}

		double normalizeY(double y, double buffer) {
			return y - minY + buffer;
		}
	}

	private HashMap<String, String> userTokens;
	private HashSet<String> usedIds = new HashSet<>();
	private LayoutBounds layoutBounds = new LayoutBounds();
	private HashMap<String, SpeciesData> glyphToSpeciesData = new HashMap<>();

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
		// Load mxGraph and dictionaries
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

		// PHASE 1: Create all species
		HashMap<mxCell, TUData> tuMap = createPromoterSpecies(sbmlModel, model, viewCells);
		createMolecularSpecies(sbmlModel, model, viewCells);


	/**
	 * Scan all backbones, find promoter, create SBML promoter species.
	 * Returns a map of backbone -> TUData. Each backbone = one TU. 
	 * Find first promoter glyph on each backbone.
	 */
	private HashMap<mxCell, TUData> createPromoterSpecies(Model sbmlModel, mxGraphModel graphModel,
			mxCell[] viewCells) {
		HashMap<mxCell, TUData> tuMap = new HashMap<>();

		for (mxCell viewCell : viewCells) {
			Object[] viewChildren = mxGraphModel.getChildCells(graphModel, viewCell, true, false);
			mxCell[] backbones = Arrays.stream(mxGraphModel.filterCells(viewChildren, containerFilter))
					.toArray(mxCell[]::new);

			for (mxCell backbone : backbones) {
				Object[] containerChildren = mxGraphModel.getChildCells(graphModel, backbone, true, false);
				mxCell[] glyphs = Arrays.stream(mxGraphModel.filterCells(containerChildren, sequenceFeatureFilter))
						.toArray(mxCell[]::new);

				// Find first promoter glyph
				mxCell promoterGlyph = null;
				for (mxCell glyph : glyphs) {
					GlyphInfo info = (GlyphInfo) infoDict.get(glyph.getValue());
					if (info != null && info.getPartRole() != null && info.getPartRole().contains("Promoter")) {
						promoterGlyph = glyph;
						break;
					}
				}

				// Future validation: Check before export, inform that backbone is missing a promoter
				if (promoterGlyph == null) {
					throw new IllegalArgumentException("Backbone has no promoter glyph: " + backbone.getId());
				}

				// Create promoter species
				GlyphInfo promoterInfo = (GlyphInfo) infoDict.get(promoterGlyph.getValue());
				String promoterName = promoterInfo.getName();
				if (promoterName == null || promoterName.isEmpty()) {
					promoterName = promoterInfo.getDisplayID();
				}
				String promoterId = sanitizeId(promoterName);

				Species promoterSpecies = sbmlModel.createSpecies(promoterId);
				promoterSpecies.setCompartment("Cell");
				promoterSpecies.setSBOTerm(590); // SBO:0000590 Logical element (promoter)

				// Set initial amount from ng parameter
				double ng = getParam(promoterInfo.getSimulationData(), "ng", SequenceOntology.PROMOTER);
				promoterSpecies.setInitialAmount(ng);
				promoterSpecies.setHasOnlySubstanceUnits(true);
				promoterSpecies.setConstant(false);
				promoterSpecies.setBoundaryCondition(false);

				if (promoterInfo.getName() != null && !promoterInfo.getName().isEmpty()) {
					promoterSpecies.setName(promoterInfo.getName());
				}

				// Store SpeciesData for promoter species (Species + backbone geometry)
				mxGeometry backboneGeom = backbone.getGeometry();
				glyphToSpeciesData.put((String) promoterGlyph.getValue(),
						new SpeciesData(promoterSpecies, backboneGeom));
				layoutBounds.update(backboneGeom);

				// Store TU data
				tuMap.put(backbone, new TUData(promoterGlyph, promoterSpecies));
			}
		}

		return tuMap;
	}

	/**
	 * Create molecular species (proteins, small molecules, complexes, etc).
	 */
	private void createMolecularSpecies(Model sbmlModel, mxGraphModel graphModel, mxCell[] viewCells) {
		for (mxCell viewCell : viewCells) {
			Object[] viewChildren = mxGraphModel.getChildCells(graphModel, viewCell, true, false);
			mxCell[] speciesGlyphs = Arrays.stream(mxGraphModel.filterCells(viewChildren, molecularSpeciesFilter))
					.toArray(mxCell[]::new);

			for (mxCell glyph : speciesGlyphs) {
				Species species = createSpecies(sbmlModel, glyph);
				glyphToSpeciesData.put((String) glyph.getValue(),
						new SpeciesData(species, glyph.getGeometry()));
			}
		}
	}

	}

	/**

	/**
	 * Creates an SBML Species object from an SBOLCanvas molecular species glyph.
	 *
	 * @param model The SBML Model to add the species to.
	 * @param glyph The mxCell representing the species in the graph.
	 * @return The created Species object
	 */
	private Species createSpecies(Model model, mxCell glyph) {
		GlyphInfo glyphInfo = (GlyphInfo) infoDict.get(glyph.getValue());

		// Create the Species
		// https://sbml.org/jsbml/files/doc/api/1.6.1/org/sbml/jsbml/Species.html
		// `SBML ID` field is the label in iBioSim. Use Name, or fallback to Display ID
		String speciesId = glyphInfo.getDisplayID();
		if (glyphInfo.getName() != null && !glyphInfo.getName().isEmpty()) {
			speciesId = glyphInfo.getName();
		}
		speciesId = sanitizeId(speciesId);

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
		double initialAmount = 0.0;
		if (glyphInfo.getSimulationData() != null && glyphInfo.getSimulationData().containsKey("initialAmount")) {
			Object iaValue = glyphInfo.getSimulationData().get("initialAmount");
			if (iaValue instanceof Number) {
				initialAmount = ((Number) iaValue).doubleValue();
			} else if (iaValue instanceof String) {
				try {
					initialAmount = Double.parseDouble((String) iaValue);
				} catch (NumberFormatException e) {
					throw new IllegalArgumentException(
							"Invalid initialAmount value for species " + glyphInfo.getDisplayID() + ": " + iaValue, e);
				}
			}
		}
		species.setInitialAmount(initialAmount);
		// Set HasOnlySubstanceUnits
		// true = amount (molecules)
		species.setHasOnlySubstanceUnits(true);
		// Set Constant
		species.setConstant(false);

		// Track glyph bounds for layout
		layoutBounds.update(glyph.getGeometry());

		return species;
	}


	/**
	 * Gets a simulation parameter value.
	 * Get user-provided simulationData or fallback to SBOLData defaults.
	 */
	private double getParam(Hashtable<String, Object> simData, String paramName, URI type) {
		// Check user-provided value first
		if (simData != null && simData.containsKey(paramName)) {
			Object val = simData.get(paramName);
			if (val instanceof Number) {
				return ((Number) val).doubleValue();
			} else if (val instanceof String) {
				return Double.parseDouble((String) val);
			}
			throw new IllegalArgumentException("Invalid simulation param type for: " + paramName);
		}
		// Fall back to centralized defaults
		return getDefaultValue(type, paramName);
	}


	private double getDefaultValue(URI type, String paramName) {
		String key = null;
		if (SBOLData.roles.containsValue(type)) {
			key = SBOLData.roles.getKey(type);
		} else if (SBOLData.interactions.containsValue(type)) {
			key = SBOLData.interactions.getKey(type);
		}

		if (key == null) {
			throw new IllegalArgumentException("Unknown type URI: " + type);
		}

		LinkedHashMap<String, Object> params = SBOLData.getSimulationConfig().get(key);
		if (params == null) {
			throw new IllegalArgumentException("No simulation config for: " + key);
		}

		Object val = params.get(paramName);
		if (val == null) {
			throw new IllegalArgumentException("No default value for param: " + paramName + " in " + key);
		}

		if (val instanceof Number) {
			return ((Number) val).doubleValue();
		}
		throw new IllegalArgumentException("Invalid default value type for: " + paramName);
	}

	/**
	 * Sanitizes an ID to be a valid SBML SId. SBML SId must:
	 * - be unique
	 * - start with a letter or underscore
	 * - contain only letters, digits, and underscores
	 *
	 * @param id The raw ID string
	 * @return A valid, unique SBML SId
	 */
	private String sanitizeId(String id) {
		if (id == null || id.isEmpty()) {
			id = "unnamed";
		}
		// Replace invalid characters with underscore
		String sanitized = id.replaceAll("[^a-zA-Z0-9_]", "_");
		// Ensure it starts with a letter or underscore (not a digit)
		if (Character.isDigit(sanitized.charAt(0))) {
			sanitized = "_" + sanitized;
		}
		// Make unique: if ID already used, find next available suffix
		if (usedIds.contains(sanitized)) {
			int suffix = 2;
			while (usedIds.contains(sanitized + "_" + suffix)) {
				suffix++;
			}
			sanitized = sanitized + "_" + suffix;
		}
		usedIds.add(sanitized);
		return sanitized;
	}

}
