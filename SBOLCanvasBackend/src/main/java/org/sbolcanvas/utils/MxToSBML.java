package org.sbolcanvas.utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.awt.geom.Point2D;

import org.sbolstandard.core2.SequenceOntology;
import org.sbolstandard.core2.SystemsBiologyOntology;

import javax.xml.stream.XMLStreamException;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactoryConfigurationError;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

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
import org.sbml.jsbml.Event;
import org.sbml.jsbml.Trigger;
import org.sbml.jsbml.Delay;
import org.sbml.jsbml.EventAssignment;
import org.sbml.jsbml.ext.layout.BoundingBox;
import org.sbml.jsbml.ext.layout.CompartmentGlyph;
import org.sbml.jsbml.ext.layout.Curve;
import org.sbml.jsbml.ext.layout.GeneralGlyph;
import org.sbml.jsbml.ext.layout.GraphicalObject;
import org.sbml.jsbml.ext.layout.Layout;
import org.sbml.jsbml.ext.layout.LayoutModelPlugin;
import org.sbml.jsbml.ext.layout.LineSegment;
import org.sbml.jsbml.ext.layout.ReactionGlyph;
import org.sbml.jsbml.ext.layout.ReferenceGlyph;
import org.sbml.jsbml.ext.layout.SpeciesGlyph;
import org.sbml.jsbml.ext.layout.SpeciesReferenceGlyph;
import org.sbml.jsbml.ext.layout.SpeciesReferenceRole;
import org.sbml.jsbml.ext.layout.TextGlyph;

import org.synbiohub.frontend.SynBioHubException;

import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGeometry;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.view.mxGraph;

import org.sbolcanvas.data.GlyphInfo;
import org.sbolcanvas.data.InteractionInfo;
import org.sbolcanvas.data.EventInfo;

public class MxToSBML extends Converter {

	private static final Logger log = LogManager.getLogger(MxToSBML.class);

	/** TU = one backbone with one merged promoter species (params summed, names joined). */
	private static class TUData {
		List<mxCell> promoterGlyphs; // All promoter glyphs on the backbone
		Species promoterSpecies; // Merged JSBML Species for the TU
		List<mxCell> productionEdges;
		GlyphInfo mergedPromoterInfo; // GlyphInfo carrying summed simulation params

		TUData(List<mxCell> promoterGlyphs, Species promoterSpecies, GlyphInfo mergedPromoterInfo) {
			this.promoterGlyphs = promoterGlyphs;
			this.promoterSpecies = promoterSpecies;
			this.mergedPromoterInfo = mergedPromoterInfo;
			this.productionEdges = new ArrayList<>();
		}
	}

	/** Simulation parameters that sum across promoters sharing a backbone. */
	private static final String[] MERGED_PROMOTER_PARAMS = {
			SBOLData.PARAM_NG, SBOLData.PARAM_NP, SBOLData.PARAM_KO,
			SBOLData.PARAM_KO_F, SBOLData.PARAM_KO_R, SBOLData.PARAM_NR,
			SBOLData.PARAM_KB, SBOLData.PARAM_KA,
			SBOLData.PARAM_KAO_F, SBOLData.PARAM_KAO_R
	};

	/**
	 * Helper class to bundle Species with its layout geometry.
	 * Key is glyph.getValue() (GlyphInfo URI).
	 */
	static class SpeciesData {
		Species species; // JSBML Species object
		mxGeometry geometry; // For layout position

		SpeciesData(Species species, mxGeometry geometry) {
			this.species = species;
			this.geometry = geometry;
		}
	}

	/**
	 * Event with layout geometry and resolved target.
	 * Geometry is null for events without canvas cells.
	 */
	static class EventData {
		Event event;
		mxGeometry geometry;
		String targetSpeciesId;

		EventData(Event event, mxGeometry geometry, String targetSpeciesId) {
			this.event = event;
			this.geometry = geometry;
			this.targetSpeciesId = targetSpeciesId;
		}
	}

	/**
	 * Helper class to calculate canvas bounding box.
	 * Find max/min glyph coordinates, normalize layout to those dimensions.
	 */
	private static class LayoutBounds {
		double minX = Double.MAX_VALUE;
		double minY = Double.MAX_VALUE;
		double maxX = Double.NEGATIVE_INFINITY;
		double maxY = Double.NEGATIVE_INFINITY;

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
	HashMap<String, SpeciesData> glyphToSpeciesData = new HashMap<>();
	HashMap<String, EventData> eventIdToEventData = new LinkedHashMap<>();
	private HashMap<String, String> displayNameToSpeciesId = new HashMap<>();
	private HashMap<String, String> reactionToPromoterId = new HashMap<>();

	public MxToSBML() {
		this(null);
	}

	public MxToSBML(HashMap<String, String> userTokens) {
		super();
		this.userTokens = userTokens;
	}

	public void toSBML(InputStream graphStream, OutputStream sbmlStream)
			throws IOException, URISyntaxException, TransformerFactoryConfigurationError,
			TransformerException, SynBioHubException, XMLStreamException {

		SBMLDocument document = setupDocument(graphStream);

		org.sbml.jsbml.TidySBMLWriter.write(document, sbmlStream, "SBOLCanvas", "1.0", ' ', (short) 2);
	}

