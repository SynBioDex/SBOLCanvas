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


// JSBML API Docs: https://sbml.org/jsbml/files/doc/api/1.6.1/overview-summary.html
import org.sbml.jsbml.SBase;
import org.sbml.jsbml.SBMLDocument;
import org.sbml.jsbml.TidySBMLWriter;
import org.sbml.jsbml.Model;
import org.sbml.jsbml.Parameter;
import org.sbml.jsbml.ext.comp.CompModelPlugin;
import org.sbml.jsbml.ext.comp.CompConstants;
import org.sbml.jsbml.ext.comp.Port;
import org.sbml.jsbml.ext.fbc.FBCConstants;
import org.sbml.jsbml.ext.fbc.FBCModelPlugin;
import org.sbml.jsbml.Species;
import org.sbml.jsbml.Compartment;
import org.sbml.jsbml.Reaction;
import org.sbml.jsbml.KineticLaw;
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


import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGeometry;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.view.mxGraph;

import org.sbolcanvas.data.GlyphInfo;
import org.sbolcanvas.data.InteractionInfo;
import org.sbolcanvas.data.EventInfo;

public class MxToSBML extends Converter {

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

	private enum Role { REACTANT, PRODUCT, MODIFIER, OMITTED }

	private static class Participant {
		final SpeciesData data;
		final Role role;
		final Double coefficient;
		final URI roleUri;

		Participant(SpeciesData data, Role role, Double coefficient, URI roleUri) {
			this.data = data;
			this.role = role;
			this.coefficient = coefficient;
			this.roleUri = roleUri;
		}
	}

	private static class BindingGroup {
		final SpeciesData product;
		final boolean reversible;
		Double kcF;
		Double kcR;
		final List<Participant> reactants = new ArrayList<>();

		BindingGroup(SpeciesData product, boolean reversible) {
			this.product = product;
			this.reversible = reversible;
		}
	}

	static class Regulator {
		final SpeciesData data;
		final Double rateF;
		final Double rateR;
		final Double cooperativity;

		Regulator(SpeciesData data, Double rateF, Double rateR, Double cooperativity) {
			this.data = data;
			this.rateF = rateF;
			this.rateR = rateR;
			this.cooperativity = cooperativity;
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
	LinkedHashMap<mxCell, SpeciesData> glyphToSpeciesData = new LinkedHashMap<>();
	private final HashSet<mxCell> missingSpeciesCells = new HashSet<>();
	HashMap<String, EventData> eventIdToEventData = new LinkedHashMap<>();
	private HashMap<String, String> reactionToPromoterId = new HashMap<>();

	public MxToSBML() {
		this(null);
	}

	public MxToSBML(HashMap<String, String> userTokens) {
		super();
		this.userTokens = userTokens;
	}

	public void toSBML(InputStream graphStream, OutputStream sbmlStream) throws IOException,
			TransformerFactoryConfigurationError, TransformerException, URISyntaxException, XMLStreamException {
		mxGraph graph = loadGraphAndDictionaries(graphStream);
		mxGraphModel model = (mxGraphModel) graph.getModel();

		SBMLDocument document = new SBMLDocument(3, 2);
		Model sbmlModel = document.createModel("sbolcanvas_model");

		// Create the default "Cell" compartment
		// https://sbml.org/jsbml/files/doc/api/1.6.1/org/sbml/jsbml/Compartment.html
		Compartment compartment = sbmlModel.createCompartment("Cell");
		compartment.setName("Cell");
		compartment.setSize(1.0);
		compartment.setSpatialDimensions(3);
		compartment.setConstant(true);

		document.enablePackage(CompConstants.namespaceURI);
		CompModelPlugin compModel = (CompModelPlugin) sbmlModel.getPlugin("comp");
		Port compartmentPort = compModel.createPort();
		compartmentPort.setId("compartment__Cell");
		compartmentPort.setIdRef("Cell");
		document.enablePackage(FBCConstants.namespaceURI);
		((FBCModelPlugin) sbmlModel.getPlugin("fbc")).setStrict(false);

		mxCell[] allViewCells = Arrays.stream(mxGraphModel.getChildCells(model, model.getCell("1"), true, false))
				.toArray(mxCell[]::new);
		mxCell[] viewCells = viewsToExport(model, allViewCells);

		usedIds.add("Cell");
		usedIds.addAll(PARAMETER_IDS);

		// Create species
		HashMap<mxCell, TUData> tuMap = createPromoterSpecies(sbmlModel, model, viewCells);
		createMolecularSpecies(sbmlModel, model, viewCells);

		// Create reactions and events
		createProductionReactions(sbmlModel, model, viewCells, tuMap);
		createDegradationReactions(sbmlModel, model, viewCells);
		Map<String, BindingGroup> bindings = new LinkedHashMap<>();
		createInteractionReactions(sbmlModel, model, viewCells, bindings);
		if (!bindings.isEmpty()) {
			addParameters(sbmlModel, BINDING_PARAMETERS);
		}
		for (BindingGroup group : bindings.values()) {
			createBindingReaction(sbmlModel, group);
		}
		createEvents(sbmlModel, model, viewCells);

		// Create visual layout
		createVisualLayout(sbmlModel);

		TidySBMLWriter.write(document, sbmlStream, "SBOLCanvas", "1.0", ' ', (short) 2);
	}

	private static mxCell[] viewsToExport(mxGraphModel graphModel, mxCell[] allViewCells) {
		Set<String> moduleCellValues = new HashSet<>();
		for (mxCell viewCell : allViewCells) {
			if (!isViewCell(viewCell, STYLE_MODULE_VIEW)) {
				continue;
			}
			collectCellValues(graphModel, viewCell, moduleCellValues);
		}
		return Arrays.stream(allViewCells)
				.filter(viewCell -> !isViewCell(viewCell, STYLE_COMPONENT_VIEW)
				|| !moduleCellValues.contains(viewCell.getId()))
				.toArray(mxCell[]::new);
	}

	private static boolean isViewCell(mxCell cell, String style) {
		return cell != null && cell.getStyle() != null && cell.getStyle().contains(style);
	}

	private static void collectCellValues(mxGraphModel graphModel, mxCell viewCell,
			Set<String> identities) {
		for (Object child : mxGraphModel.getChildCells(graphModel, viewCell, true, false)) {
			mxCell cell = (mxCell) child;
			if (cell.getValue() != null) {
				identities.add((String) cell.getValue());
			}
			collectCellValues(graphModel, cell, identities);
		}
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
					individualNames.add(info.getDisplayName());
				}
				if (promoterGlyphs.isEmpty())
					continue;

				String mergedName = String.join("+", individualNames);
				String mergedId = Identifiers.toSId(mergedName, usedIds);

				Hashtable<String, Object> mergedSimData = new Hashtable<>();
				if (promoterGlyphs.size() == 1) {
					GlyphInfo info = (GlyphInfo) infoDict.get(promoterGlyphs.get(0).getValue());
					if (info.getSimulationData() != null) {
						mergedSimData.putAll(info.getSimulationData());
					}
				} else {
					for (String param : MERGED_PROMOTER_PARAMS) {
						double sum = 0.0;
						for (mxCell promoterGlyph : promoterGlyphs) {
							GlyphInfo info = (GlyphInfo) infoDict.get(promoterGlyph.getValue());
							sum += numberOrDefault(info.getSimulationData(), param, SequenceOntology.PROMOTER);
						}
						mergedSimData.put(param, sum);
					}
				}
				GlyphInfo mergedPromoterInfo = new GlyphInfo();
				mergedPromoterInfo.setSimulationData(mergedSimData);

				Species promoterSpecies = sbmlModel.createSpecies(mergedId);
				promoterSpecies.setCompartment("Cell");
				promoterSpecies.setSBOTerm(590); // SBO:0000590 Logical element (promoter)
				promoterSpecies.setInitialAmount(numberOrDefault(mergedSimData, SBOLData.PARAM_NG, SequenceOntology.PROMOTER));
				promoterSpecies.setHasOnlySubstanceUnits(true);
				promoterSpecies.setConstant(false);
				promoterSpecies.setBoundaryCondition(false);
				promoterSpecies.setName(mergedName);

				// A merged promoter species combines several SBOL parts, so it
				// carries one identity annotation per source part.
				for (mxCell promoterGlyph : promoterGlyphs) {
					GlyphInfo info = (GlyphInfo) infoDict.get(promoterGlyph.getValue());
					if (info != null) {
						attachSbolIdentity(promoterSpecies, info.getFullURI());
					}
				}

				mxGeometry backboneGeom = backbone.getGeometry();
				SpeciesData mergedSpeciesData = new SpeciesData(promoterSpecies, backboneGeom);
				for (mxCell promoterGlyph : promoterGlyphs) {
					glyphToSpeciesData.put(promoterGlyph, mergedSpeciesData);
				}
				layoutBounds.update(backboneGeom);

				tuMap.put(backbone, new TUData(promoterGlyphs, promoterSpecies, mergedPromoterInfo));
			}
		}

