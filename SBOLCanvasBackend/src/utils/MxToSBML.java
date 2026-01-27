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
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.awt.geom.Point2D;

import org.sbolstandard.core2.SequenceOntology;
import org.sbolstandard.core2.SystemsBiologyOntology;

import javax.xml.stream.XMLStreamException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactoryConfigurationError;

// JSBML API Docs: https://sbml.org/jsbml/files/doc/api/1.6.1/overview-summary.html
import org.sbml.jsbml.SBMLDocument;
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
		mxGraph graph = parseGraph(graphStream);
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell0 = (mxCell) model.getCell("0");
		ArrayList<Object> dataContainer = (ArrayList<Object>) cell0.getValue();
		infoDict = loadDictionary(dataContainer, INFO_DICT_INDEX);
		combinatorialDict = loadDictionary(dataContainer, COMBINATORIAL_DICT_INDEX);
		interactionDict = loadDictionary(dataContainer, INTERACTION_DICT_INDEX);
		eventDict = loadDictionary(dataContainer, EVENT_DICT_INDEX);

		SBMLDocument document = new SBMLDocument(3, 2);
		Model sbmlModel = document.createModel("sbolcanvas_model");

		// Create the default "Cell" compartment
		// https://sbml.org/jsbml/files/doc/api/1.6.1/org/sbml/jsbml/Compartment.html
		Compartment compartment = sbmlModel.createCompartment("Cell");
		compartment.setName("Cell");
		compartment.setSize(1.0);
		compartment.setConstant(true);

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

				// TODO: For all IllegalArgumentExceptions, add user validation before export
				if (promoterGlyph == null) {
					throw new IllegalArgumentException("Backbone has no promoter glyph. Add a Promoter to the backbone for SBML export.");
				}

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
				double ng = getParam(promoterInfo.getSimulationData(), "ng", SequenceOntology.PROMOTER, "promoter '" + promoterName + "'");
				promoterSpecies.setInitialAmount(ng);
				promoterSpecies.setHasOnlySubstanceUnits(true);
				promoterSpecies.setConstant(false);
				promoterSpecies.setBoundaryCondition(false);

				if (promoterInfo.getName() != null && !promoterInfo.getName().isEmpty()) {
					promoterSpecies.setName(promoterInfo.getName());
				}

				// Use backbone geometry for promoter layout position
				mxGeometry backboneGeom = backbone.getGeometry();
				glyphToSpeciesData.put((String) promoterGlyph.getValue(),
						new SpeciesData(promoterSpecies, backboneGeom));
				layoutBounds.update(backboneGeom);

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

			ModifierSpeciesReference promoterModifier = reaction.createModifier(tuData.promoterSpecies);
			promoterModifier.setSBOTerm(598); // SBO:0000598 Promoter

			double np = getParam(promoterInfo.getSimulationData(), "np", SequenceOntology.PROMOTER, "promoter '" + promoterId + "'");
			for (mxCell productionEdge : tuData.productionEdges) {
				mxCell targetCell = (mxCell) productionEdge.getTarget();
				SpeciesData productData = glyphToSpeciesData.get((String) targetCell.getValue());
				if (productData == null) {
					throw new IllegalArgumentException("Product species not found for production edge");
				}
				SpeciesReference product = reaction.createProduct(productData.species);
				product.setConstant(true);
				product.setStoichiometry(np);
			}

			// Assumes single regulator per promoter. TODO: mixed regulation not supported
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
							if (modifierData == null) {
								throw new IllegalArgumentException("Repressor species not found for inhibition edge");
							}
							ModifierSpeciesReference mod = reaction.createModifier(modifierData.species);
							mod.setSBOTerm(20); // SBO:0000020 Inhibitor
						} else if (typeURI.equals(SBOLData.interactions.getValue("Stimulation"))) {
							activatorEdge = inEdge;
							SpeciesData modifierData = glyphToSpeciesData.get((String) modifierCell.getValue());
							if (modifierData == null) {
								throw new IllegalArgumentException("Activator species not found for stimulation edge");
							}
							ModifierSpeciesReference mod = reaction.createModifier(modifierData.species);
							mod.setSBOTerm(459); // SBO:0000459 Stimulator
						}
					}
				}
			}

			if (repressorEdge != null && activatorEdge != null) {
				throw new IllegalArgumentException(
						"Mixed regulation (both activators and repressors) not supported for promoter: " + promoterId);
			}

			// TODO: Unregulated promoters not supported
			if (repressorEdge != null) {
				buildRepressionFormula(reaction, promoterId, promoterInfo, repressorEdge);
			} else if (activatorEdge != null) {
				buildActivationFormula(reaction, promoterId, promoterInfo, activatorEdge);
			} else {
				String promoterName = promoterInfo.getName();
				if (promoterName == null || promoterName.isEmpty()) {
					promoterName = promoterInfo.getDisplayID();
				}
				throw new IllegalArgumentException("Promoter '" + promoterName + "' has no regulator.");
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

		Hashtable<String, Object> promoterSimData = promoterInfo.getSimulationData();
		String promoterContext = "promoter '" + promoterId + "'";
		double ko = getParam(promoterSimData, "ko", SequenceOntology.PROMOTER, promoterContext);
		double Ko_f = getParam(promoterSimData, "Ko_f", SequenceOntology.PROMOTER, promoterContext);
		double Ko_r = getParam(promoterSimData, "Ko_r", SequenceOntology.PROMOTER, promoterContext);
		double nr = getParam(promoterSimData, "nr", SequenceOntology.PROMOTER, promoterContext);

		law.createLocalParameter("ko").setValue(ko);
		law.createLocalParameter("ko_f").setValue(Ko_f);
		law.createLocalParameter("ko_r").setValue(Ko_r);
		law.createLocalParameter("nr").setValue(nr);

		mxCell repCell = (mxCell) repressorEdge.getSource();
		SpeciesData repData = glyphToSpeciesData.get((String) repCell.getValue());
		if (repData == null) {
			throw new IllegalArgumentException("Repressor species not found for edge");
		}
		String repId = repData.species.getId();

		InteractionInfo repInfo = (InteractionInfo) interactionDict.get(repressorEdge.getValue());
		Hashtable<String, Object> repSimData = repInfo != null ? repInfo.getSimulationData() : null;
		String repContext = "inhibition from '" + repId + "' to '" + promoterId + "'";
		double Kr_f = getParam(repSimData, "Kr_f", SystemsBiologyOntology.INHIBITION, repContext);
		double Kr_r = getParam(repSimData, "Kr_r", SystemsBiologyOntology.INHIBITION, repContext);
		double nc = getParam(repSimData, "nc", SystemsBiologyOntology.INHIBITION, repContext);

		String p_Krf = "kr_f_" + repId;
		String p_Krr = "kr_r_" + repId;
		String p_nc = "nc_" + repId;
		law.createLocalParameter(p_Krf).setValue(Kr_f);
		law.createLocalParameter(p_Krr).setValue(Kr_r);
		law.createLocalParameter(p_nc).setValue(nc);

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

		Hashtable<String, Object> promoterSimData = promoterInfo.getSimulationData();
		String promoterContext = "promoter '" + promoterId + "'";
		double kb = getParam(promoterSimData, "kb", SequenceOntology.PROMOTER, promoterContext);
		double ka = getParam(promoterSimData, "ka", SequenceOntology.PROMOTER, promoterContext);
		double Ko_f = getParam(promoterSimData, "Ko_f", SequenceOntology.PROMOTER, promoterContext);
		double Ko_r = getParam(promoterSimData, "Ko_r", SequenceOntology.PROMOTER, promoterContext);
		double Kao_f = getParam(promoterSimData, "Kao_f", SequenceOntology.PROMOTER, promoterContext);
		double Kao_r = getParam(promoterSimData, "Kao_r", SequenceOntology.PROMOTER, promoterContext);
		double nr = getParam(promoterSimData, "nr", SequenceOntology.PROMOTER, promoterContext);

		law.createLocalParameter("kb").setValue(kb);
		law.createLocalParameter("ka").setValue(ka);
		law.createLocalParameter("ko_f").setValue(Ko_f);
		law.createLocalParameter("ko_r").setValue(Ko_r);
		law.createLocalParameter("kao_f").setValue(Kao_f);
		law.createLocalParameter("kao_r").setValue(Kao_r);
		law.createLocalParameter("nr").setValue(nr);

		mxCell actCell = (mxCell) activatorEdge.getSource();
		SpeciesData actData = glyphToSpeciesData.get((String) actCell.getValue());
		if (actData == null) {
			throw new IllegalArgumentException("Activator species not found for edge");
		}
		String actId = actData.species.getId();

		InteractionInfo actInfo = (InteractionInfo) interactionDict.get(activatorEdge.getValue());
		Hashtable<String, Object> actSimData = actInfo != null ? actInfo.getSimulationData() : null;
		String actContext = "stimulation from '" + actId + "' to '" + promoterId + "'";
		double Ka_f = getParam(actSimData, "Ka_f", SystemsBiologyOntology.STIMULATION, actContext);
		double Ka_r = getParam(actSimData, "Ka_r", SystemsBiologyOntology.STIMULATION, actContext);
		double nc = getParam(actSimData, "nc", SystemsBiologyOntology.STIMULATION, actContext);

		String p_Kaf = "ka_f_" + actId;
		String p_Kar = "ka_r_" + actId;
		String p_nc = "nc_" + actId;
		law.createLocalParameter(p_Kaf).setValue(Ka_f);
		law.createLocalParameter(p_Kar).setValue(Ka_r);
		law.createLocalParameter(p_nc).setValue(nc);

		String Ko = "(ko_f/ko_r)";
		String Kao = "(kao_f/kao_r)";
		String Ka_term = "((" + p_Kaf + "/" + p_Kar + ") * " + actId + ")^" + p_nc;

		String numerator = "(" + promoterId + " * (kb * " + Ko + " * nr + ka * " + Kao + " * nr * " + Ka_term + "))";
		String denominator = "(1 + " + Ko + " * nr + " + Kao + " * nr * " + Ka_term + ")";

		String formula = numerator + " / " + denominator;

		try {
			law.setMath(new FormulaParser(new ByteArrayInputStream(formula.getBytes(StandardCharsets.UTF_8))).parse());
		} catch (Exception e) {
			throw new RuntimeException("Failed to parse activation kinetic law: " + e.getMessage(), e);
		}
	}

	private void createEdge(Layout layout, String sourceId, String targetId, String type,
			Map<String, Point2D> speciesCenter) {
		Point2D source = speciesCenter.get(sourceId);
		Point2D target = speciesCenter.get(targetId);

		if (source == null || target == null)
			return;

		String rgId = "Glyph__" + sourceId + "__" + type + "__" + targetId;
		ReactionGlyph rg = layout.createReactionGlyph(rgId);
		BoundingBox bbox = rg.createBoundingBox();
		bbox.createPosition(target.getX(), target.getY(), 0);
		bbox.createDimensions(0, 0, 0);

		String srgId = "ReferenceGlyph__" + sourceId + "__" + type + "__" + targetId;
		SpeciesReferenceGlyph srg = rg.createSpeciesReferenceGlyph(srgId, "Glyph__" + targetId);
		srg.setSpeciesReferenceRole(SpeciesReferenceRole.PRODUCT);

		BoundingBox refBox = srg.createBoundingBox();
		double midX = (source.getX() + target.getX()) / 2.0;
		double midY = (source.getY() + target.getY()) / 2.0;
		refBox.createPosition(midX, midY, 0);
		refBox.createDimensions(0, 0, 0);

		Curve curve = srg.createCurve();
		LineSegment ls = curve.createLineSegment();
		ls.createStart(source.getX(), source.getY(), 0);
		ls.createEnd(target.getX(), target.getY(), 0);
	}

	private Layout setupLayout(Model sbmlModel) {
		sbmlModel.enablePackage("layout");
		LayoutModelPlugin layoutPlugin = (LayoutModelPlugin) sbmlModel.getPlugin("layout");
		Layout layout = layoutPlugin.createLayout("iBioSim");

		double buffer = 75.0;
		layout.createDimensions(layoutBounds.getCanvasWidth(buffer),
				layoutBounds.getCanvasHeight(buffer), 0);

		CompartmentGlyph cellGlyph = layout.createCompartmentGlyph("Glyph__Cell", "Cell");
		BoundingBox cellBox = cellGlyph.createBoundingBox();
		cellBox.createPosition(0, 0, 0);
		cellBox.createDimensions(layoutBounds.getCanvasWidth(buffer),
				layoutBounds.getCanvasHeight(buffer), 0);

		return layout;
	}

	private Map<String, Point2D> createSpeciesGlyphs(Layout layout) {
		Map<String, Point2D> speciesCenter = new HashMap<>();
		double buffer = 75.0;

		for (SpeciesData data : glyphToSpeciesData.values()) {
			String speciesId = data.species.getId();

			double x, y, width, height;
			// SBO:0000590 Promoter. Use backbone midpoint
			if (data.species.getSBOTerm() == 590) {
				x = data.geometry.getX() + data.geometry.getWidth() / 2.0;
				y = data.geometry.getY() + data.geometry.getHeight() / 2.0;
				width = 100.0;
				height = 30.0;
			} else {
				x = data.geometry.getX();
				y = data.geometry.getY();
				width = data.geometry.getWidth();
				height = data.geometry.getHeight();
			}

			double normX = layoutBounds.normalizeX(x, buffer);
			double normY = layoutBounds.normalizeY(y, buffer);

			SpeciesGlyph sg = layout.createSpeciesGlyph("Glyph__" + speciesId, speciesId);
			BoundingBox bbox = sg.createBoundingBox();
			bbox.createPosition(normX, normY, 0);
			bbox.createDimensions(width, height, 0);

			speciesCenter.put(speciesId, new Point2D.Double(
					normX + width / 2.0,
					normY + height / 2.0));
		}

		return speciesCenter;
	}

	private void createProductionEdges(Layout layout, Reaction reaction,
			Map<String, Point2D> speciesCenter) {
		String promoterId = reaction.getId().substring("Production_".length());

		for (SpeciesReference product : reaction.getListOfProducts()) {
			createEdge(layout, promoterId, product.getSpecies(), "Production", speciesCenter);
		}

		for (ModifierSpeciesReference mod : reaction.getListOfModifiers()) {
			String modId = mod.getSpecies();
			if (modId.equals(promoterId))
				continue;

			String type = (mod.getSBOTerm() == 20) ? "repression" : "activation";
			createEdge(layout, modId, promoterId, type, speciesCenter);
		}
	}

	private void createComplexEdges(Layout layout, Reaction reaction,
			Map<String, Point2D> speciesCenter) {
		String productId = reaction.getProduct(0).getSpecies();

		for (SpeciesReference reactant : reaction.getListOfReactants()) {
			createEdge(layout, reactant.getSpecies(), productId, "complex", speciesCenter);
		}
	}

	/**
	 * Add SBOLCanvas Glyph positions to the SBML Layout.
	 */
	private void createVisualLayout(Model sbmlModel) {
		Layout layout = setupLayout(sbmlModel);
		Map<String, Point2D> speciesCenter = createSpeciesGlyphs(layout);

		for (Reaction reaction : sbmlModel.getListOfReactions()) {
			String reactionId = reaction.getId();

			if (reactionId.startsWith("Production_")) {
				createProductionEdges(layout, reaction, speciesCenter);
			} else if (reactionId.startsWith("Complex_")) {
				createComplexEdges(layout, reaction, speciesCenter);
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
			String targetSpecies = eventInfo.getTargetSpecies();
			if (targetSpecies == null || targetSpecies.isEmpty()) {
				throw new IllegalArgumentException(
						"Event '" + eventInfo.getDisplayID() + "' missing target species");
			}

			if (sbmlModel.getSpecies(targetSpecies) == null) {
				throw new IllegalArgumentException(
						"Event '" + eventInfo.getDisplayID() + "' references unknown species '" + targetSpecies + "'");
			}

			String eventId = eventInfo.getName();
			if (eventId == null || eventId.isEmpty()) {
				eventId = eventInfo.getDisplayID();
			}
			Event event = sbmlModel.createEvent(sanitizeId(eventId));
			event.setUseValuesFromTriggerTime(false);

			// Trigger hardcoded to true. TODO: add conditional triggers
			Trigger trigger = event.createTrigger();
			trigger.setInitialValue(false);
			trigger.setPersistent(false);
			trigger.setMath(new ASTNode(ASTNode.Type.CONSTANT_TRUE));

			Delay delay = event.createDelay();
			ASTNode delayMath = new ASTNode(ASTNode.Type.REAL);
			delayMath.setValue(eventInfo.getDelay());
			delay.setMath(delayMath);

			EventAssignment assignment = event.createEventAssignment();
			assignment.setVariable(targetSpecies);
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

		// SBML ID becomes the label. Pick Name over DisplayID
		String speciesId = glyphInfo.getDisplayID();
		if (glyphInfo.getName() != null && !glyphInfo.getName().isEmpty()) {
			speciesId = glyphInfo.getName();
		}
		speciesId = sanitizeId(speciesId);

		Species species = model.createSpecies(speciesId);
		species.setCompartment("Cell");

		if (glyphInfo.getName() != null && !glyphInfo.getName().isEmpty()) {
			species.setName(glyphInfo.getName());
		}

		String partType = glyphInfo.getPartType();
		URI typeURI = SBOLData.types.getValue(partType);

		// Map SBOL types to SBO terms
		if (typeURI != null) {
			if (typeURI.equals(org.sbolstandard.core2.ComponentDefinition.PROTEIN)) {
				species.setSBOTerm(252); // Polypeptide chain
			} else if (typeURI.equals(org.sbolstandard.core2.ComponentDefinition.DNA_MOLECULE) ||
					typeURI.equals(org.sbolstandard.core2.ComponentDefinition.DNA_REGION)) {
				species.setSBOTerm(251); // Deoxyribonucleic acid
			} else if (typeURI.equals(org.sbolstandard.core2.ComponentDefinition.RNA_MOLECULE) ||
					typeURI.equals(org.sbolstandard.core2.ComponentDefinition.RNA_REGION)) {
				species.setSBOTerm(250); // Ribonucleic acid
			} else if (typeURI.equals(org.sbolstandard.core2.ComponentDefinition.SMALL_MOLECULE)) {
				species.setSBOTerm(247); // Simple chemical
			} else if (typeURI.equals(org.sbolstandard.core2.ComponentDefinition.COMPLEX)) {
				species.setSBOTerm(253); // Non-covalent complex
			}
		}

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
		species.setHasOnlySubstanceUnits(true); // Amount of molecules, not concentration
		species.setConstant(false);

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
		kd.setValue(getParam(info.getSimulationData(), "kd", SystemsBiologyOntology.DEGRADATION, "degradation of '" + speciesId + "'"));
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
		Object[] outgoing = mxGraphModel.getOutgoingEdges(graphModel, node);
		if (outgoing.length == 0) {
			throw new IllegalArgumentException("Complex formation node has no product edge");
		}

		mxCell outEdge = (mxCell) outgoing[0];
		mxCell target = (mxCell) outEdge.getTarget();
		SpeciesData productData = glyphToSpeciesData.get((String) target.getValue());
		if (productData == null) {
			throw new IllegalArgumentException("Product species not found for complex formation");
		}

		String productId = productData.species.getId();
		String reactionId = "Complex_" + productId;

		Reaction reaction = model.createReaction(reactionId);
		reaction.setReversible(true);
		reaction.setSBOTerm(177); // SBO:0000177 Non-covalent binding

		Object[] incoming = mxGraphModel.getIncomingEdges(graphModel, node);
		StringBuilder rateLaw = new StringBuilder("kc_f"); // Lowercase for SBML

		KineticLaw law = reaction.createKineticLaw();

		for (Object obj : incoming) {
			mxCell inEdge = (mxCell) obj;
			mxCell source = (mxCell) inEdge.getSource();
			SpeciesData sourceData = glyphToSpeciesData.get((String) source.getValue());
			if (sourceData == null) {
				throw new IllegalArgumentException("Reactant species not found for complex formation edge");
			}

			String speciesId = sourceData.species.getId();
			SpeciesReference r = reaction.createReactant(sourceData.species);
			r.setStoichiometry(1.0);
			r.setConstant(true);

			InteractionInfo edgeInfo = (InteractionInfo) interactionDict.get(inEdge.getValue());
			Hashtable<String, Object> edgeSimData = edgeInfo != null ? edgeInfo.getSimulationData() : null;
			String sourceURI = (String) source.getValue();
			double nc = getKeyedParam(edgeSimData, "nc", sourceURI, SystemsBiologyOntology.NON_COVALENT_BINDING,
					"complex formation of '" + productId + "' (reactant '" + speciesId + "')");

			String ncParam = "nc_" + speciesId;
			law.createLocalParameter(ncParam).setValue(nc);
			rateLaw.append(" * ").append(speciesId).append("^").append(ncParam);
		}

		SpeciesReference p = reaction.createProduct(productData.species);
		p.setStoichiometry(1.0);
		p.setConstant(true);

		rateLaw.append(" - kc_r * ").append(productId);

		law.createLocalParameter("Kc_f".toLowerCase()).setValue(
				getParam(info.getSimulationData(), "Kc_f", SystemsBiologyOntology.NON_COVALENT_BINDING,
						"complex formation of '" + productId + "'"));
		law.createLocalParameter("Kc_r".toLowerCase()).setValue(
				getParam(info.getSimulationData(), "Kc_r", SystemsBiologyOntology.NON_COVALENT_BINDING,
						"complex formation of '" + productId + "'"));

		try {
			law.setMath(new FormulaParser(new ByteArrayInputStream(rateLaw.toString().getBytes(StandardCharsets.UTF_8)))
					.parse());
		} catch (Exception e) {
			throw new RuntimeException("Failed to parse complex formation kinetic law: " + e.getMessage(), e);
		}
	}

	/**
	 * Gets a simulation parameter value from simulationData or SBOLData defaults.
	 *
	 * @param simData   simulationData hashtable
	 * @param paramName parameter name to look up
	 * @param type      URI type for default value lookup
	 * @param context   human-readable context for error messages (e.g., "promoter 'pTet'")
	 */
	private double getParam(Hashtable<String, Object> simData, String paramName, URI type, String context) {
		if (simData != null && simData.containsKey(paramName)) {
			Object val = simData.get(paramName);
			if (val instanceof Number) {
				return ((Number) val).doubleValue();
			} else if (val instanceof String) {
				return Double.parseDouble((String) val);
			}
			throw new IllegalArgumentException(
					"Invalid type for parameter '" + paramName + "' on " + context +
							". Expected a number but got: " + val.getClass().getSimpleName());
		}
		return getDefaultValue(type, paramName, context);
	}

	/**
	 * Gets a per-reactant simulation parameter (e.g., "nc_<sourceURI>") or default.
	 *
	 * @param simData   simulationData hashtable
	 * @param paramName base parameter name (e.g., "nc")
	 * @param keyURI    source species URI to use as key
	 * @param type      URI type for default value lookup
	 * @param context   human-readable context for error messages
	 */
	private double getKeyedParam(Hashtable<String, Object> simData, String paramName, String keyURI, URI type,
			String context) {
		String keyedParamName = paramName + "_" + keyURI;
		if (simData != null && simData.containsKey(keyedParamName)) {
			Object val = simData.get(keyedParamName);
			if (val instanceof Number) {
				return ((Number) val).doubleValue();
			} else if (val instanceof String) {
				return Double.parseDouble((String) val);
			}
		}
		return getDefaultValue(type, paramName, context);
	}

	private double getDefaultValue(URI type, String paramName, String context) {
		String key = null;
		if (SBOLData.roles.containsValue(type)) {
			key = SBOLData.roles.getKey(type);
		} else if (SBOLData.interactions.containsValue(type)) {
			key = SBOLData.interactions.getKey(type);
		}

		if (key == null) {
			throw new IllegalArgumentException(
					"Cannot find default for parameter '" + paramName + "' on " + context + ": unknown type");
		}

		LinkedHashMap<String, Object> params = SBOLData.getSimulationConfig().get(key);
		if (params == null) {
			throw new IllegalArgumentException(
					"Cannot find default for parameter '" + paramName + "' on " + context +
							": no simulation config for type '" + key + "'");
		}

		Object val = params.get(paramName);
		if (val == null) {
			throw new IllegalArgumentException(
					"Missing required parameter '" + paramName + "' on " + context + ". Set this value in the Model tab.");
		}

		if (val instanceof Number) {
			return ((Number) val).doubleValue();
		}
		throw new IllegalArgumentException(
				"Invalid default value type for parameter '" + paramName + "' on " + context);
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
			while (usedIds.contains(sanitized + "__" + suffix)) {
				suffix++;
			}
			sanitized = sanitized + "__" + suffix;
		}
		usedIds.add(sanitized);
		return sanitized;
	}

}