	private SBMLDocument setupDocument(InputStream graphStream) throws IOException,
			TransformerFactoryConfigurationError, TransformerException, URISyntaxException {
		mxGraph graph = loadGraphAndDictionaries(graphStream);
		mxGraphModel model = (mxGraphModel) graph.getModel();

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

		// Create species
		HashMap<mxCell, TUData> tuMap = createPromoterSpecies(sbmlModel, model, viewCells);
		createMolecularSpecies(sbmlModel, model, viewCells);

		// Create reactions and events
		createProductionReactions(sbmlModel, model, viewCells, tuMap);
		createDegradationReactions(sbmlModel, model, viewCells);
		createComplexReactions(sbmlModel, model, viewCells);
		createEvents(sbmlModel, model);

		// Create visual layout
		createVisualLayout(sbmlModel);

		return document;
	}

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

				List<mxCell> promoterGlyphs = new ArrayList<>();
				List<String> individualNames = new ArrayList<>();
				for (mxCell glyph : glyphs) {
					GlyphInfo info = (GlyphInfo) infoDict.get(glyph.getValue());
					if (info == null || !SequenceOntology.PROMOTER.equals(SBOLData.roles.getValue(info.getPartRole()))) {
						continue;
					}
					promoterGlyphs.add(glyph);
					String name = info.getName();
					if (name == null || name.isEmpty()) {
						name = info.getDisplayID();
					}
					individualNames.add(name);
				}
				if (promoterGlyphs.isEmpty())
					continue;

				String mergedName = String.join("+", individualNames);
				String mergedId = sanitizeId(mergedName);

				Hashtable<String, Object> mergedSimData = new Hashtable<>();
				for (String param : MERGED_PROMOTER_PARAMS) {
					double sum = 0.0;
					for (int i = 0; i < promoterGlyphs.size(); i++) {
						GlyphInfo info = (GlyphInfo) infoDict.get(promoterGlyphs.get(i).getValue());
						Hashtable<String, Object> simData = info != null ? info.getSimulationData() : null;
						sum += getParam(simData, param, SequenceOntology.PROMOTER,
								"promoter '" + individualNames.get(i) + "'");
					}
					mergedSimData.put(param, sum);
				}
				GlyphInfo mergedPromoterInfo = new GlyphInfo();
				mergedPromoterInfo.setSimulationData(mergedSimData);

				Species promoterSpecies = sbmlModel.createSpecies(mergedId);
				promoterSpecies.setCompartment("Cell");
				promoterSpecies.setSBOTerm(590); // SBO:0000590 Logical element (promoter)
				promoterSpecies.setInitialAmount(((Number) mergedSimData.get(SBOLData.PARAM_NG)).doubleValue());
				promoterSpecies.setHasOnlySubstanceUnits(true);
				promoterSpecies.setConstant(false);
				promoterSpecies.setBoundaryCondition(false);
				promoterSpecies.setName(mergedName);

				mxGeometry backboneGeom = backbone.getGeometry();
				SpeciesData mergedSpeciesData = new SpeciesData(promoterSpecies, backboneGeom);
				for (mxCell promoterGlyph : promoterGlyphs) {
					glyphToSpeciesData.put((String) promoterGlyph.getValue(), mergedSpeciesData);
				}
				displayNameToSpeciesId.put(mergedName, mergedId);
				for (String individualName : individualNames) {
					displayNameToSpeciesId.put(individualName, mergedId);
				}
				layoutBounds.update(backboneGeom);

				tuMap.put(backbone, new TUData(promoterGlyphs, promoterSpecies, mergedPromoterInfo));
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
				if (species == null)
					continue;
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
					if (info == null)
						continue;

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

		// Build one Production reaction per TU; TUs whose CDS-driven products are absent get a placeholder mRNA (matches iBioSim)
		for (TUData tuData : tuMap.values()) {
			GlyphInfo promoterInfo = tuData.mergedPromoterInfo;
			String promoterId = tuData.promoterSpecies.getId();
			String reactionId = "Production_" + promoterId;
			reactionToPromoterId.put(reactionId, promoterId);

			Reaction reaction = sbmlModel.createReaction(reactionId);
			reaction.setReversible(false);
			reaction.setSBOTerm(589); // SBO:0000589 Genetic Production
			reaction.setCompartment("Cell");

			ModifierSpeciesReference promoterModifier = reaction.createModifier(tuData.promoterSpecies);
			promoterModifier.setSBOTerm(598); // SBO:0000598 Promoter

			double np = getParam(promoterInfo.getSimulationData(), SBOLData.PARAM_NP, SequenceOntology.PROMOTER, "promoter '" + promoterId + "'");
			for (mxCell productionEdge : tuData.productionEdges) {
				mxCell targetCell = (mxCell) productionEdge.getTarget();
				if (targetCell == null)
					continue;
				SpeciesData productData = glyphToSpeciesData.get((String) targetCell.getValue());
				if (productData == null)
					continue;
				SpeciesReference product = reaction.createProduct(productData.species);
				product.setConstant(true);
				product.setStoichiometry(np);
			}

			if (reaction.getProductCount() == 0) {
				Species mRNA = createPlaceholderMRnaSpecies(sbmlModel, promoterId);
				SpeciesReference product = reaction.createProduct(mRNA);
				product.setConstant(true);
				product.setStoichiometry(np);
			}

			List<mxCell> repressorEdges = new ArrayList<>();
			List<mxCell> activatorEdges = new ArrayList<>();

			for (mxCell promoterGlyph : tuData.promoterGlyphs) {
				Object[] incoming = mxGraphModel.getIncomingEdges(graphModel, promoterGlyph);
				for (Object obj : incoming) {
					mxCell inEdge = (mxCell) obj;
					InteractionInfo inInfo = (InteractionInfo) interactionDict.get(inEdge.getValue());
					if (inInfo == null)
						continue;
					String type = inInfo.getInteractionType();
					URI typeURI = SBOLData.interactions.getValue(type);
					mxCell modifierCell = (mxCell) inEdge.getSource();
					if (typeURI == null || modifierCell == null)
						continue;
					SpeciesData modifierData = glyphToSpeciesData.get((String) modifierCell.getValue());
					if (modifierData == null)
						continue;

					if (typeURI.equals(SBOLData.interactions.getValue("Inhibition"))) {
						repressorEdges.add(inEdge);
						ModifierSpeciesReference mod = reaction.createModifier(modifierData.species);
						mod.setSBOTerm(20); // SBO:0000020 Inhibitor
					} else if (typeURI.equals(SBOLData.interactions.getValue("Stimulation"))) {
						activatorEdges.add(inEdge);
						ModifierSpeciesReference mod = reaction.createModifier(modifierData.species);
						mod.setSBOTerm(459); // SBO:0000459 Stimulator
					}
				}
			}

			if (activatorEdges.isEmpty()) {
				buildRepressionFormula(reaction, promoterId, promoterInfo, repressorEdges);
			} else {
				buildActivationFormula(reaction, promoterId, promoterInfo, activatorEdges, repressorEdges);
			}
		}
	}

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
					if (info == null)
						continue;

