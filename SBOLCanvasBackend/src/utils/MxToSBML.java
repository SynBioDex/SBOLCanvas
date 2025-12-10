package utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayInputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
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
import org.sbml.jsbml.Reaction;
import org.sbml.jsbml.KineticLaw;
import org.sbml.jsbml.LocalParameter;
import org.sbml.jsbml.SpeciesReference;
import org.sbml.jsbml.ModifierSpeciesReference;
import org.sbml.jsbml.ASTNode;
import org.sbml.jsbml.text.parser.FormulaParser;
import org.sbml.jsbml.Event;
import org.sbml.jsbml.Trigger;
import org.sbml.jsbml.Delay;
import org.sbml.jsbml.EventAssignment;
import org.sbml.jsbml.ext.layout.BoundingBox;
import org.sbml.jsbml.ext.layout.CompartmentGlyph;
import org.sbml.jsbml.ext.layout.Curve;
import org.sbml.jsbml.ext.layout.Layout;
import org.sbml.jsbml.ext.layout.LayoutModelPlugin;
import org.sbml.jsbml.ext.layout.LineSegment;
import org.sbml.jsbml.ext.layout.ReactionGlyph;
import org.sbml.jsbml.ext.layout.SpeciesGlyph;
import org.sbml.jsbml.ext.layout.SpeciesReferenceGlyph;
import org.sbml.jsbml.ext.layout.SpeciesReferenceRole;

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
import data.EventInfo;

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
		eventDict = new Hashtable<String, EventInfo>();
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
		eventDict = loadDictionary(dataContainer, EVENT_DICT_INDEX);

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

		// PHASE 2: Create all reactions
		createProductionReactions(sbmlModel, model, viewCells, tuMap);
		createDegradationReactions(sbmlModel, model, viewCells);
		createComplexReactions(sbmlModel, model, viewCells);

		// PHASE 3: Create visual layout
		createVisualLayout(sbmlModel);

		// PHASE 4: Create events
		createEvents(sbmlModel);

		return document;
	}

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

	/**
	 * Create production reactions for each TU.
	 * Collect production edges by backbone and creates one reaction per TU with all products.
	 */
	private void createProductionReactions(Model sbmlModel, mxGraphModel graphModel, mxCell[] viewCells,
			HashMap<mxCell, TUData> tuMap) {
		// Collect production edges by TU
		for (mxCell viewCell : viewCells) {
			Object[] allChildren = mxGraphModel.getChildCells(graphModel, viewCell, true, true);

			for (Object child : allChildren) {
				if (!(child instanceof mxCell)) {
					continue;
				}

				mxCell cell = (mxCell) child;

				if (cell.isEdge()) {
					InteractionInfo info = (InteractionInfo) interactionDict.get(cell.getValue());
					if (info == null) {
						continue;
					}

					String type = info.getInteractionType();
					URI typeURI = SBOLData.interactions.getValue(type);
					if (typeURI != null && typeURI.equals(SBOLData.interactions.getValue("Genetic Production"))) {
						mxCell source = (mxCell) cell.getSource();
						if (source != null) {
							mxCell backbone = (mxCell) source.getParent();
							TUData tuData = tuMap.get(backbone);
							if (tuData != null) {
								tuData.productionEdges.add(cell);
							}
						}
					}
				}
			}
		}

		// Create reactions
		for (TUData tuData : tuMap.values()) {
			if (tuData.productionEdges.isEmpty()) {
				continue; // TU has no products
			}

			GlyphInfo promoterInfo = (GlyphInfo) infoDict.get(tuData.promoterGlyph.getValue());
			String promoterId = tuData.promoterSpecies.getId();
			String reactionId = "Production_" + promoterId;

			Reaction reaction = sbmlModel.createReaction(reactionId);
			reaction.setReversible(false);
			reaction.setSBOTerm(589); // SBO:0000589 Genetic Production
			reaction.setCompartment("Cell");

			// Add promoter species as modifier
			ModifierSpeciesReference promoterModifier = reaction.createModifier(tuData.promoterSpecies);
			promoterModifier.setSBOTerm(598); // SBO:0000598 Promoter

			// Add all products from production edges
			double np = getParam(promoterInfo.getSimulationData(), "np", SequenceOntology.PROMOTER);
			for (mxCell productionEdge : tuData.productionEdges) {
				mxCell targetCell = (mxCell) productionEdge.getTarget();
				SpeciesData productData = glyphToSpeciesData.get((String) targetCell.getValue());
				// Future validation: Check all product species exist before export
				if (productData == null) {
					throw new IllegalArgumentException("Product species not found for production edge");
				}
				SpeciesReference product = reaction.createProduct(productData.species);
				product.setConstant(true);
				product.setStoichiometry(np);
			}

			// Find regulator (assumes single regulator per promoter)
			mxCell repressorEdge = null;
			mxCell activatorEdge = null;

			Object[] incoming = mxGraphModel.getIncomingEdges(graphModel, tuData.promoterGlyph);
			for (Object obj : incoming) {
				mxCell inEdge = (mxCell) obj;
				InteractionInfo inInfo = (InteractionInfo) interactionDict.get(inEdge.getValue());
				if (inInfo != null) {
					String type = inInfo.getInteractionType();
					URI typeURI = SBOLData.interactions.getValue(type);
					mxCell modifierCell = (mxCell) inEdge.getSource();

					if (typeURI != null && modifierCell != null) {
						if (typeURI.equals(SBOLData.interactions.getValue("Inhibition"))) {
							repressorEdge = inEdge;
							SpeciesData modifierData = glyphToSpeciesData.get((String) modifierCell.getValue());
							// Future validation: Check all regulatory species exist before export
							if (modifierData == null) {
								throw new IllegalArgumentException("Repressor species not found for inhibition edge");
							}
							ModifierSpeciesReference mod = reaction.createModifier(modifierData.species);
							mod.setSBOTerm(20); // SBO:0000020 Inhibitor
						} else if (typeURI.equals(SBOLData.interactions.getValue("Stimulation"))) {
							activatorEdge = inEdge;
							SpeciesData modifierData = glyphToSpeciesData.get((String) modifierCell.getValue());
							// Future validation: Check all regulatory species exist before export
							if (modifierData == null) {
								throw new IllegalArgumentException("Activator species not found for stimulation edge");
							}
							ModifierSpeciesReference mod = reaction.createModifier(modifierData.species);
							mod.setSBOTerm(459); // SBO:0000459 Stimulator
						}
					}
				}
			}

			// Future validation: Mixed regulation on promoter not supported
			if (repressorEdge != null && activatorEdge != null) {
				throw new IllegalArgumentException(
						"Mixed regulation (both activators and repressors) not supported for promoter: " + promoterId);
			}

			// Call Hill equation build method based on regulation type
			// TODO: Unregulated promoters not yet supported
			if (repressorEdge != null) {
				buildRepressionFormula(reaction, promoterId, promoterInfo, repressorEdge);
			} else if (activatorEdge != null) {
				buildActivationFormula(reaction, promoterId, promoterInfo, activatorEdge);
			} else {
				throw new IllegalArgumentException(
						"Unregulated promoter (no repressors or activators) not supported: " + promoterId);
			}
		}
	}

	/**
	 * Create degradation reactions.
	 */
	private void createDegradationReactions(Model sbmlModel, mxGraphModel graphModel, mxCell[] viewCells) {
		for (mxCell viewCell : viewCells) {
			Object[] allChildren = mxGraphModel.getChildCells(graphModel, viewCell, true, true);

			for (Object child : allChildren) {
				if (!(child instanceof mxCell)) {
					continue;
				}

				mxCell cell = (mxCell) child;

				if (cell.isEdge()) {
					InteractionInfo info = (InteractionInfo) interactionDict.get(cell.getValue());
					if (info == null) {
						continue;
					}

					String type = info.getInteractionType();
					URI typeURI = SBOLData.interactions.getValue(type);
					if (typeURI != null && typeURI.equals(SBOLData.interactions.getValue("Degradation"))) {
						createDegradationReaction(sbmlModel, cell, info, graphModel);
					}
				}
			}
		}
	}

	/**
	 * Create complex formation reactions.
	 */
	private void createComplexReactions(Model sbmlModel, mxGraphModel graphModel, mxCell[] viewCells) {
		for (mxCell viewCell : viewCells) {
			Object[] allChildren = mxGraphModel.getChildCells(graphModel, viewCell, true, true);

			for (Object child : allChildren) {
				if (!(child instanceof mxCell)) {
					continue;
				}

				mxCell cell = (mxCell) child;

				if (interactionNodeFilter.filter(cell)) {
					InteractionInfo iInfo = interactionDict.get(cell.getValue());
					if (iInfo != null) {
						String type = iInfo.getInteractionType();
						if (type != null && (type.equals("Biochemical Reaction") || type.equals("Non-Covalent Binding"))) {
							createComplexFormationReaction(sbmlModel, cell, iInfo, graphModel);
						}
					}
				}
			}
		}
	}

	/**
	 * Builds the repression-only Hill equation formula.
	 *
	 * Parameters: 
	 * ko, ko_f, ko_r, nr, kr_f_<repId>, kr_r_<repId>, nc_<repId>
	 * 
	 * Formula: 
	 * (P * ko * (ko_f/ko_r) * nr) / (1 + (ko_f/ko_r) * nr + ((kr_f/kr_r) * R)^nc)
	 */
	private void buildRepressionFormula(Reaction reaction, String promoterId, GlyphInfo promoterInfo,
			mxCell repressorEdge) {
		KineticLaw law = reaction.createKineticLaw();

		// Export only parameters used in repression formula
		Hashtable<String, Object> promoterSimData = promoterInfo.getSimulationData();
		double ko = getParam(promoterSimData, "ko", SequenceOntology.PROMOTER);
		double Ko_f = getParam(promoterSimData, "Ko_f", SequenceOntology.PROMOTER);
		double Ko_r = getParam(promoterSimData, "Ko_r", SequenceOntology.PROMOTER);
		double nr = getParam(promoterSimData, "nr", SequenceOntology.PROMOTER);

		law.createLocalParameter("ko").setValue(ko);
		law.createLocalParameter("ko_f").setValue(Ko_f);
		law.createLocalParameter("ko_r").setValue(Ko_r);
		law.createLocalParameter("nr").setValue(nr);

		// Get repressor info
		// Future validation: Check all regulatory species exist before export
		mxCell repCell = (mxCell) repressorEdge.getSource();
		SpeciesData repData = glyphToSpeciesData.get((String) repCell.getValue());
		if (repData == null) {
			throw new IllegalArgumentException("Repressor species not found for edge");
		}
		String repId = repData.species.getId();

		InteractionInfo repInfo = (InteractionInfo) interactionDict.get(repressorEdge.getValue());
		Hashtable<String, Object> repSimData = repInfo != null ? repInfo.getSimulationData() : null;
		double Kr_f = getParam(repSimData, "Kr_f", SystemsBiologyOntology.INHIBITION);
		double Kr_r = getParam(repSimData, "Kr_r", SystemsBiologyOntology.INHIBITION);
		double nc = getParam(repSimData, "nc", SystemsBiologyOntology.INHIBITION);

		// Create repressor-specific local parameters
		String p_Krf = "kr_f_" + repId;
		String p_Krr = "kr_r_" + repId;
		String p_nc = "nc_" + repId;
		law.createLocalParameter(p_Krf).setValue(Kr_f);
		law.createLocalParameter(p_Krr).setValue(Kr_r);
		law.createLocalParameter(p_nc).setValue(nc);

		// Build formula
		String Ko = "(ko_f/ko_r)";
		String Kr_term = "((" + p_Krf + "/" + p_Krr + ") * " + repId + ")^" + p_nc;

		String formula = "(" + promoterId + " * ko * " + Ko + " * nr) / (1 + " + Ko + " * nr + " + Kr_term + ")";

		try {
			law.setMath(new FormulaParser(new ByteArrayInputStream(formula.getBytes(StandardCharsets.UTF_8))).parse());
		} catch (Exception e) {
			throw new RuntimeException("Failed to parse repression kinetic law: " + e.getMessage(), e);
		}
	}

	/**
	 * Builds the activation-only Hill equation formula.
	 *
	 * Formula: 
	 * (P * (kb * (ko_f/ko_r) * nr + ka * (kao_f/kao_r) * nr * ((ka_f/ka_r) * A)^nc))
	 * / (1 + (ko_f/ko_r) * nr + (kao_f/kao_r) * nr * ((ka_f/ka_r) * A)^nc)
	 *
	 * Parameters: 
	 * kb, ka, ko_f, ko_r, kao_f, kao_r, nr, ka_f_<actId>, ka_r_<actId>, nc_<actId>
	 */
	private void buildActivationFormula(Reaction reaction, String promoterId, GlyphInfo promoterInfo,
			mxCell activatorEdge) {
		KineticLaw law = reaction.createKineticLaw();

		// Export only parameters used in activation formula
		Hashtable<String, Object> promoterSimData = promoterInfo.getSimulationData();
		double kb = getParam(promoterSimData, "kb", SequenceOntology.PROMOTER);
		double ka = getParam(promoterSimData, "ka", SequenceOntology.PROMOTER);
		double Ko_f = getParam(promoterSimData, "Ko_f", SequenceOntology.PROMOTER);
		double Ko_r = getParam(promoterSimData, "Ko_r", SequenceOntology.PROMOTER);
		double Kao_f = getParam(promoterSimData, "Kao_f", SequenceOntology.PROMOTER);
		double Kao_r = getParam(promoterSimData, "Kao_r", SequenceOntology.PROMOTER);
		double nr = getParam(promoterSimData, "nr", SequenceOntology.PROMOTER);

		law.createLocalParameter("kb").setValue(kb);
		law.createLocalParameter("ka").setValue(ka);
		law.createLocalParameter("ko_f").setValue(Ko_f);
		law.createLocalParameter("ko_r").setValue(Ko_r);
		law.createLocalParameter("kao_f").setValue(Kao_f);
		law.createLocalParameter("kao_r").setValue(Kao_r);
		law.createLocalParameter("nr").setValue(nr);

		// Get activator info
		// Future validation: Check all regulatory species exist before export
		mxCell actCell = (mxCell) activatorEdge.getSource();
		SpeciesData actData = glyphToSpeciesData.get((String) actCell.getValue());
		if (actData == null) {
			throw new IllegalArgumentException("Activator species not found for edge");
		}
		String actId = actData.species.getId();

		InteractionInfo actInfo = (InteractionInfo) interactionDict.get(activatorEdge.getValue());
		Hashtable<String, Object> actSimData = actInfo != null ? actInfo.getSimulationData() : null;
		double Ka_f = getParam(actSimData, "Ka_f", SystemsBiologyOntology.STIMULATION);
		double Ka_r = getParam(actSimData, "Ka_r", SystemsBiologyOntology.STIMULATION);
		double nc = getParam(actSimData, "nc", SystemsBiologyOntology.STIMULATION);

		// Create activator-specific local parameters
		String p_Kaf = "ka_f_" + actId;
		String p_Kar = "ka_r_" + actId;
		String p_nc = "nc_" + actId;
		law.createLocalParameter(p_Kaf).setValue(Ka_f);
		law.createLocalParameter(p_Kar).setValue(Ka_r);
		law.createLocalParameter(p_nc).setValue(nc);

		// Build formula components
		String Ko = "(ko_f/ko_r)";
		String Kao = "(kao_f/kao_r)";
		String Ka_term = "((" + p_Kaf + "/" + p_Kar + ") * " + actId + ")^" + p_nc;

		// Numerator
		String num = "(" + promoterId + " * (kb * " + Ko + " * nr + ka * " + Kao + " * nr * " + Ka_term + "))";

		// Denominator
		String den = "(1 + " + Ko + " * nr + " + Kao + " * nr * " + Ka_term + ")";

		String formula = num + " / " + den;

		try {
			law.setMath(new FormulaParser(new ByteArrayInputStream(formula.getBytes(StandardCharsets.UTF_8))).parse());
		} catch (Exception e) {
			throw new RuntimeException("Failed to parse activation kinetic law: " + e.getMessage(), e);
		}
	}

	/**
	 * Map SBOLCanvas positions to SBML Layout Extension.
	 *
	 * Creates:
	 * - Layout object with canvas dimensions
	 * - SpeciesGlyph for each molecular species (normalized coordinates)
	 * - SpeciesGlyph for each promoter species (backbone midpoint)
	 * - ReactionGlyph for each reaction (product center, point location)
	 */
	private void createVisualLayout(Model sbmlModel) {
		// Enable layout extension
		sbmlModel.enablePackage("layout");
		LayoutModelPlugin layoutPlugin = (LayoutModelPlugin) sbmlModel.getPlugin("layout");
		if (layoutPlugin == null) {
			throw new RuntimeException("Failed to get layout plugin - JSBML layout extension not available");
		}

		Layout layout = layoutPlugin.createLayout("iBioSim");

		// Calculate canvas dimensions with buffer
		double buffer = 75.0;
		double canvasWidth = layoutBounds.getCanvasWidth(buffer);
		double canvasHeight = layoutBounds.getCanvasHeight(buffer);
		layout.createDimensions(canvasWidth, canvasHeight, 0);

		// Create compartment glyph for "Cell" (required for species positioning)
		CompartmentGlyph cellGlyph = layout.createCompartmentGlyph("Glyph__Cell", "Cell");
		BoundingBox cellBox = cellGlyph.createBoundingBox();
		cellBox.createPosition(0, 0, 0);
		cellBox.createDimensions(canvasWidth, canvasHeight, 0);

		// Create species glyphs for all species with geometry
		for (SpeciesData data : glyphToSpeciesData.values()) {
			Species species = data.species;
			mxGeometry geom = data.geometry;
			String speciesId = species.getId();

			// Determine position based on species type
			double x, y, width, height;

			if (species.getSBOTerm() == 590) {
				// Promoter species (SBO:0000590): Use backbone midpoint, fixed default size
				// Dimensions from iBioSim defaults (not backbone size)
				x = geom.getX() + geom.getWidth() / 2.0;
				y = geom.getY() + geom.getHeight() / 2.0;
				width = 100.0; // Default promoter width (iBioSim standard)
				height = 30.0; // Default promoter height (iBioSim standard)
			} else {
				// Molecular species: Use existing geometry
				x = geom.getX();
				y = geom.getY();
				width = geom.getWidth();
				height = geom.getHeight();
			}

			// Create species glyph with normalized coordinates
			SpeciesGlyph sg = layout.createSpeciesGlyph("Glyph__" + speciesId, speciesId);
			BoundingBox bbox = sg.createBoundingBox();
			bbox.createPosition(layoutBounds.normalizeX(x, buffer), layoutBounds.normalizeY(y, buffer), 0);
			bbox.createDimensions(width, height, 0);
		}

		// Create reaction glyphs
		for (Reaction reaction : sbmlModel.getListOfReactions()) {
			String reactionId = reaction.getId();

			// Find product species glyph to determine reaction position
			if (reaction.getProductCount() > 0) {
				SpeciesReference productRef = reaction.getProduct(0);
				String productSpeciesId = productRef.getSpecies();
				SpeciesGlyph productGlyph = layout.getSpeciesGlyph("Glyph__" + productSpeciesId);

				if (productGlyph != null && productGlyph.isSetBoundingBox()) {
					BoundingBox productBox = productGlyph.getBoundingBox();

					// Reaction at product center
					double productCenterX = productBox.getPosition().getX()
							+ productBox.getDimensions().getWidth() / 2.0;
					double productCenterY = productBox.getPosition().getY()
							+ productBox.getDimensions().getHeight() / 2.0;

					ReactionGlyph rg = layout.createReactionGlyph("Glyph__" + reactionId, reactionId);
					BoundingBox bbox = rg.createBoundingBox();
					bbox.createPosition(productCenterX, productCenterY, 0);
					bbox.createDimensions(0, 0, 0);

					// Add species reference glyphs for products
					for (int i = 0; i < reaction.getProductCount(); i++) {
						SpeciesReference prodRef = reaction.getProduct(i);
						String prodSpeciesId = prodRef.getSpecies();
						SpeciesGlyph prodGlyph = layout.getSpeciesGlyph("Glyph__" + prodSpeciesId);

						if (prodGlyph != null && prodGlyph.isSetBoundingBox()) {
							BoundingBox prodBox = prodGlyph.getBoundingBox();
							double prodCenterX = prodBox.getPosition().getX()
									+ prodBox.getDimensions().getWidth() / 2.0;
							double prodCenterY = prodBox.getPosition().getY()
									+ prodBox.getDimensions().getHeight() / 2.0;

							SpeciesReferenceGlyph refGlyph = rg.createSpeciesReferenceGlyph(
									"RefGlyph__" + reactionId + "_product_" + i, "Glyph__" + prodSpeciesId);
							refGlyph.setSpeciesReferenceRole(SpeciesReferenceRole.PRODUCT);

							// Add required BoundingBox
							BoundingBox refBox = refGlyph.createBoundingBox();
							double midX = (productCenterX + prodCenterX) / 2.0;
							double midY = (productCenterY + prodCenterY) / 2.0;
							refBox.createPosition(midX, midY, 0);
							refBox.createDimensions(0, 0, 0);

							// Create curve from reaction to product
							Curve curve = refGlyph.createCurve();
							LineSegment lineSegment = curve.createLineSegment();
							lineSegment.createStart(productCenterX, productCenterY, 0);
							lineSegment.createEnd(prodCenterX, prodCenterY, 0);
						}
					}

					// Add species reference glyphs for reactants
					for (int i = 0; i < reaction.getReactantCount(); i++) {
						SpeciesReference reactRef = reaction.getReactant(i);
						String reactSpeciesId = reactRef.getSpecies();
						SpeciesGlyph reactGlyph = layout.getSpeciesGlyph("Glyph__" + reactSpeciesId);

						if (reactGlyph != null && reactGlyph.isSetBoundingBox()) {
							BoundingBox reactBox = reactGlyph.getBoundingBox();
							double reactCenterX = reactBox.getPosition().getX()
									+ reactBox.getDimensions().getWidth() / 2.0;
							double reactCenterY = reactBox.getPosition().getY()
									+ reactBox.getDimensions().getHeight() / 2.0;

							SpeciesReferenceGlyph refGlyph = rg.createSpeciesReferenceGlyph(
									"RefGlyph__" + reactionId + "_reactant_" + i, "Glyph__" + reactSpeciesId);
							refGlyph.setSpeciesReferenceRole(SpeciesReferenceRole.SUBSTRATE);

							// Add required BoundingBox
							BoundingBox refBox = refGlyph.createBoundingBox();
							double midX = (reactCenterX + productCenterX) / 2.0;
							double midY = (reactCenterY + productCenterY) / 2.0;
							refBox.createPosition(midX, midY, 0);
							refBox.createDimensions(0, 0, 0);

							// Create curve from reactant to reaction
							Curve curve = refGlyph.createCurve();
							LineSegment lineSegment = curve.createLineSegment();
							lineSegment.createStart(reactCenterX, reactCenterY, 0);
							lineSegment.createEnd(productCenterX, productCenterY, 0);
						}
					}

					// Add glyphs for promoters, repressors, activators
					for (int i = 0; i < reaction.getModifierCount(); i++) {
						ModifierSpeciesReference modRef = reaction.getModifier(i);
						String modSpeciesId = modRef.getSpecies();
						SpeciesGlyph modGlyph = layout.getSpeciesGlyph("Glyph__" + modSpeciesId);

						if (modGlyph != null && modGlyph.isSetBoundingBox()) {
							BoundingBox modBox = modGlyph.getBoundingBox();
							double modCenterX = modBox.getPosition().getX()
									+ modBox.getDimensions().getWidth() / 2.0;
							double modCenterY = modBox.getPosition().getY()
									+ modBox.getDimensions().getHeight() / 2.0;

							SpeciesReferenceGlyph refGlyph = rg.createSpeciesReferenceGlyph(
									"RefGlyph__" + reactionId + "_modifier_" + i, "Glyph__" + modSpeciesId);
							refGlyph.setSpeciesReferenceRole(SpeciesReferenceRole.MODIFIER);

							// Add required BoundingBox
							BoundingBox refBox = refGlyph.createBoundingBox();
							double midX = (modCenterX + productCenterX) / 2.0;
							double midY = (modCenterY + productCenterY) / 2.0;
							refBox.createPosition(midX, midY, 0);
							refBox.createDimensions(0, 0, 0);

							// Create curve from modifier to reaction
							Curve curve = refGlyph.createCurve();
							LineSegment lineSegment = curve.createLineSegment();
							lineSegment.createStart(modCenterX, modCenterY, 0);
							lineSegment.createEnd(productCenterX, productCenterY, 0);
						}
					}
				}
			}
		}
	}

	/**
	 * Create SBML simulation events from the event dictionary.
	 */
	private void createEvents(Model sbmlModel) {
		if (eventDict == null || eventDict.isEmpty()) {
			return;
		}

		for (EventInfo eventInfo : eventDict.values()) {
			String eventId = eventInfo.getName();
			if (eventId == null || eventId.isEmpty()) {
				eventId = eventInfo.getDisplayID();
			}
			Event event = sbmlModel.createEvent(eventId);
			event.setUseValuesFromTriggerTime(false);

			// Trigger: Always fires (constant true)
			Trigger trigger = event.createTrigger();
			trigger.setInitialValue(false);
			trigger.setPersistent(false);
			ASTNode triggerMath = new ASTNode(ASTNode.Type.CONSTANT_TRUE);
			trigger.setMath(triggerMath);

			// Delay: Time when event fires
			Delay delay = event.createDelay();
			ASTNode delayMath = new ASTNode(ASTNode.Type.REAL);
			delayMath.setValue(eventInfo.getDelay());
			delay.setMath(delayMath);

			// Event Assignment: Set target species to value
			EventAssignment assignment = event.createEventAssignment();
			assignment.setVariable(eventInfo.getTargetSpecies());
			ASTNode valueMath = new ASTNode(ASTNode.Type.REAL);
			valueMath.setValue(eventInfo.getAssignmentValue());
			assignment.setMath(valueMath);
		}
	}

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
	 * Creates a degradation reaction for a species.
	 *
	 * Formula: kd * [Species] (Mass Action)
	 */
	private void createDegradationReaction(Model model, mxCell edge, InteractionInfo info, mxGraphModel graphModel) {
		mxCell source = (mxCell) edge.getSource();
		SpeciesData sourceData = glyphToSpeciesData.get((String) source.getValue());
		// Future validation: Check degradation arrow source species exists before export
		if (sourceData == null) {
			throw new IllegalArgumentException("Source species not found for degradation edge");
		}

		String speciesId = sourceData.species.getId();
		String reactionId = "Degradation_" + speciesId;

		Reaction reaction = model.createReaction(reactionId);
		reaction.setReversible(false);
		reaction.setSBOTerm(179); // SBO:0000179 Degradation

		SpeciesReference reactant = reaction.createReactant(sourceData.species);
		reactant.setStoichiometry(1.0);
		reactant.setConstant(true);

		KineticLaw law = reaction.createKineticLaw();
		LocalParameter kd = law.createLocalParameter("kd");
		kd.setValue(getParam(info.getSimulationData(), "kd", SystemsBiologyOntology.DEGRADATION));
		try {
			law.setMath(new FormulaParser(
					new ByteArrayInputStream(("kd * " + speciesId).getBytes(StandardCharsets.UTF_8))).parse());
		} catch (Exception e) {
			throw new RuntimeException("Failed to parse degradation kinetic law: " + e.getMessage(), e);
		}
	}

	/**
	 * Creates a complex formation reaction from an Association interaction node.
	 *
	 * Formula: Kc_f * [A]^nc_A * [B]^nc_B - Kc_r * [Complex]
	 * Parameters: Kc_f, Kc_r (from node), nc per reactant
	 */
	private void createComplexFormationReaction(Model model, mxCell node, InteractionInfo info,
			mxGraphModel graphModel) {
		// Get product first to create descriptive reaction ID
		Object[] outgoing = mxGraphModel.getOutgoingEdges(graphModel, node);
		// Future validation: Check association node has exactly one outgoing edge
		if (outgoing.length == 0) {
			throw new IllegalArgumentException("Complex formation node has no product edge");
		}

		mxCell outEdge = (mxCell) outgoing[0];
		mxCell target = (mxCell) outEdge.getTarget();
		SpeciesData productData = glyphToSpeciesData.get((String) target.getValue());
		// Future validation: Check product species exists before export
		if (productData == null) {
			throw new IllegalArgumentException("Product species not found for complex formation");
		}

		String productId = productData.species.getId();
		String reactionId = "Complex_" + productId;

		Reaction reaction = model.createReaction(reactionId);
		reaction.setReversible(true);
		reaction.setSBOTerm(177); // SBO:0000177 Non-covalent binding

		// Reactants: Incoming edges. Each edge has its own nc parameter
		Object[] incoming = mxGraphModel.getIncomingEdges(graphModel, node);
		StringBuilder rateLaw = new StringBuilder("kc_f"); // Lowercase for SBML

		KineticLaw law = reaction.createKineticLaw();

		for (Object obj : incoming) {
			mxCell inEdge = (mxCell) obj;
			mxCell source = (mxCell) inEdge.getSource();
			SpeciesData sourceData = glyphToSpeciesData.get((String) source.getValue());
			// Future validation: Check all reactant species exist before export
			if (sourceData == null) {
				throw new IllegalArgumentException("Reactant species not found for complex formation edge");
			}

			String speciesId = sourceData.species.getId();
			SpeciesReference r = reaction.createReactant(sourceData.species);
			r.setStoichiometry(1.0);
			r.setConstant(true);

			// Get nc with lookup for per-reactant independent nc value
			InteractionInfo edgeInfo = (InteractionInfo) interactionDict.get(inEdge.getValue());
			Hashtable<String, Object> edgeSimData = edgeInfo != null ? edgeInfo.getSimulationData() : null;
			String sourceURI = (String) source.getValue(); // GlyphInfo URI
			double nc = getKeyedParam(edgeSimData, "nc", sourceURI, SystemsBiologyOntology.NON_COVALENT_BINDING);

			// Create local parameter for reactant's nc, matching the SBML nc_<speciesId> format
			String ncParam = "nc_" + speciesId;
			law.createLocalParameter(ncParam).setValue(nc);

			// Add the exponent term
			rateLaw.append(" * ").append(speciesId).append("^").append(ncParam);
		}

		// Add product
		SpeciesReference p = reaction.createProduct(productData.species);
		p.setStoichiometry(1.0);
		p.setConstant(true);

		rateLaw.append(" - kc_r * ").append(productId);

		// Kc_f and Kc_r come from the association NODE (not per-edge)
		law.createLocalParameter("Kc_f".toLowerCase()).setValue(
				getParam(info.getSimulationData(), "Kc_f", SystemsBiologyOntology.NON_COVALENT_BINDING));
		law.createLocalParameter("Kc_r".toLowerCase()).setValue(
				getParam(info.getSimulationData(), "Kc_r", SystemsBiologyOntology.NON_COVALENT_BINDING));

		try {
			law.setMath(new FormulaParser(new ByteArrayInputStream(rateLaw.toString().getBytes(StandardCharsets.UTF_8)))
					.parse());
		} catch (Exception e) {
			throw new RuntimeException("Failed to parse complex formation kinetic law: " + e.getMessage(), e);
		}
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

	/**
	 * Get per-reactant simulation parameter values in complex formation.
	 * Uses format "nc_<sourceSpeciesURI>", or default value if not found.
	 *
	 * @param simData simulationData from the association node's InteractionInfo
	 * @param paramName base parameter name (e.g., "nc")
	 * @param keyURI source species URI to use as key
	 * @param type SBO type for default value lookup
	 * @return keyed parameter value or default value
	 */
	private double getKeyedParam(Hashtable<String, Object> simData, String paramName, String keyURI, URI type) {
		// Try keyed lookup: paramName_keyURI
		String keyedParamName = paramName + "_" + keyURI;
		if (simData != null && simData.containsKey(keyedParamName)) {
			Object val = simData.get(keyedParamName);
			if (val instanceof Number) {
				return ((Number) val).doubleValue();
			} else if (val instanceof String) {
				return Double.parseDouble((String) val);
			}
		}

		// Fall back to default value directly (no global nc lookup)
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