		return tuMap;
	}

	private static final String[] NC_PARAMETER = {"nc", "Stoichiometry of binding", "Inhibition", SBOLData.PARAM_COOPERATIVITY};

	private static final String[][] PRODUCTION_PARAMETERS = {
		{"kr_f", "Forward repression binding rate", "Inhibition", SBOLData.PARAM_KR_F},
		{"kr_r", "Reverse repression binding rate", "Inhibition", SBOLData.PARAM_KR_R},
		{"ka_f", "Forward activation binding rate", "Stimulation", SBOLData.PARAM_KA_F},
		{"ka_r", "Reverse activation binding rate", "Stimulation", SBOLData.PARAM_KA_R},
		{"ko_f", "Forward RNAP binding rate", "Promoter", SBOLData.PARAM_KO_F},
		{"ko_r", "Reverse RNAP binding rate", "Promoter", SBOLData.PARAM_KO_R},
		{"kao_f", "Forward activated RNAP binding rate", "Promoter", SBOLData.PARAM_KAO_F},
		{"kao_r", "Reverse activated RNAP binding rate", "Promoter", SBOLData.PARAM_KAO_R},
		NC_PARAMETER,
		{"nr", "Initial RNAP count", "Promoter", SBOLData.PARAM_NR},
		{"ko", "Open complex production rate", "Promoter", SBOLData.PARAM_KO},
		{"kb", "Basal production rate", "Promoter", SBOLData.PARAM_KB},
		{"ng", "Initial promoter count", "Promoter", SBOLData.PARAM_NG},
		{"np", "Stoichiometry of production", "Promoter", SBOLData.PARAM_NP},
		{"ka", "Activated production rate", "Promoter", SBOLData.PARAM_KA}
	};

	private static final String[][] BINDING_PARAMETERS = {
		{"kc_f", "Forward complex formation rate", "Non-Covalent Binding", SBOLData.PARAM_KC_F},
		{"kc_r", "Reverse complex formation rate", "Non-Covalent Binding", SBOLData.PARAM_KC_R},
		NC_PARAMETER
	};

	private static final String[][] DEGRADATION_PARAMETERS = {
		{"kd", "Degradation rate", "Degradation", SBOLData.PARAM_KD}
	};

	private static final Set<String> PARAMETER_IDS = new HashSet<>();
	static {
		PARAMETER_IDS.add("k");
		for (String[][] parameters : new String[][][] {PRODUCTION_PARAMETERS, BINDING_PARAMETERS, DEGRADATION_PARAMETERS}) {
			for (String[] parameter : parameters) {
				PARAMETER_IDS.add(parameter[0]);
			}
		}
	}

	private static void addParameters(Model model, String[][] parameters) {
		for (String[] parameter : parameters) {
			createGlobalParameter(model, parameter[0], parameter[1],
					((Number) SBOLData.getDefault(parameter[2], parameter[3])).doubleValue());
		}
	}

	private static void createGlobalParameter(Model model, String id, String name, double value) {
		if (model.getParameter(id) != null) {
			return;
		}
		Parameter parameter = model.createParameter(id);
		parameter.setName(name);
		parameter.setValue(value);
		parameter.setConstant(true);
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
				glyphToSpeciesData.put(glyph, new SpeciesData(species, glyph.getGeometry()));
			}
		}
	}

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

		if (!tuMap.isEmpty()) {
			addParameters(sbmlModel, PRODUCTION_PARAMETERS);
		}
		// Build one Production reaction per TU
		// TUs with missing CDS products get a placeholder mRNA (matches iBioSim)
		for (TUData tuData : tuMap.values()) {
			GlyphInfo promoterInfo = tuData.mergedPromoterInfo;
			String promoterId = tuData.promoterSpecies.getId();

			boolean missingModifier = false;
			List<mxCell> repressorEdges = new ArrayList<>();
			List<mxCell> activatorEdges = new ArrayList<>();
			for (mxCell promoterGlyph : tuData.promoterGlyphs) {
				Object[] incoming = mxGraphModel.getIncomingEdges(graphModel, promoterGlyph);
				for (Object obj : incoming) {
					mxCell inEdge = (mxCell) obj;
					InteractionInfo inInfo = (InteractionInfo) interactionDict.get(inEdge.getValue());
					if (inInfo == null)
						continue;
					URI typeURI = SBOLData.interactions.getValue(inInfo.getInteractionType());
					boolean inhibition = typeURI != null
							&& typeURI.equals(SBOLData.interactions.getValue("Inhibition"));
					boolean stimulation = typeURI != null
							&& typeURI.equals(SBOLData.interactions.getValue("Stimulation"));
					if (!inhibition && !stimulation)
						continue;
					mxCell modifierCell = (mxCell) inEdge.getSource();
					SpeciesData modifierData = modifierCell != null ? glyphToSpeciesData.get(modifierCell) : null;
					if (modifierData == null) {
						missingModifier |= modifierCell != null && missingSpeciesCells.contains(modifierCell);
						continue;
					}

					if (inhibition) {
						repressorEdges.add(inEdge);
					} else {
						activatorEdges.add(inEdge);
					}
				}
			}
			if (missingModifier) {
				System.err.println("Warning: skipped the production reaction of promoter '" + promoterId
						+ "': a regulator has no species record");
				continue;
			}

			List<Regulator> repressors = new ArrayList<>();
			resolveRegulators(repressorEdges, true, repressors);
			List<Regulator> activators = new ArrayList<>();
			resolveRegulators(activatorEdges, false, activators);

			boolean missingProduct = false;
			for (mxCell productionEdge : tuData.productionEdges) {
				mxCell targetCell = (mxCell) productionEdge.getTarget();
				if (targetCell != null && glyphToSpeciesData.get(targetCell) == null
						&& missingSpeciesCells.contains(targetCell)) {
					missingProduct = true;
				}
			}
			if (missingProduct) {
				System.err.println("Warning: skipped the production reaction of promoter '" + promoterId
						+ "': a product has no species record");
				continue;
			}

			String reactionId = "Production_" + promoterId;
			reactionToPromoterId.put(reactionId, promoterId);

			Reaction reaction = sbmlModel.createReaction(reactionId);
			reaction.setReversible(false);
			reaction.setSBOTerm(589); // SBO:0000589 Genetic Production
			reaction.setCompartment("Cell");

			ModifierSpeciesReference promoterModifier = reaction.createModifier(tuData.promoterSpecies);
			promoterModifier.setSBOTerm(598); // SBO:0000598 Promoter

			KineticLaw law = reaction.createKineticLaw();
			addProductionOverrides(law, promoterInfo.getSimulationData());

			double np = numberOrDefault(promoterInfo.getSimulationData(), SBOLData.PARAM_NP, SequenceOntology.PROMOTER);
			for (mxCell productionEdge : tuData.productionEdges) {
				mxCell targetCell = (mxCell) productionEdge.getTarget();
				SpeciesData productData = targetCell != null ? glyphToSpeciesData.get(targetCell) : null;
				if (productData == null) {
					continue;
				}
				SpeciesReference product = reaction.createProduct(productData.species);
				product.setConstant(true);
				product.setStoichiometry(np);
			}

			if (reaction.getProductCount() == 0) {
				Species mRNA = createPlaceholderSpecies(sbmlModel, promoterId + "_mRNA", 250,
						tuData.promoterSpecies);
				SpeciesReference product = reaction.createProduct(mRNA);
				product.setConstant(true);
				product.setStoichiometry(np);
			}

			for (Regulator repressor : repressors) {
				ModifierSpeciesReference mod = reaction.createModifier(repressor.data.species);
				mod.setSBOTerm(20);
			}
			for (Regulator activator : activators) {
				ModifierSpeciesReference mod = reaction.createModifier(activator.data.species);
				mod.setSBOTerm(459);
			}

			if (activators.isEmpty()) {
				buildRepressionFormula(reaction, promoterId, law, repressors);
			} else {
				buildActivationFormula(reaction, promoterId, law, activators, repressors);
			}
		}
	}

	private static final int SBO_MODIFIER = 19;

	private static void addProductionOverrides(KineticLaw law, Hashtable<String, Object> simData) {
		for (String[] parameter : PRODUCTION_PARAMETERS) {
			Double explicit = "Promoter".equals(parameter[2]) && !"ng".equals(parameter[0])
					? numberOrNull(simData, parameter[3]) : null;
			if (explicit != null) {
				law.createLocalParameter(parameter[0]).setValue(explicit);
			}
		}
	}

	private void resolveRegulators(List<mxCell> edges, boolean inhibition, List<Regulator> resolved) {
		String forwardParam = inhibition ? SBOLData.PARAM_KR_F : SBOLData.PARAM_KA_F;
		String reverseParam = inhibition ? SBOLData.PARAM_KR_R : SBOLData.PARAM_KA_R;
		for (mxCell edge : edges) {
			InteractionInfo info = (InteractionInfo) interactionDict.get(edge.getValue());
			Hashtable<String, Object> simData = info != null ? info.getSimulationData() : null;
			resolved.add(new Regulator(glyphToSpeciesData.get((mxCell) edge.getSource()),
					numberOrNull(simData, forwardParam),
					numberOrNull(simData, reverseParam),
					numberOrNull(simData, SBOLData.PARAM_COOPERATIVITY)));
		}
	}

	private void createDegradationReactions(Model sbmlModel, mxGraphModel graphModel, mxCell[] viewCells) {
		Map<String, DegradationGroup> degradations = new LinkedHashMap<>();
		for (mxCell viewCell : viewCells) {
			Object[] allChildren = mxGraphModel.getChildCells(graphModel, viewCell, true, true);

			for (Object child : allChildren) {
				if (!(child instanceof mxCell)) {
					continue;
				}

				mxCell cell = (mxCell) child;
				if (cell.getValue() == null) {
					continue;
				}
				InteractionInfo info = (InteractionInfo) interactionDict.get(cell.getValue());
				if (info == null || !isDegradation(info)) {
					continue;
				}
				List<Participant> participants = cell.isEdge() && !endpointIsInteractionNode(cell)
						? resolveEdgeParticipants(cell, info)
						: interactionNodeFilter.filter(cell)
						? resolveNodeParticipants(graphModel, cell, info)
						: null;
				if (participants == null) {
					System.err.println("Warning: skipped interaction '" + info.getDisplayID()
							+ "': an endpoint is not an exported species");
					continue;
				}
				if (participants.isEmpty()) {
					continue;
				}
				addDegradation(sbmlModel, degradations, info, participants);
			}
		}
		if (!degradations.isEmpty()) {
			addParameters(sbmlModel, DEGRADATION_PARAMETERS);
		}
		for (DegradationGroup group : degradations.values()) {
			createDegradationReaction(sbmlModel, group);
		}
	}

	private static boolean isDegradation(InteractionInfo info) {
		URI typeURI = SBOLData.interactions.getValue(info.getInteractionType());
		return typeURI != null && typeURI.equals(SBOLData.interactions.getValue("Degradation"));
	}

	private void addDegradation(Model sbmlModel, Map<String, DegradationGroup> degradations,
			InteractionInfo info, List<Participant> participants) {
		if (participants.size() == 1 && participants.get(0).role == Role.REACTANT) {
			Participant degraded = participants.get(0);
			DegradationGroup group = degradations.get(degraded.data.species.getId());
			if (group == null) {
				group = new DegradationGroup(degraded.data);
				degradations.put(degraded.data.species.getId(), group);
				group.displayId = info.getDisplayID();
			}
			group.kd = firstValue(group.kd, numberOrNull(info.getSimulationData(), SBOLData.PARAM_KD));
			return;
		}
		createGenericBiochemicalReaction(sbmlModel, info, participants);
	}

	private static class DegradationGroup {
		final SpeciesData source;
		String displayId;
		Double kd;

		DegradationGroup(SpeciesData source) {
			this.source = source;
		}
	}

	private void createInteractionReactions(Model sbmlModel, mxGraphModel graphModel, mxCell[] viewCells,
			Map<String, BindingGroup> bindings) {
		for (mxCell viewCell : viewCells) {
			Object[] allChildren = mxGraphModel.getChildCells(graphModel, viewCell, true, true);

			for (Object child : allChildren) {
				if (!(child instanceof mxCell)) {
					continue;
				}

				mxCell cell = (mxCell) child;
				InteractionInfo info = (InteractionInfo) interactionDict.get(cell.getValue());
				if (info == null) {
					continue;
				}

				List<Participant> participants;
				if (cell.isEdge()) {
					if (!makesReaction(cell, info)) {
						continue;
					}
					participants = resolveEdgeParticipants(cell, info);
				} else {
					if (!interactionNodeFilter.filter(cell)
							|| !SBOLData.isMassActionInteraction(info.getInteractionType())) {
						continue;
					}
					participants = resolveNodeParticipants(graphModel, cell, info);
				}
				if (participants == null) {
					System.err.println("Warning: skipped interaction '" + info.getDisplayID()
							+ "': an endpoint is not an exported species");
					continue;
				}
				createInteractionReaction(sbmlModel, info, participants, bindings);
			}
		}
	}

	private boolean makesReaction(mxCell cell, InteractionInfo info) {
		if (info == null) {
			return false;
		}
		if (SBOLData.isMassActionInteraction(info.getInteractionType())) {
			return !endpointIsInteractionNode(cell);
		}
		URI typeURI = SBOLData.interactions.getValue(info.getInteractionType());
		if (typeURI == null) {
			return false;
		}
		boolean inhibition = typeURI.equals(SBOLData.interactions.getValue("Inhibition"));
		boolean stimulation = typeURI.equals(SBOLData.interactions.getValue("Stimulation"));
		boolean control = typeURI.equals(SBOLData.interactions.getValue("Control"));
		if (!inhibition && !stimulation && !control) {
			return false;
		}
		if (endpointIsInteractionNode(cell)) {
			return false;
		}
		if ((inhibition || stimulation) && cell.getTarget() != null) {
			SpeciesData targetData = glyphToSpeciesData.get(cell.getTarget());
			if (targetData != null && targetData.species.getSBOTerm() == 590) {
				return false;
			}
		}
		return true;
	}

	private boolean endpointIsInteractionNode(mxCell cell) {
		return interactionNodeFilter.filter(cell.getSource()) || interactionNodeFilter.filter(cell.getTarget());
	}

	/**
	 * Constitutive (0 repressors/activators) and repression-only (N repressors) production.
	 * Formula: (P * ko * Ko * nr) / (1 + Ko * nr + SUM_i[(Kr_i * R_i)^nc_i])
	 * where Ko = ko_f/ko_r, Kr_i = kr_<repId>_f/kr_<repId>_r.
	 */
	void buildRepressionFormula(Reaction reaction, String promoterId, KineticLaw law,
			List<Regulator> repressors) {
		reaction.setKineticLaw(law);

		String Ko = "(ko_f/ko_r)";
		StringBuilder repressorTerms = new StringBuilder();
		for (Regulator repressor : repressors) {
			repressorTerms.append(" + ").append(regulatorTerm(law, repressor, "kr", "r"));
		}

		String formula = "(" + promoterId + " * ko * " + Ko + " * nr) / (1 + " + Ko + " * nr"
				+ repressorTerms.toString() + ")";

		setMath(law, formula, "promoter '" + promoterId + "'");
	}

	/**
	 * Activation (N activators), mixed regulation, and same-species dual-activity.
	 * Formula: P * (kb*Ko*nr + SUM_j[ka*Kao*nr*(Ka_j*A_j)^nc_j])
	 * / (1 + Ko*nr + SUM_j[Kao*nr*(Ka_j*A_j)^nc_j] + SUM_i[(Kr_i*R_i)^nc_i])
	 * where Ko = ko_f/ko_r, Kao = kao_f/kao_r,
	 * Ka_j = ka_<actId>_f/ka_<actId>_r, Kr_i = kr_<repId>_f/kr_<repId>_r.
	 */
	void buildActivationFormula(Reaction reaction, String promoterId, KineticLaw law,
			List<Regulator> activators, List<Regulator> repressors) {
		reaction.setKineticLaw(law);

		String Ko = "(ko_f/ko_r)";
		String Kao = "(kao_f/kao_r)";

		StringBuilder numeratorActivators = new StringBuilder();
		StringBuilder denomActivators = new StringBuilder();
		for (Regulator activator : activators) {
			String Ka_term = regulatorTerm(law, activator, "ka", "a");
			numeratorActivators.append(" + ka * ").append(Kao).append(" * nr * ").append(Ka_term);
			denomActivators.append(" + ").append(Kao).append(" * nr * ").append(Ka_term);
		}

		StringBuilder denomRepressors = new StringBuilder();
		for (Regulator repressor : repressors) {
			denomRepressors.append(" + ").append(regulatorTerm(law, repressor, "kr", "r"));
		}

		String numerator = "(" + promoterId + " * (kb * " + Ko + " * nr" + numeratorActivators.toString() + "))";
		String denominator = "(1 + " + Ko + " * nr" + denomActivators.toString() + denomRepressors.toString() + ")";
		String formula = numerator + " / " + denominator;

		setMath(law, formula, "promoter '" + promoterId + "'");
	}

	private String regulatorTerm(KineticLaw law, Regulator regulator, String rate, String role) {
		String id = regulator.data.species.getId();
		String forward = localOrGlobal(law, regulator.rateF, rate + "_" + id + "_f", rate + "_f");
		String reverse = localOrGlobal(law, regulator.rateR, rate + "_" + id + "_r", rate + "_r");
		String cooperativity = localOrGlobal(law, regulator.cooperativity, "nc_" + id + "_" + role, "nc");
		return "((" + forward + "/" + reverse + ") * " + id + ")^" + cooperativity;
	}

	private static String localOrGlobal(KineticLaw law, Double explicit, String localId, String globalId) {
		if (explicit == null)
			return globalId;
		if (law.getLocalParameter(localId) == null)
			law.createLocalParameter(localId).setValue(explicit);
		return localId;
	}

	private static void setMath(KineticLaw law, String formula, String owner) {
		try {
			law.setMath(ASTNode.parseFormula(formula));
		} catch (Exception e) {
			throw new IllegalStateException("Rate law parse failed for " + owner + ": " + e.getMessage(), e);
		}
	}

	private static Double firstValue(Double held, Double next) {
		return held != null ? held : next;
	}

	private Species createPlaceholderSpecies(Model sbmlModel, String baseId, int sboTerm, Species annotationSource) {
		String placeholderId = Identifiers.toSId(baseId, usedIds);
		Species placeholder = sbmlModel.createSpecies(placeholderId);
		placeholder.setCompartment("Cell");
		if (sboTerm > 0) {
			placeholder.setSBOTerm(sboTerm);
		}
		placeholder.setInitialAmount(0);
		placeholder.setHasOnlySubstanceUnits(true);
		placeholder.setConstant(false);
		placeholder.setBoundaryCondition(false);
		if (annotationSource != null && annotationSource.isSetAnnotation()
				&& annotationSource.getAnnotation().isSetNonRDFannotation()) {
			try {
				placeholder.appendAnnotation(annotationSource.getAnnotation().getNonRDFannotationAsString());
			} catch (XMLStreamException e) {
				throw new IllegalStateException("Failed to copy SBOL identity annotations to " + placeholderId, e);
			}
		}
		return placeholder;
	}

	private void createEdge(Layout layout, String reactionId, String sourceId, String targetId, String type,
			Map<String, Point2D> speciesCenter) {
		Point2D source = speciesCenter.get(sourceId);
		Point2D target = speciesCenter.get(targetId);

		if (source == null || target == null)
			return;

		String rgId = uniqueLayoutId(glyphId(reactionId + "__" + type + "__" + sourceId + "__" + targetId));
		ReactionGlyph rg = layout.createReactionGlyph(rgId);

		String srgId = uniqueLayoutId(
				"ReferenceGlyph__" + reactionId + "__" + type + "__" + sourceId + "__" + targetId);
		SpeciesReferenceGlyph srg = rg.createSpeciesReferenceGlyph(srgId, glyphId(targetId));
		srg.setSpeciesReferenceRole(SpeciesReferenceRole.PRODUCT);

		setBoundingBox(rg, target.getX(), target.getY(), 0, 0);

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

	private String uniqueLayoutId(String rawId) {
		String id = rawId;
		for (int suffix = 2; usedIds.contains(id); suffix++) {
			id = rawId + "_" + suffix;
		}
		usedIds.add(id);
		return id;
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
			createEdge(layout, reaction.getId(), promoterId, product.getSpecies(), "Production", speciesCenter);
		}

		for (ModifierSpeciesReference mod : reaction.getListOfModifiers()) {
			String modId = mod.getSpecies();
			if (modId.equals(promoterId))
				continue;

			String type = (mod.getSBOTerm() == 20) ? "repression" : "activation";
			createEdge(layout, reaction.getId(), modId, promoterId, type, speciesCenter);
		}
	}

	private void createMassActionEdges(Layout layout, Reaction reaction,
			Map<String, Point2D> speciesCenter) {
		for (SpeciesReference reactant : reaction.getListOfReactants()) {
			for (SpeciesReference product : reaction.getListOfProducts()) {
				createEdge(layout, reaction.getId(), reactant.getSpecies(), product.getSpecies(), "massAction", speciesCenter);
			}
		}
		for (ModifierSpeciesReference modifier : reaction.getListOfModifiers()) {
			for (SpeciesReference product : reaction.getListOfProducts()) {
				createEdge(layout, reaction.getId(), modifier.getSpecies(), product.getSpecies(), "massAction", speciesCenter);
			}
		}
	}

	private boolean isMassActionReaction(Reaction reaction) {
		URI uri = URI.create(SystemsBiologyOntology.NAMESPACE + "SBO:" + String.format("%07d", reaction.getSBOTerm()));
		return SBOLData.isMassActionInteraction(java.util.Collections.singleton(uri));
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
			if (reaction.getSBOTerm() == 589) { // SBO:0000589 Genetic Production
				createProductionEdges(layout, reaction, speciesCenter);
			} else if (isMassActionReaction(reaction)) {
				createMassActionEdges(layout, reaction, speciesCenter);
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
	private void createEvents(Model sbmlModel, mxGraphModel graphModel, mxCell[] viewCells) {
		if (eventDict == null || eventDict.isEmpty()) {
			return;
		}

		// Event cells, like all glyph cells, are keyed by value (fullURI); their ids are auto-generated.
		Map<String, mxCell> eventCellsByValue = new HashMap<>();
		for (mxCell viewCell : viewCells) {
			for (Object child : mxGraphModel.getChildCells(graphModel, viewCell, true, false)) {
				mxCell c = (mxCell) child;
				String style = c.getStyle();
				if (style != null && style.contains(STYLE_EVENT) && c.getValue() != null) {
					eventCellsByValue.put((String) c.getValue(), c);
				}
			}
		}

		for (EventInfo eventInfo : eventDict.values()) {
			mxCell eventCell = eventCellsByValue.get(eventInfo.getFullURI());
			if (eventCell == null) {
				continue;
			}
			Hashtable<String, Object> simData = eventInfo.getSimulationData();
			String context = "event '" + eventInfo.getDisplayID() + "'";

			String targetSpecies = getStringParam(simData, SBOLData.PARAM_EVENT_TARGET_SPECIES);
			if (targetSpecies == null || targetSpecies.isEmpty()) {
				continue;
			}

			SpeciesData target = resolveEventTarget(graphModel, targetSpecies);
			if (target == null) {
				System.err.println("Warning: skipped " + context + ": its target species is not on the canvas");
				continue;
			}

			String speciesId = target.species.getId();

			double delay = numberOrDefault(simData, SBOLData.PARAM_EVENT_DELAY, null);
			double assignment = numberOrDefault(simData, SBOLData.PARAM_EVENT_ASSIGNMENT_VALUE, null);

			String eventId = Identifiers.toSId(eventInfo.getDisplayName(), usedIds);
			Event event = sbmlModel.createEvent(eventId);
			if (eventInfo.getName() != null && !eventInfo.getName().isEmpty()) {
				event.setName(eventInfo.getName());
			}
			attachSbolIdentity(event, eventInfo.getFullURI());
			event.setUseValuesFromTriggerTime(false);

			// Trigger hardcoded to true. TODO: add conditional triggers
			Trigger trigger = event.createTrigger();
			trigger.setInitialValue(false);
			trigger.setPersistent(false);
			trigger.setMath(new ASTNode(ASTNode.Type.CONSTANT_TRUE));

			Delay delayNode = event.createDelay();
			delayNode.setMath(numericLiteralAst(delay));

			EventAssignment assignmentNode = event.createEventAssignment();
			assignmentNode.setVariable(speciesId);
			assignmentNode.setMath(numericLiteralAst(assignment));

			mxGeometry geom = eventCell.getGeometry();
			if (geom != null) {
				layoutBounds.update(geom);
			}
			eventIdToEventData.put(eventId, new EventData(event, geom, speciesId));
		}
	}

	private SpeciesData resolveEventTarget(mxGraphModel graphModel, String rawTarget) {
		if (!rawTarget.startsWith(CELL_REFERENCE_PREFIX)) {
			return null;
		}
		String cellId = rawTarget.substring(CELL_REFERENCE_PREFIX.length());
		mxCell cell = (mxCell) graphModel.getCell(cellId);
		if (cell == null || !molecularSpeciesFilter.filter(cell)) {
			return null;
		}
		return glyphToSpeciesData.get(cell);
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
		if (glyphInfo == null) {
			missingSpeciesCells.add(glyph);
			return null;
		}

		double initialAmount = numberOrDefault(glyphInfo.getSimulationData(), "initialAmount", null);

		// SBML ID becomes the label: the species' display name (the same fallback
		// chain the canvas label uses)
		String displayName = glyphInfo.getDisplayName();
		String speciesId = Identifiers.toSId(displayName, usedIds);

		Species species = model.createSpecies(speciesId);
		species.setCompartment("Cell");

		if (glyphInfo.getName() != null && !glyphInfo.getName().trim().isEmpty()) {
			species.setName(glyphInfo.getName());
		}
		attachSbolIdentity(species, glyphInfo.getFullURI());

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

		boolean boundaryCondition = booleanOrDefault(glyphInfo.getSimulationData(), "boundaryCondition",
				(Boolean) SBOLData.getDefault("species", "boundaryCondition"));
		species.setBoundaryCondition(boundaryCondition);
		species.setInitialAmount(initialAmount);
		species.setHasOnlySubstanceUnits(true); // Amount of molecules, not concentration
		species.setConstant(false);

		layoutBounds.update(glyph.getGeometry());

		return species;
	}

	/**
	 * Creates a degradation reaction for a species.
	 *
	 */
	private void createDegradationReaction(Model model, DegradationGroup group) {
		String reactionId = Identifiers.toSId(group.displayId, usedIds);

		Reaction reaction = model.createReaction(reactionId);
		reaction.setReversible(false);
		reaction.setSBOTerm(179); // SBO:0000179 Degradation
		reaction.setCompartment("Cell");

		SpeciesReference reactant = reaction.createReactant(group.source.species);
		reactant.setStoichiometry(1.0);
		reactant.setConstant(true);

		KineticLaw law = reaction.createKineticLaw();
		if (group.kd != null) {
			law.createLocalParameter("kd").setValue(group.kd);
		}
		setMath(law, "kd * " + group.source.species.getId(), "reaction '" + reactionId + "'");
	}



	private List<Participant> resolveNodeParticipants(mxGraphModel graphModel, mxCell node, InteractionInfo info) {
		Object[] incomingEdges = mxGraphModel.getIncomingEdges(graphModel, node);
		Object[] outgoingEdges = mxGraphModel.getOutgoingEdges(graphModel, node);
		if (incomingEdges.length == 0 && outgoingEdges.length == 0) {
			return null;
		}

		List<Participant> participants = new ArrayList<>();
		for (Object obj : incomingEdges) {
			mxCell inEdge = (mxCell) obj;
			mxCell source = (mxCell) inEdge.getSource();
			SpeciesData sourceData = source != null ? glyphToSpeciesData.get(source) : null;
			if (sourceData == null) {
				return null;
			}
			participants.add(resolveParticipant(info, sourceData, inEdge, true));
		}
		for (Object obj : outgoingEdges) {
			mxCell outEdge = (mxCell) obj;
			mxCell target = (mxCell) outEdge.getTarget();
			SpeciesData targetData = target != null ? glyphToSpeciesData.get(target) : null;
			if (targetData == null) {
				return null;
			}
			participants.add(resolveParticipant(info, targetData, outEdge, false));
		}
		return participants;
	}

	private List<Participant> resolveEdgeParticipants(mxCell edge, InteractionInfo info) {
		mxCell source = (mxCell) edge.getSource();
		mxCell target = (mxCell) edge.getTarget();
		if (source == null && target == null) {
			return null;
		}

		List<Participant> participants = new ArrayList<>();
		SpeciesData sourceData = source != null ? glyphToSpeciesData.get(source) : null;
		if (source != null && sourceData == null) {
			return null;
		}
		if (sourceData != null) {
			participants.add(resolveParticipant(info, sourceData, edge, true));
		}
		SpeciesData targetData = target != null ? glyphToSpeciesData.get(target) : null;
		if (target != null && targetData == null) {
			return null;
		}
		if (targetData != null) {
			participants.add(resolveParticipant(info, targetData, edge, false));
		}
		return participants;
	}

	private Participant resolveParticipant(InteractionInfo owner, SpeciesData data, mxCell edge, boolean source) {
		Hashtable<String, Object> coefficients = source ? owner.getSourceCoefficient() : owner.getTargetCoefficient();
		Object stored = coefficients.get(edge.getId());
		Double coefficient = stored != null ? ((Number) stored).doubleValue() : null;
		String refinement = (source ? owner.getSourceRefinement() : owner.getTargetRefinement()).get(edge.getId());
		URI role;
		try {
			role = SBOLData.getParticipantRole(owner.getInteractionType(), refinement, source);
		} catch (IllegalArgumentException unsupported) {
			System.err.println("Warning: interaction '" + owner.getDisplayID() + "' leaves out "
					+ data.species.getId() + ": " + unsupported.getMessage());
			return new Participant(data, Role.OMITTED, coefficient, null);
		}
		if (SBOLData.isRole(role, SystemsBiologyOntology.PRODUCT)) {
			return new Participant(data, Role.PRODUCT, coefficient, role);
		}
		if (SBOLData.isRole(role, SystemsBiologyOntology.MODIFIER)) {
			return new Participant(data, Role.MODIFIER, coefficient, role);
		}
		if (SBOLData.isRole(role, SystemsBiologyOntology.REACTANT)) {
			return new Participant(data, Role.REACTANT, coefficient, role);
		}
		return new Participant(data, Role.OMITTED, coefficient, role);
	}

	private void createInteractionReaction(Model model, InteractionInfo info, List<Participant> participants,
			Map<String, BindingGroup> bindings) {
		if (isBindingReaction(info, participants)) {
			addBinding(bindings, info, participants);
		} else {
			createGenericBiochemicalReaction(model, info, participants);
		}
	}

	private static boolean isBindingReaction(InteractionInfo info, List<Participant> participants) {
		if (!"Non-Covalent Binding".equals(info.getInteractionType())) {
			return false;
		}
		int products = 0;
		int reactants = 0;
		for (Participant p : participants) {
			if (p.role == Role.PRODUCT) {
				products++;
			} else if (p.role == Role.REACTANT) {
				reactants++;
			} else {
				return false;
			}
		}
		return products == 1 && reactants >= 1;
	}


	private void addBinding(Map<String, BindingGroup> bindings, InteractionInfo info,
			List<Participant> participants) {
		Participant product = null;
		for (Participant p : participants) {
			if (p.role == Role.PRODUCT) {
				product = p;
				break;
			}
		}
		boolean memberReversible = booleanOrDefault(info.getSimulationData(), SBOLData.PARAM_REVERSIBLE,
				Boolean.TRUE.equals(SBOLData.getDefault(info.getInteractionType(), SBOLData.PARAM_REVERSIBLE)));
		BindingGroup group = bindings.get(product.data.species.getId());
		if (group == null) {
			group = new BindingGroup(product.data, memberReversible);
			bindings.put(product.data.species.getId(), group);
		}
		for (Participant p : participants) {
			if (p.role == Role.REACTANT) {
				group.reactants.add(p);
			}
		}
		group.kcF = firstValue(group.kcF, numberOrNull(info.getSimulationData(), SBOLData.PARAM_KC_F));
		if (group.reversible) {
			group.kcR = firstValue(group.kcR, numberOrNull(info.getSimulationData(), SBOLData.PARAM_KC_R));
		}
	}

	private void createBindingReaction(Model model, BindingGroup group) {
		String productId = group.product.species.getId();
		String reactionId = Identifiers.toSId("Complex_" + productId, usedIds);

		Reaction reaction = model.createReaction(reactionId);
		reaction.setReversible(group.reversible);
		reaction.setSBOTerm(177); // SBO:0000177 binding
		reaction.setCompartment("Cell");

		List<Participant> reactants = mergeSameSpecies(group.reactants);
		KineticLaw law = reaction.createKineticLaw();
		StringBuilder rateLaw = new StringBuilder("kc_f");
		double defaultNc = SBOLData.getParticipantCoefficientDefault("Non-Covalent Binding", true);
		for (Participant p : reactants) {
			double stoichiometry = p.coefficient != null ? p.coefficient : defaultNc;
			String exponent = "nc";
			if (p.coefficient != null) {
				exponent = "nc_" + p.data.species.getId();
				law.createLocalParameter(exponent).setValue(p.coefficient);
			}
			SpeciesReference r = reaction.createReactant(p.data.species);
			r.setStoichiometry(stoichiometry);
			r.setConstant(true);
			rateLaw.append("*pow(").append(p.data.species.getId()).append(",").append(exponent).append(")");
		}

		SpeciesReference productRef = reaction.createProduct(group.product.species);
		productRef.setStoichiometry(1.0);
		productRef.setConstant(true);

		if (group.reversible) {
			rateLaw.append("-kc_r*").append(productId);
		}

		if (group.kcF != null) {
			law.createLocalParameter("kc_f").setValue(group.kcF);
		}
		if (group.reversible && group.kcR != null) {
			law.createLocalParameter("kc_r").setValue(group.kcR);
		}

		setMath(law, rateLaw.toString(), "reaction '" + reactionId + "'");
	}

	private static List<Participant> mergeSameSpecies(List<Participant> participants) {
		Map<String, Participant> byRoleSpecies = new LinkedHashMap<>();
		for (Participant p : participants) {
			String key = p.role + "#" + p.data.species.getId();
			Participant first = byRoleSpecies.get(key);
			if (first == null) {
				byRoleSpecies.put(key, p);
				continue;
			}
			if (p.coefficient != null) {
				Double coefficient = firstValue(first.coefficient, p.coefficient);
				byRoleSpecies.put(key, new Participant(first.data, first.role, coefficient, first.roleUri));
			}
		}
		return new ArrayList<>(byRoleSpecies.values());
	}

	private void createGenericBiochemicalReaction(Model model, InteractionInfo info, List<Participant> participants) {
		participants = mergeSameSpecies(participants);
		Hashtable<String, Object> simData = info.getSimulationData();
		boolean isMassAction = SBOLData.isMassActionInteraction(info.getInteractionType());
		URI typeURI = SBOLData.interactions.getValue(info.getInteractionType());
		boolean reversible = isMassAction && booleanOrDefault(simData, SBOLData.PARAM_REVERSIBLE,
				Boolean.TRUE.equals(SBOLData.getDefault(info.getInteractionType(), SBOLData.PARAM_REVERSIBLE)));

		String reactionId = Identifiers.toSId(info.getDisplayID(), usedIds);
		double k = isMassAction
				? numberOrDefault(simData, SBOLData.PARAM_KC_F, typeURI)
				: getDefaultValue(SystemsBiologyOntology.BIOCHEMICAL_REACTION, SBOLData.PARAM_KC_F);

		Reaction reaction = model.createReaction(reactionId);
		reaction.setReversible(reversible);
		reaction.setSBOTerm(sboTermForType(info.getInteractionType()));

		KineticLaw law = reaction.createKineticLaw();
		law.createLocalParameter("k").setValue(k);

		StringBuilder rateLaw = new StringBuilder("k");
		StringBuilder reverseLaw = new StringBuilder();
		for (Participant p : participants) {
			double stoichiometry = isMassAction && p.coefficient != null ? p.coefficient : 1.0;
			switch (p.role) {
				case OMITTED:
				break;
				case REACTANT: {
					SpeciesReference reactant = reaction.createReactant(p.data.species);
					reactant.setStoichiometry(stoichiometry);
					reactant.setConstant(true);
					reactant.setSBOTerm(10); // SBO:0000010 reactant
					rateLaw.append("*").append(massActionFactor(p.data.species.getId(), stoichiometry));
					break;
				}
				case MODIFIER: {
					ModifierSpeciesReference modifier = reaction.createModifier(p.data.species);
					modifier.setSBOTerm(sboTermForRole(p.roleUri));
					if (isMassAction) {
						rateLaw.append("*").append(p.data.species.getId());
					}
					break;
				}
				case PRODUCT: {
					SpeciesReference product = reaction.createProduct(p.data.species);
					product.setStoichiometry(stoichiometry);
					product.setConstant(true);
					product.setSBOTerm(11); // SBO:0000011 product
					reverseLaw.append("*").append(massActionFactor(p.data.species.getId(), stoichiometry));
					break;
				}
			}
		}
		if (reversible) {
			law.createLocalParameter("kc_r")
					.setValue(numberOrDefault(simData, SBOLData.PARAM_KC_R, typeURI));
			rateLaw.append("-kc_r").append(reverseLaw);
		}

		setMath(law, rateLaw.toString(), "reaction '" + reactionId + "'");
	}

	private static String massActionFactor(String speciesId, double stoichiometry) {
		if (stoichiometry == 1.0)
			return speciesId;
		String exponent = stoichiometry == Math.rint(stoichiometry)
				? String.valueOf((long) stoichiometry) : String.valueOf(stoichiometry);
		return "pow(" + speciesId + "," + exponent + ")";
	}


	private boolean booleanOrDefault(Hashtable<String, Object> simData, String key, boolean def) {
		return simData == null || !simData.containsKey(key) ? def : (Boolean) simData.get(key);
	}

	private int sboTermForType(String type) {
		URI uri = SBOLData.interactions.getValue(type);
		if (uri == null) {
			throw new IllegalArgumentException("no SBO term for interaction type: " + type);
		}
		return Integer.parseInt(uri.toString().substring(uri.toString().lastIndexOf(':') + 1));
	}

	private static double numberOrDefault(Hashtable<String, Object> simData, String paramName, URI defaultType) {
		if (simData == null || !simData.containsKey(paramName))
			return getDefaultValue(defaultType, paramName);
		return ((Number) simData.get(paramName)).doubleValue();
	}

	private static Double numberOrNull(Hashtable<String, Object> simData, String paramName) {
		if (simData == null || !simData.containsKey(paramName)) {
			return null;
		}
		return ((Number) simData.get(paramName)).doubleValue();
	}

	private static int sboTermForRole(URI role) {
		if (role == null) {
			return SBO_MODIFIER;
		}
		String uri = role.toString();
		return Integer.parseInt(uri.substring(uri.lastIndexOf(':') + 1));
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
	 * Gets a string simulation parameter from simulationData.
	 * Returns null if the key is missing or the value is null.
	 */
	private String getStringParam(Hashtable<String, Object> simData, String paramName) {
		if (simData == null || !simData.containsKey(paramName))
			return null;
		Object val = simData.get(paramName);
		return val != null ? val.toString() : null;
	}

	private static double getDefaultValue(URI type, String paramName) {
		String key;
		if (type == null) {
			key = "initialAmount".equals(paramName) ? "species" : "event";
		} else if (SequenceOntology.PROMOTER.equals(type)) {
			key = "Promoter";
		} else {
			key = SBOLData.interactions.getKey(type);
		}
		return ((Number) SBOLData.getDefault(key, paramName)).doubleValue();
	}

	/**
	 * Attaches the source SBOL identity as a non-RDF annotation so the SBML element
	 * stays traceable to the SBOLCanvas part it came from. Tools that do not know
	 * the namespace ignore it (SBML spec).
	 *
	 * @param element The SBML element to annotate
	 * @param fullURI The full SBOL URI (uriPrefix/displayID/version)
	 */
	private void attachSbolIdentity(SBase element, String fullURI) {
		String escaped = fullURI.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"",
				"&quot;");
		String xml = "<" + Converter.ANN_PREFIX + ":identity xmlns:" + Converter.ANN_PREFIX + "=\"" + Converter.URI_PREFIX
				+ "\" " + Converter.ANN_PREFIX + ":uri=\"" + escaped + "\"/>";
		try {
			element.appendAnnotation(xml);
		} catch (XMLStreamException e) {
			throw new IllegalStateException("Failed to attach SBOL identity annotation for " + fullURI, e);
		}
	}

}