					String type = info.getInteractionType();
					URI typeURI = SBOLData.interactions.getValue(type);
					if (typeURI != null && typeURI.equals(SBOLData.interactions.getValue("Degradation"))) {
						createDegradationReaction(sbmlModel, cell, info);
					}
				}
			}
		}
	}

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
	 * Constitutive (0 repressors/activators) and repression-only (N repressors) production.
	 * Formula: (P * ko * Ko * nr) / (1 + Ko * nr + SUM_i[(Kr_i * R_i)^nc_i])
	 * where Ko = ko_f/ko_r, Kr_i = kr_<repId>_f/kr_<repId>_r.
	 */
	void buildRepressionFormula(Reaction reaction, String promoterId, GlyphInfo promoterInfo,
			List<mxCell> repressorEdges) {
		Model sbmlModel = reaction.getModel();

		List<SpeciesData> repressors = resolveRegulators(repressorEdges, reaction, sbmlModel,
				"repression formula", promoterId);
		if (repressors == null)
			return;

		KineticLaw law = reaction.createKineticLaw();

		Hashtable<String, Object> promoterSimData = promoterInfo.getSimulationData();
		String promoterContext = "promoter '" + promoterId + "'";
		double ko = getParam(promoterSimData, SBOLData.PARAM_KO, SequenceOntology.PROMOTER, promoterContext);
		double Ko_f = getParam(promoterSimData, SBOLData.PARAM_KO_F, SequenceOntology.PROMOTER, promoterContext);
		double Ko_r = getParam(promoterSimData, SBOLData.PARAM_KO_R, SequenceOntology.PROMOTER, promoterContext);
		double nr = getParam(promoterSimData, SBOLData.PARAM_NR, SequenceOntology.PROMOTER, promoterContext);

		law.createLocalParameter("ko").setValue(ko);
		law.createLocalParameter("ko_f").setValue(Ko_f);
		law.createLocalParameter("ko_r").setValue(Ko_r);
		law.createLocalParameter("nr").setValue(nr);

		String Ko = "(ko_f/ko_r)";
		StringBuilder repressorTerms = new StringBuilder();
		for (int i = 0; i < repressorEdges.size(); i++) {
			repressorTerms.append(" + ").append(buildRepressorTerm(
					law, repressorEdges.get(i), repressors.get(i), promoterId));
		}

		String formula = "(" + promoterId + " * ko * " + Ko + " * nr) / (1 + " + Ko + " * nr"
				+ repressorTerms.toString() + ")";

		try {
			law.setMath(ASTNode.parseFormula(formula));
		} catch (Exception e) {
			log.warn("repression formula parse failed for " + promoterId + ": " + e.getMessage());
			if (sbmlModel != null)
				sbmlModel.removeReaction(reaction);
		}
	}

	/**
	 * Activation (N activators), mixed regulation, and same-species dual-activity.
	 * Formula: P * (kb*Ko*nr + SUM_j[ka*Kao*nr*(Ka_j*A_j)^nc_j])
	 * / (1 + Ko*nr + SUM_j[Kao*nr*(Ka_j*A_j)^nc_j] + SUM_i[(Kr_i*R_i)^nc_i])
	 * where Ko = ko_f/ko_r, Kao = kao_f/kao_r,
	 * Ka_j = ka_<actId>_f/ka_<actId>_r, Kr_i = kr_<repId>_f/kr_<repId>_r.
	 */
	void buildActivationFormula(Reaction reaction, String promoterId, GlyphInfo promoterInfo,
			List<mxCell> activatorEdges, List<mxCell> repressorEdges) {
		Model sbmlModel = reaction.getModel();

		List<SpeciesData> activators = resolveRegulators(activatorEdges, reaction, sbmlModel,
				"activation formula", promoterId);
		if (activators == null)
			return;
		List<SpeciesData> repressors = resolveRegulators(repressorEdges, reaction, sbmlModel,
				"activation formula", promoterId);
		if (repressors == null)
			return;

		KineticLaw law = reaction.createKineticLaw();

		Hashtable<String, Object> promoterSimData = promoterInfo.getSimulationData();
		String promoterContext = "promoter '" + promoterId + "'";
		double kb = getParam(promoterSimData, SBOLData.PARAM_KB, SequenceOntology.PROMOTER, promoterContext);
		double ka = getParam(promoterSimData, SBOLData.PARAM_KA, SequenceOntology.PROMOTER, promoterContext);
		double Ko_f = getParam(promoterSimData, SBOLData.PARAM_KO_F, SequenceOntology.PROMOTER, promoterContext);
		double Ko_r = getParam(promoterSimData, SBOLData.PARAM_KO_R, SequenceOntology.PROMOTER, promoterContext);
		double Kao_f = getParam(promoterSimData, SBOLData.PARAM_KAO_F, SequenceOntology.PROMOTER, promoterContext);
		double Kao_r = getParam(promoterSimData, SBOLData.PARAM_KAO_R, SequenceOntology.PROMOTER, promoterContext);
		double nr = getParam(promoterSimData, SBOLData.PARAM_NR, SequenceOntology.PROMOTER, promoterContext);

		law.createLocalParameter("kb").setValue(kb);
		law.createLocalParameter("ka").setValue(ka);
		law.createLocalParameter("ko_f").setValue(Ko_f);
		law.createLocalParameter("ko_r").setValue(Ko_r);
		law.createLocalParameter("kao_f").setValue(Kao_f);
		law.createLocalParameter("kao_r").setValue(Kao_r);
		law.createLocalParameter("nr").setValue(nr);

		String Ko = "(ko_f/ko_r)";
		String Kao = "(kao_f/kao_r)";

		StringBuilder numeratorActivators = new StringBuilder();
		StringBuilder denomActivators = new StringBuilder();
		for (int j = 0; j < activatorEdges.size(); j++) {
			String Ka_term = buildActivatorTerm(law, activatorEdges.get(j), activators.get(j), promoterId);
			numeratorActivators.append(" + ka * ").append(Kao).append(" * nr * ").append(Ka_term);
			denomActivators.append(" + ").append(Kao).append(" * nr * ").append(Ka_term);
		}

		StringBuilder denomRepressors = new StringBuilder();
		for (int i = 0; i < repressorEdges.size(); i++) {
			denomRepressors.append(" + ").append(buildRepressorTerm(
					law, repressorEdges.get(i), repressors.get(i), promoterId));
		}

		String numerator = "(" + promoterId + " * (kb * " + Ko + " * nr" + numeratorActivators.toString() + "))";
		String denominator = "(1 + " + Ko + " * nr" + denomActivators.toString() + denomRepressors.toString() + ")";
		String formula = numerator + " / " + denominator;

		try {
			law.setMath(ASTNode.parseFormula(formula));
		} catch (Exception e) {
			log.warn("activation formula parse failed for " + promoterId + ": " + e.getMessage());
			if (sbmlModel != null)
				sbmlModel.removeReaction(reaction);
		}
	}

	/** Resolve regulator edges; on failure, removes the reaction and returns null. */
	private List<SpeciesData> resolveRegulators(List<mxCell> edges, Reaction reaction, Model sbmlModel,
			String formulaContext, String promoterId) {
		List<SpeciesData> resolved = new ArrayList<>();
		for (mxCell edge : edges) {
			mxCell cell = (mxCell) edge.getSource();
			if (cell == null) {
				log.warn(formulaContext + " for '" + promoterId
						+ "' skipped; regulator edge has no source.");
				if (sbmlModel != null)
					sbmlModel.removeReaction(reaction);
				return null;
			}
			SpeciesData data = glyphToSpeciesData.get((String) cell.getValue());
			if (data == null) {
				log.warn(formulaContext + " for '" + promoterId
						+ "' skipped; unresolved regulator species for cell '" + cell.getValue() + "'.");
				if (sbmlModel != null)
					sbmlModel.removeReaction(reaction);
				return null;
			}
			resolved.add(data);
		}
		return resolved;
	}

	/**
	 * Returns `((kr_<id>_f/kr_<id>_r) * <id>)^nc_<id>_r`,
	 * creating the per-repressor local parameters.
	 */
	private String buildRepressorTerm(KineticLaw law, mxCell repressorEdge, SpeciesData repData, String promoterId) {
		String repId = repData.species.getId();
		InteractionInfo repInfo = (InteractionInfo) interactionDict.get(repressorEdge.getValue());
		Hashtable<String, Object> repSimData = repInfo != null ? repInfo.getSimulationData() : null;
		String repContext = "inhibition from '" + repId + "' to '" + promoterId + "'";
		double Kr_f = getParam(repSimData, SBOLData.PARAM_KR_F, SystemsBiologyOntology.INHIBITION, repContext);
		double Kr_r = getParam(repSimData, SBOLData.PARAM_KR_R, SystemsBiologyOntology.INHIBITION, repContext);
		double nc = getParam(repSimData, SBOLData.PARAM_NC, SystemsBiologyOntology.INHIBITION, repContext);

		String p_Krf = "kr_" + repId + "_f";
		String p_Krr = "kr_" + repId + "_r";
		String p_nc = "nc_" + repId + "_r";
		if (law.getLocalParameter(p_Krf) == null)
			law.createLocalParameter(p_Krf).setValue(Kr_f);
		if (law.getLocalParameter(p_Krr) == null)
			law.createLocalParameter(p_Krr).setValue(Kr_r);
		if (law.getLocalParameter(p_nc) == null)
			law.createLocalParameter(p_nc).setValue(nc);

		return "((" + p_Krf + "/" + p_Krr + ") * " + repId + ")^" + p_nc;
	}

	/**
	 * Returns `((ka_<id>_f/ka_<id>_r) * <id>)^nc_<id>_a`,
	 * creating the per-activator local parameters.
	 */
	private String buildActivatorTerm(KineticLaw law, mxCell activatorEdge, SpeciesData actData, String promoterId) {
		String actId = actData.species.getId();
		InteractionInfo actInfo = (InteractionInfo) interactionDict.get(activatorEdge.getValue());
		Hashtable<String, Object> actSimData = actInfo != null ? actInfo.getSimulationData() : null;
		String actContext = "stimulation from '" + actId + "' to '" + promoterId + "'";
		double Ka_f = getParam(actSimData, SBOLData.PARAM_KA_F, SystemsBiologyOntology.STIMULATION, actContext);
		double Ka_r = getParam(actSimData, SBOLData.PARAM_KA_R, SystemsBiologyOntology.STIMULATION, actContext);
		double nc = getParam(actSimData, SBOLData.PARAM_NC, SystemsBiologyOntology.STIMULATION, actContext);

		String p_Kaf = "ka_" + actId + "_f";
		String p_Kar = "ka_" + actId + "_r";
		String p_nc = "nc_" + actId + "_a";
		if (law.getLocalParameter(p_Kaf) == null)
			law.createLocalParameter(p_Kaf).setValue(Ka_f);
		if (law.getLocalParameter(p_Kar) == null)
			law.createLocalParameter(p_Kar).setValue(Ka_r);
		if (law.getLocalParameter(p_nc) == null)
			law.createLocalParameter(p_nc).setValue(nc);

		return "((" + p_Kaf + "/" + p_Kar + ") * " + actId + ")^" + p_nc;
	}

	/**
	 * TUs without an explicit product are assumed to create an undocumented mRNA.
	 * Placeholder mRNA created as `<promoterId>_mRNA` species (SBO:0000250, initialAmount 0).
	 * This matches how iBioSim handles promoter species without products.
	 */
	private Species createPlaceholderMRnaSpecies(Model sbmlModel, String promoterId) {
		String mRnaId = sanitizeId(promoterId + "_mRNA");
		Species mRNA = sbmlModel.createSpecies(mRnaId);
		mRNA.setCompartment("Cell");
		mRNA.setSBOTerm(250); // SBO:0000250 Ribonucleic acid
		mRNA.setInitialAmount(0);
		mRNA.setHasOnlySubstanceUnits(true);
		mRNA.setConstant(false);
		mRNA.setBoundaryCondition(false);
		return mRNA;
	}

	private void createEdge(Layout layout, String sourceId, String targetId, String type,
			Map<String, Point2D> speciesCenter) {
		Point2D source = speciesCenter.get(sourceId);
		Point2D target = speciesCenter.get(targetId);

		if (source == null || target == null)
			return;

		String rgId = glyphId(sourceId + "__" + type + "__" + targetId);
		ReactionGlyph rg = layout.createReactionGlyph(rgId);
		setBoundingBox(rg, target.getX(), target.getY(), 0, 0);

		String srgId = "ReferenceGlyph__" + sourceId + "__" + type + "__" + targetId;
		SpeciesReferenceGlyph srg = rg.createSpeciesReferenceGlyph(srgId, glyphId(targetId));
		srg.setSpeciesReferenceRole(SpeciesReferenceRole.PRODUCT);

		double midX = (source.getX() + target.getX()) / 2.0;
		double midY = (source.getY() + target.getY()) / 2.0;
		setBoundingBox(srg, midX, midY, 0, 0);

		drawLineFromTo(srg, source.getX(), source.getY(), target.getX(), target.getY());
	}

	private Layout setupLayout(Model sbmlModel) {
		sbmlModel.enablePackage("layout");
		LayoutModelPlugin layoutPlugin = (LayoutModelPlugin) sbmlModel.getPlugin("layout");
		Layout layout = layoutPlugin.createLayout("iBioSim");

		double buffer = 75.0;
		double canvasWidth = layoutBounds.getCanvasWidth(buffer);
		double canvasHeight = layoutBounds.getCanvasHeight(buffer);
		layout.createDimensions(canvasWidth, canvasHeight, 0);

		CompartmentGlyph cellGlyph = layout.createCompartmentGlyph(glyphId("Cell"), "Cell");
		setBoundingBox(cellGlyph, 0, 0, canvasWidth, canvasHeight);

		addTextGlyph(layout, glyphId("Cell"), "Cell", 0, 0, canvasWidth, canvasHeight);

		return layout;
	}

	/** Apply a bounding box (position + dimensions) to any layout GraphicalObject. */
	private static void setBoundingBox(GraphicalObject g, double x, double y, double width, double height) {
		BoundingBox bb = g.createBoundingBox();
		bb.createPosition(x, y, 0);
		bb.createDimensions(width, height, 0);
	}

	/**
	 * Draw a single-segment curve between two points on a SpeciesReferenceGlyph.
	 * (createCurve is per-subtype in jsbml; SpeciesReferenceGlyph and ReferenceGlyph
	 * each declare their own. Both produce the same Curve type, so the segment
	 * construction is shared via {@link #drawLineSegment}.)
	 */
	private static void drawLineFromTo(SpeciesReferenceGlyph g, double x1, double y1, double x2, double y2) {
		drawLineSegment(g.createCurve(), x1, y1, x2, y2);
	}

	/** Draw a single-segment curve between two points on a ReferenceGlyph. */
	private static void drawLineFromTo(ReferenceGlyph g, double x1, double y1, double x2, double y2) {
		drawLineSegment(g.createCurve(), x1, y1, x2, y2);
	}

	private static void drawLineSegment(Curve curve, double x1, double y1, double x2, double y2) {
		LineSegment ls = curve.createLineSegment();
		ls.createStart(x1, y1, 0);
		ls.createEnd(x2, y2, 0);
	}

	/** Canonical Layout id for a model entity (`Glyph__<entityId>`). */
	private static String glyphId(String entityId) {
		return "Glyph__" + entityId;
	}

	/** TextGlyph labelling a graphical object with its same bounding box. */
	private void addTextGlyph(Layout layout, String graphicalObjectId, String text,
			double x, double y, double width, double height) {
		TextGlyph tg = layout.createTextGlyph("TextGlyph__" + graphicalObjectId.replaceFirst("^Glyph__", ""));
		tg.setGraphicalObject(graphicalObjectId);
		tg.setText(text);
		setBoundingBox(tg, x, y, width, height);
	}

	private Map<String, Point2D> createSpeciesGlyphs(Layout layout) {
		Map<String, Point2D> speciesCenter = new HashMap<>();
		Set<String> seenSpeciesIds = new HashSet<>();
		double buffer = 75.0;

		for (SpeciesData data : glyphToSpeciesData.values()) {
			String speciesId = data.species.getId();
			if (!seenSpeciesIds.add(speciesId)) {
				// Multiple promoter glyphs map to one merged species; emit one SpeciesGlyph.
				continue;
			}

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

			String sgId = glyphId(speciesId);
			SpeciesGlyph sg = layout.createSpeciesGlyph(sgId, speciesId);
			setBoundingBox(sg, normX, normY, width, height);

			addTextGlyph(layout, sgId, speciesId, normX, normY, width, height);

			speciesCenter.put(speciesId, new Point2D.Double(
					normX + width / 2.0,
					normY + height / 2.0));
		}

		return speciesCenter;
	}

	private void createProductionEdges(Layout layout, Reaction reaction,
			Map<String, Point2D> speciesCenter) {
		String promoterId = reactionToPromoterId.get(reaction.getId());

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
		if (reaction.getListOfProducts().size() == 0) {
			return;
		}
		String productId = reaction.getProduct(0).getSpecies();

		for (SpeciesReference reactant : reaction.getListOfReactants()) {
			createEdge(layout, reactant.getSpecies(), productId, "complex", speciesCenter);
		}
	}

	/**
	 * Add SBOLCanvas Glyph positions to the SBML Layout.
	 */
	private void createVisualLayout(Model sbmlModel) {
		if (glyphToSpeciesData.isEmpty() && eventIdToEventData.isEmpty()) {
			return; // No positioned entities -- layout bounds are uninitialized
		}

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

		createEventGlyphs(layout, speciesCenter);
	}

	/**
	 * Create a GeneralGlyph per event with a ReferenceGlyph curve to the target species.
	 * Skips events without geometry.
	 */
	private void createEventGlyphs(Layout layout, Map<String, Point2D> speciesCenter) {
		double buffer = 75.0;

		for (Map.Entry<String, EventData> entry : eventIdToEventData.entrySet()) {
			String eventId = entry.getKey();
			EventData data = entry.getValue();
			if (data.geometry == null) {
				continue;
			}

			double normX = layoutBounds.normalizeX(data.geometry.getX(), buffer);
			double normY = layoutBounds.normalizeY(data.geometry.getY(), buffer);
			double width = data.geometry.getWidth();
			double height = data.geometry.getHeight();

			String ggId = glyphId(eventId);
			GeneralGlyph gg = layout.createGeneralGlyph(ggId, eventId);
			setBoundingBox(gg, normX, normY, width, height);

			Point2D target = speciesCenter.get(data.targetSpeciesId);
			if (target != null) {
				ReferenceGlyph rg = gg.createReferenceGlyph(
						ggId + "__product__" + data.targetSpeciesId);
				rg.setGlyph(glyphId(data.targetSpeciesId));
				rg.setRole("product");

				double eventCenterX = normX + width / 2.0;
				double eventCenterY = normY + height / 2.0;
				setBoundingBox(rg, eventCenterX, eventCenterY, 0, 0);
				drawLineFromTo(rg, eventCenterX, eventCenterY, target.getX(), target.getY());
			}

			addTextGlyph(layout, ggId, eventId, normX, normY, width, height);
		}
	}

	/**
	 * Create SBML events get their canvas geometry for layout.
	 * Each event uses the EventInfo URI for the mxCell lookup.
	 */
	private void createEvents(Model sbmlModel, mxGraphModel graphModel) {
		if (eventDict == null || eventDict.isEmpty()) {
			return;
		}

		// Event cells, like all glyph cells, are keyed by value (fullURI); their ids are auto-generated.
		Map<String, mxCell> eventCellsByValue = new HashMap<>();
		mxCell[] eventViewCells = Arrays.stream(mxGraphModel.getChildCells(graphModel, graphModel.getCell("1"), true, false))
				.toArray(mxCell[]::new);
		for (mxCell viewCell : eventViewCells) {
			for (Object child : mxGraphModel.getChildCells(graphModel, viewCell, true, false)) {
				mxCell c = (mxCell) child;
				String style = c.getStyle();
				if (style != null && style.contains(STYLE_EVENT) && c.getValue() != null) {
					eventCellsByValue.put(c.getValue().toString(), c);
				}
			}
		}

		for (EventInfo eventInfo : eventDict.values()) {
			Hashtable<String, Object> simData = eventInfo.getSimulationData();
			String context = "event '" + eventInfo.getDisplayID() + "'";

			String targetSpecies = getStringParam(simData, SBOLData.PARAM_EVENT_TARGET_SPECIES);
			if (targetSpecies == null || targetSpecies.isEmpty()) {
				continue;
			}

			// Resolve display name to SBML species ID. The user enters a display
			// name (e.g., "LacI protein") but SBML uses sanitized IDs ("LacI_protein").
			String speciesId = resolveSpeciesId(sbmlModel, targetSpecies, displayNameToSpeciesId);
			if (speciesId == null) {
				log.warn(context + ": targetSpecies '" + targetSpecies + "' did not resolve to a species; event skipped");
				continue;
			}

			String eventName = eventInfo.getName();
			if (eventName == null || eventName.isEmpty()) {
				eventName = eventInfo.getDisplayID();
			}
			String eventId = sanitizeId(eventName);
			Event event = sbmlModel.createEvent(eventId);
			event.setUseValuesFromTriggerTime(false);

			// Trigger hardcoded to true. TODO: add conditional triggers
			Trigger trigger = event.createTrigger();
			trigger.setInitialValue(false);
			trigger.setPersistent(false);
			trigger.setMath(new ASTNode(ASTNode.Type.CONSTANT_TRUE));

			// Delay: default to 0.0 if not specified
			double delayVal = 0.0;
			if (simData != null && simData.containsKey(SBOLData.PARAM_EVENT_DELAY)) {
				delayVal = extractDouble(simData.get(SBOLData.PARAM_EVENT_DELAY), 0.0,
						"delay on " + context);
			}
			Delay delay = event.createDelay();
			delay.setMath(numericLiteralAst(delayVal));

			// Assignment value: default to 0.0 if not specified
			double assignVal = 0.0;
			if (simData != null && simData.containsKey(SBOLData.PARAM_EVENT_ASSIGNMENT_VALUE)) {
				assignVal = extractDouble(simData.get(SBOLData.PARAM_EVENT_ASSIGNMENT_VALUE), 0.0,
						"assignment value on " + context);
			}
			EventAssignment assignment = event.createEventAssignment();
			assignment.setVariable(speciesId);
			assignment.setMath(numericLiteralAst(assignVal));

			// Record geometry for layout.
			// Events imported without position annotations have no cell.
			mxCell eventCell = eventCellsByValue.get(eventInfo.getFullURI());
			mxGeometry geom = (eventCell != null) ? eventCell.getGeometry() : null;
			if (geom != null) {
				layoutBounds.update(geom);
			}
			eventIdToEventData.put(eventId, new EventData(event, geom, speciesId));
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
		if (glyphInfo == null)
			return null;

		// SBML ID becomes the label. Pick Name over DisplayID
		String displayName = glyphInfo.getDisplayID();
		if (glyphInfo.getName() != null && !glyphInfo.getName().isEmpty()) {
			displayName = glyphInfo.getName();
		}
		String speciesId = sanitizeId(displayName);
		displayNameToSpeciesId.put(displayName, speciesId);

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
			initialAmount = extractDouble(glyphInfo.getSimulationData().get("initialAmount"), 0.0,
					"initialAmount on species '" + glyphInfo.getDisplayID() + "'");
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
	private void createDegradationReaction(Model model, mxCell edge, InteractionInfo info) {
		mxCell source = (mxCell) edge.getSource();
		if (source == null)
			return;
		SpeciesData sourceData = glyphToSpeciesData.get((String) source.getValue());
		if (sourceData == null)
			return;

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
		kd.setValue(getParam(info.getSimulationData(), SBOLData.PARAM_KD, SystemsBiologyOntology.DEGRADATION, "degradation of '" + speciesId + "'"));
		try {
			law.setMath(ASTNode.parseFormula("kd * " + speciesId));
		} catch (Exception e) {
			log.warn("degradation formula parse failed for " + speciesId + ": " + e.getMessage());
			model.removeReaction(reaction);
			return;
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
		if (outgoing.length == 0)
			return;

		mxCell outEdge = (mxCell) outgoing[0];
		mxCell target = (mxCell) outEdge.getTarget();
		if (target == null)
			return;
		SpeciesData productData = glyphToSpeciesData.get((String) target.getValue());
		if (productData == null)
			return;

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
			if (source == null)
				continue;
			SpeciesData sourceData = glyphToSpeciesData.get((String) source.getValue());
			if (sourceData == null)
				continue;

			String speciesId = sourceData.species.getId();
			SpeciesReference r = reaction.createReactant(sourceData.species);
			r.setStoichiometry(1.0);
			r.setConstant(true);

			InteractionInfo edgeInfo = (InteractionInfo) interactionDict.get(inEdge.getValue());
			Hashtable<String, Object> edgeSimData = edgeInfo != null ? edgeInfo.getSimulationData() : null;
			String sourceURI = (String) source.getValue();
			double nc = getKeyedParam(edgeSimData, SBOLData.PARAM_NC, sourceURI, SystemsBiologyOntology.NON_COVALENT_BINDING,
					"complex formation of '" + productId + "' (reactant '" + speciesId + "')");

			String ncParam = "nc_" + speciesId;
			law.createLocalParameter(ncParam).setValue(nc);
			rateLaw.append(" * ").append(speciesId).append("^").append(ncParam);
		}

		SpeciesReference p = reaction.createProduct(productData.species);
		p.setStoichiometry(1.0);
		p.setConstant(true);

		rateLaw.append(" - kc_r * ").append(productId);

		law.createLocalParameter(SBOLData.PARAM_KC_F.toLowerCase()).setValue(
				getParam(info.getSimulationData(), SBOLData.PARAM_KC_F, SystemsBiologyOntology.NON_COVALENT_BINDING,
						"complex formation of '" + productId + "'"));
		law.createLocalParameter(SBOLData.PARAM_KC_R.toLowerCase()).setValue(
				getParam(info.getSimulationData(), SBOLData.PARAM_KC_R, SystemsBiologyOntology.NON_COVALENT_BINDING,
						"complex formation of '" + productId + "'"));

		try {
			law.setMath(ASTNode.parseFormula(rateLaw.toString()));
		} catch (Exception e) {
			log.warn("complex formation formula parse failed for " + productId + ": " + e.getMessage());
			model.removeReaction(reaction);
			return;
		}
	}

	/**
	 * Extracts a double from a value that may be a Number, a numeric String,
	 * or null. Returns defaultVal for null, unparseable strings, or unexpected types.
	 */
	private double extractDouble(Object val, double defaultVal, String context) {
		if (val == null)
			return defaultVal;
		if (val instanceof Number)
			return ((Number) val).doubleValue();
		if (val instanceof String) {
			try {
				return Double.parseDouble((String) val);
			} catch (NumberFormatException e) {
				log.warn("non-numeric value for " + context + ": '" + val + "', using default " + defaultVal);
				return defaultVal;
			}
		}
		log.warn("unexpected type for " + context + ": " + val.getClass().getSimpleName() + ", using default " + defaultVal);
		return defaultVal;
	}

	/** INTEGER for finite whole values in int range; REAL otherwise. Matches iBioSim's MathML. */
	private static ASTNode numericLiteralAst(double value) {
		// JSBML has no setValue(long) overload; setValue(double) silently resets the
		// node type to REAL. Use setValue(int) -- capped to int range -- so the node
		// stays INTEGER and serializes as <cn type="integer">.
		if (Double.isFinite(value) && value == Math.floor(value)
				&& value >= Integer.MIN_VALUE && value <= Integer.MAX_VALUE) {
			ASTNode node = new ASTNode(ASTNode.Type.INTEGER);
			node.setValue((int) value);
			return node;
		}
		ASTNode node = new ASTNode(ASTNode.Type.REAL);
		node.setValue(value);
		return node;
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
			// default unreachable -- Hashtable forbids null values
			return extractDouble(simData.get(paramName), 0.0,
					"parameter '" + paramName + "' on " + context);
		}
		return getDefaultValue(type, paramName, context);
	}

	/**
	 * Gets a string simulation parameter from simulationData.
	 * Returns null if the key is missing or the value is null.
	 */
	private String getStringParam(Hashtable<String, Object> simData, String paramName) {
		if (simData == null || !simData.containsKey(paramName))
			return null;
		Object val = simData.get(paramName);
		return val != null ? val.toString() : null;
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
			// default unreachable -- Hashtable forbids null values
			return extractDouble(simData.get(keyedParamName), 0.0,
					"parameter '" + keyedParamName + "' on " + context);
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
			log.warn("no default for '" + paramName + "' on " + context + ": unknown type, using 0.0");
			return 0.0;
		}

		LinkedHashMap<String, Object> params = SBOLData.getSimulationConfig().get(key);
		if (params == null) {
			log.warn("no default for '" + paramName + "' on " + context + ": no config for type '" + key + "', using 0.0");
			return 0.0;
		}

		Object val = params.get(paramName);
		if (val == null) {
			log.warn("no default for '" + paramName + "' on " + context + ": missing from config, using 0.0");
			return 0.0;
		}

		if (val instanceof Number) {
			return ((Number) val).doubleValue();
		}
		log.warn("invalid default type for '" + paramName + "' on " + context + ": " + val.getClass().getSimpleName() + ", using 0.0");
		return 0.0;
	}

	/**
	 * Resolve a user-entered species name to its SBML species ID.
	 * Tries: direct SBML ID match, then display name lookup, then SBML name match.
	 *
	 * @return The resolved SBML species ID, or null if no match found
	 */
	private static String resolveSpeciesId(Model sbmlModel, String targetSpecies,
			Map<String, String> nameToIdMap) {
		// Direct SBML ID match (user typed the sanitized ID)
		if (sbmlModel.getSpecies(targetSpecies) != null) {
			return targetSpecies;
		}
		// Display name -> SBML ID lookup (user typed the display name)
		String mapped = nameToIdMap.get(targetSpecies);
		if (mapped != null && sbmlModel.getSpecies(mapped) != null) {
			return mapped;
		}
		// Fallback: match by SBML species name attribute
		for (Species sp : sbmlModel.getListOfSpecies()) {
			if (targetSpecies.equals(sp.getName())) {
				return sp.getId();
			}
		}
		return null;
	}

	/**
	 * Sanitizes an ID to be a valid SBML SId. SBML SId must:
	 * - be unique
	 * - start with a letter or underscore
	 * - contain only letters, digits, and underscores
	 *
	 * @param id The raw ID string
	 * @return A valid, unique SBML SId
	 * @see Converter#sanitizeAnnotationKey for XML NCName sanitization (different rules)
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
