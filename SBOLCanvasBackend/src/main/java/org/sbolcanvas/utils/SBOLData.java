package org.sbolcanvas.utils;

import java.net.URI;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Set;
import java.util.LinkedHashMap;
import java.util.TreeSet;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;

import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.Participation;
import org.sbolstandard.core2.SequenceOntology;
import org.sbolstandard.core2.SystemsBiologyOntology;

public class SBOLData {

	// Simulation parameter name constants. Used by SBOLData and MxToSBML
	// Frontend model-editor component uses these same string values.
	public static final String PARAM_KD = "kd";
	public static final String PARAM_KC_F = "Kc_f";
	public static final String PARAM_KC_R = "Kc_r";
	public static final String PARAM_REVERSIBLE = "reversible";
	public static final String PARAM_NC = "nc";
	public static final String PARAM_COOPERATIVITY = "cooperativity";
	public static final String PARAM_NG = "ng";
	public static final String PARAM_NP = "np";
	public static final String PARAM_KO = "ko";
	public static final String PARAM_KB = "kb";
	public static final String PARAM_KA = "ka";
	public static final String PARAM_KO_F = "Ko_f";
	public static final String PARAM_KO_R = "Ko_r";
	public static final String PARAM_KAO_F = "Kao_f";
	public static final String PARAM_KAO_R = "Kao_r";
	public static final String PARAM_NR = "nr";
	public static final String PARAM_KR_F = "Kr_f";
	public static final String PARAM_KR_R = "Kr_r";
	public static final String PARAM_KA_F = "Ka_f";
	public static final String PARAM_KA_R = "Ka_r";

	// Event parameter name constants
	public static final String PARAM_EVENT_TARGET_SPECIES = "targetSpecies";
	public static final String PARAM_EVENT_DELAY = "delay";
	public static final String PARAM_EVENT_ASSIGNMENT_VALUE = "assignmentValue";

	private static SequenceOntology so;
	private static SystemsBiologyOntology sbo;

	public static BiMap<String, URI> types;
	public static BiMap<String, URI> roles;
	public static BiMap<String, URI> refinements;
	public static HashMap<URI, URI> parents;
	public static BiMap<String, URI> interactions;
	public static BiMap<String, URI> interactionRoles;
	public static HashMap<URI, URI> interactionSourceRoles;
	public static HashMap<URI, URI> interactionTargetRoles;
	public static LinkedHashMap<String, List<LinkedHashMap<String, Object>>> simulationConfig;
	public static final String[] INTERACTION_FIELD_CONTEXTS;

	static {
		so = new SequenceOntology();
		sbo = new SystemsBiologyOntology();

		types = new BiMap<String, URI>();
		types.put("Complex", ComponentDefinition.COMPLEX);
		types.put("DNA molecule", ComponentDefinition.DNA_MOLECULE);
		types.put("DNA region", ComponentDefinition.DNA_REGION);
		types.put("Protein", ComponentDefinition.PROTEIN);
		types.put("RNA molecule", ComponentDefinition.RNA_MOLECULE);
		types.put("RNA region", ComponentDefinition.RNA_REGION);
		types.put("Small molecule", ComponentDefinition.SMALL_MOLECULE);
		types.put("Circular", URI.create("http://identifiers.org/so/SO:0000988"));
		types.put("Chromosomal", URI.create("http://identifiers.org/so/SO:0000830"));

		roles = new BiMap<String, URI>();
		roles.put("Gen (Engineered Region)", SequenceOntology.ENGINEERED_REGION);
		roles.put("Pro (Promoter)", SequenceOntology.PROMOTER);
		roles.put("RBS (Ribosome Binding Site)", SequenceOntology.RIBOSOME_ENTRY_SITE);
		roles.put("CDS (Coding Sequence)", SequenceOntology.CDS);
		roles.put("Ter (Terminator)", SequenceOntology.TERMINATOR);
		roles.put("Cir (Circular Backbone)", URI.create("http://identifiers.org/so/SO:0000755"));
		roles.put("Cir (Circular Backbone Left)", URI.create("http://identifiers.org/so/SO:0000755"));
		roles.put("Cir (Circular Backbone Right)", URI.create("http://identifiers.org/so/SO:0000755"));
		roles.put("Chromosomal Locus (Left)", URI.create("http://identifiers.org/so/SO:0000830"));
		roles.put("Chromosomal Locus (Right)", URI.create("http://identifiers.org/so/SO:0000830"));
		roles.put("gRNA (Non-Coding RNA gene)", URI.create("http://identifiers.org/so/SO:0001263"));
		roles.put("Ori (Origin of Replication)", SequenceOntology.ORIGIN_OF_REPLICATION);
		roles.put("OriT (Origin of Transfer)", URI.create("http://identifiers.org/so/SO:0000724"));
		roles.put("PBS (Primer Binding Site)", SequenceOntology.PRIMER_BINDING_SITE);
		roles.put("SRS5 (5' Sticky Restriction Site)", URI.create("http://identifiers.org/so/SO:0001975"));
		roles.put("SRS3 (3' Sticky Restriction Site)", URI.create("http://identifiers.org/so/SO:0001976"));
		roles.put("Scar (Assembly Scar)", URI.create("http://identifiers.org/so/SO:0001953"));
		roles.put("Bind (Binding Site)", URI.create("http://identifiers.org/so/SO:0000409"));
		roles.put("Op (Operator)", SequenceOntology.OPERATOR);
		roles.put("Ins (Insulator)", SequenceOntology.INSULATOR);
		roles.put("BRS (Blunt Restriction Site)", URI.create("http://identifiers.org/so/SO:0001691"));
		roles.put("OH5 (5' Overhang)", URI.create("http://identifiers.org/so/SO:0001932"));
		roles.put("OH3 (3' Overhang)", URI.create("http://identifiers.org/so/SO:0001933"));
		roles.put("APT (Aptamer)", URI.create("http://identifiers.org/so/SO:0000031"));
		roles.put("PolyA (PolyA Site)", URI.create("http://identifiers.org/so/SO:0000553"));
		roles.put("SRS (Specific Recombination Site)", URI.create("http://identifiers.org/so/SO:0000299"));
		roles.put("NGA (No Glyph Assigned)", SequenceOntology.SEQUENCE_FEATURE);
		roles.put("Sig (Signature)", URI.create("http://identifiers.org/so/SO:0001978"));
		roles.put("BS (Base)", URI.create("http://identifiers.org/so/SO:0001236"));
		roles.put("Jun (Junction)", URI.create("http://identifiers.org/so/SO:0000699"));
		roles.put("AA (Amino Acid)", URI.create("http://identifiers.org/so/SO:0001237"));
		roles.put("RERS (Restriction Enzyme Recognition Site)", SequenceOntology.RESTRICTION_ENZYME_RECOGNITION_SITE);
		roles.put("RS (Ribonuclease Site)", URI.create("http://identifiers.org/so/SO:0001977"));
		roles.put("PS (Protease Site)", URI.create("http://identifiers.org/so/SO:0001956"));
		roles.put("RSE (RNA Stability Element)", URI.create("http://identifiers.org/so/SO:0001979"));
		roles.put("PSE (Protein Stability Element)", URI.create("http://identifiers.org/so/SO:0001955"));
		roles.put("TSE (Transcription End Site)", URI.create("http://identifiers.org/so/SO:0000616"));
		roles.put("TTS (Translation Termination Site)", URI.create("http://identifiers.org/so/SO:0000327"));
		roles.put("IDS (Inert DNA Spacer)", URI.create("http://identifiers.org/so/SO:0002223"));
		roles.put("Intr (Intron)", URI.create("http://identifiers.org/so/SO:0000188"));
		roles.put("Omit (Omitted-Detail)", SequenceOntology.SEQUENCE_FEATURE);
		roles.put("PolyR (Polypeptide-Region)", URI.create("http://identifiers.org/so/SO:0000839"));

		refinements = new BiMap<String, URI>();
		parents = new HashMap<URI, URI>();
		for (URI uri : roles.values()) {
			Set<URI> descendants = so.getDescendantURIsOf(uri);
			if (descendants != null) {
				for (URI dURI : descendants) {
					refinements.put(so.getName(dURI), dURI);
					parents.put(dURI, uri);
				}
			}
		}

		interactions = new BiMap<String, URI>();
		interactions.put("Inhibition", SystemsBiologyOntology.INHIBITION);
		interactions.put("Stimulation", SystemsBiologyOntology.STIMULATION);
		interactions.put("Biochemical Reaction", SystemsBiologyOntology.BIOCHEMICAL_REACTION);
		interactions.put("Non-Covalent Binding", SystemsBiologyOntology.NON_COVALENT_BINDING);
		interactions.put("Degradation", SystemsBiologyOntology.DEGRADATION);
		interactions.put("Genetic Production", SystemsBiologyOntology.GENETIC_PRODUCTION);
		interactions.put("Control", SystemsBiologyOntology.CONTROL);
		interactions.put("Dissociation", SystemsBiologyOntology.DISSOCIATION);
		interactions.put("Process", SystemsBiologyOntology.PROCESS);

		interactionRoles = new BiMap<String, URI>();
		interactionRoles.put("Inhibitor", SystemsBiologyOntology.INHIBITOR);
		interactionRoles.put("Inhibited", SystemsBiologyOntology.INHIBITED);
		interactionRoles.put("Stimulator", SystemsBiologyOntology.STIMULATOR);
		interactionRoles.put("Stimulated", SystemsBiologyOntology.STIMULATED);
		interactionRoles.put("Reactant", SystemsBiologyOntology.REACTANT);
		interactionRoles.put("Product", SystemsBiologyOntology.PRODUCT);
		interactionRoles.put("Modifier", SystemsBiologyOntology.MODIFIER);
		interactionRoles.put("Modified", SystemsBiologyOntology.MODIFIED);
		interactionRoles.put("Template", SystemsBiologyOntology.TEMPLATE);

		interactionTargetRoles = new HashMap<URI, URI>();
		interactionTargetRoles.put(SystemsBiologyOntology.INHIBITION, SystemsBiologyOntology.INHIBITED);
		interactionTargetRoles.put(SystemsBiologyOntology.STIMULATION, SystemsBiologyOntology.STIMULATED);
		interactionTargetRoles.put(SystemsBiologyOntology.BIOCHEMICAL_REACTION, SystemsBiologyOntology.PRODUCT);
		interactionTargetRoles.put(SystemsBiologyOntology.NON_COVALENT_BINDING, SystemsBiologyOntology.PRODUCT);
		interactionTargetRoles.put(SystemsBiologyOntology.DEGRADATION, SystemsBiologyOntology.PRODUCT);
		interactionTargetRoles.put(SystemsBiologyOntology.GENETIC_PRODUCTION, SystemsBiologyOntology.PRODUCT);
		interactionTargetRoles.put(SystemsBiologyOntology.CONTROL, SystemsBiologyOntology.MODIFIED);
		interactionTargetRoles.put(SystemsBiologyOntology.DISSOCIATION, SystemsBiologyOntology.PRODUCT);
		interactionTargetRoles.put(SystemsBiologyOntology.PROCESS, SystemsBiologyOntology.PRODUCT);

		interactionSourceRoles = new HashMap<URI, URI>();
		interactionSourceRoles.put(SystemsBiologyOntology.INHIBITION, SystemsBiologyOntology.INHIBITOR);
		interactionSourceRoles.put(SystemsBiologyOntology.STIMULATION, SystemsBiologyOntology.STIMULATOR);
		interactionSourceRoles.put(SystemsBiologyOntology.BIOCHEMICAL_REACTION, SystemsBiologyOntology.REACTANT);
		interactionSourceRoles.put(SystemsBiologyOntology.NON_COVALENT_BINDING, SystemsBiologyOntology.REACTANT);
		interactionSourceRoles.put(SystemsBiologyOntology.DEGRADATION, SystemsBiologyOntology.REACTANT);
		interactionSourceRoles.put(SystemsBiologyOntology.GENETIC_PRODUCTION, SystemsBiologyOntology.TEMPLATE);
		interactionSourceRoles.put(SystemsBiologyOntology.CONTROL, SystemsBiologyOntology.MODIFIER);
		interactionSourceRoles.put(SystemsBiologyOntology.DISSOCIATION, SystemsBiologyOntology.REACTANT);
		interactionSourceRoles.put(SystemsBiologyOntology.PROCESS, SystemsBiologyOntology.REACTANT);

		// Using values from iBioSim as default values for simulation parameters
		// LinkedHashMap keeps parameters in order in the UI.
		simulationConfig = new LinkedHashMap<>();
		simulationConfig.put("species", Arrays.asList(
				field("initialAmount", "number", "Initial amount", 0.0, 0.0),
				field("boundaryCondition", "boolean", "Boundary condition", false, null)));
		simulationConfig.put("event", Arrays.asList(
				field(PARAM_EVENT_DELAY, "number", "Delay", 0.0, 0.0),
				field(PARAM_EVENT_ASSIGNMENT_VALUE, "number", "Assignment value", 0.0, null),
				field(PARAM_EVENT_TARGET_SPECIES, "uri", "Target species", null, null)));
		simulationConfig.put("participation", Arrays.asList(
				field("coefficient", "number", "Stoichiometry", null, 0.0)));
		simulationConfig.put("Degradation", Arrays.asList(number(PARAM_KD, "Degradation rate", 0.0075)));
		List<LinkedHashMap<String, Object>> massAction = Arrays.asList(
				number(PARAM_KC_F, "Forward rate", 0.1),
				number(PARAM_KC_R, "Reverse rate", 1.0),
				field(PARAM_REVERSIBLE, "boolean", "Reversible", false, null));
		simulationConfig.put("Biochemical Reaction", massAction);
		List<LinkedHashMap<String, Object>> bindingAction = Arrays.asList(
				number(PARAM_KC_F, "Forward rate", 0.05),
				number(PARAM_KC_R, "Reverse rate", 1.0),
				field(PARAM_REVERSIBLE, "boolean", "Reversible", false, null));
		simulationConfig.put("Non-Covalent Binding", bindingAction);
		simulationConfig.put("Dissociation", massAction);
		simulationConfig.put("Process", massAction);
		simulationConfig.put("Promoter", Arrays.asList(
				number(PARAM_NG, "Initial promoter count", 2.0),
				number(PARAM_NP, "Stoichiometry of production", 10.0),
				number(PARAM_KO, "Open complex production rate", 0.05),
				number(PARAM_KB, "Basal production rate", 0.0001),
				number(PARAM_KA, "Activation production rate", 0.25),
				number(PARAM_KO_F, "Forward RNAP binding rate", 0.033),
				number(PARAM_KO_R, "Reverse RNAP binding rate", 1.0),
				number(PARAM_KAO_F, "Forward activated RNAP binding rate", 1.0),
				number(PARAM_KAO_R, "Reverse activated RNAP binding rate", 1.0),
				number(PARAM_NR, "Initial RNAP count", 30.0)));
		simulationConfig.put("Inhibition", Arrays.asList(
				number(PARAM_KR_F, "Forward repression binding rate", 0.5),
				number(PARAM_KR_R, "Reverse repression binding rate", 1.0),
				number(PARAM_COOPERATIVITY, "Stoichiometry of binding", 2.0)));
		simulationConfig.put("Stimulation", Arrays.asList(
				number(PARAM_KA_F, "Forward activation binding rate", 0.0033),
				number(PARAM_KA_R, "Reverse activation binding rate", 1.0),
				number(PARAM_COOPERATIVITY, "Stoichiometry of binding", 2.0)));

		List<String> interactionContexts = new ArrayList<>();
		for (String context : simulationConfig.keySet()) {
			if (interactions.getValue(context) != null) {
				interactionContexts.add(context);
			}
		}
		INTERACTION_FIELD_CONTEXTS = interactionContexts.toArray(new String[0]);
	}

	/**
	 * Returns the top type names for component definitions.
	 * 
	 * @return
	 */
	public static String[] getTypes() {
		String[] typeNames = types.keys().toArray(new String[0]);
		Arrays.sort(typeNames);
		return typeNames;
	}

	/**
	 * Returns the top role names for component definitions.
	 * 
	 * @return
	 */
	public static String[] getRoles() {
		String[] roleNames = roles.keys().toArray(new String[0]);
		Arrays.sort(roleNames);
		return roleNames;
	}

	/**
	 * Returns all children SO terms of the parent SO term.
	 * 
	 * @param parentName - The parent name to find all children of
	 * @return
	 */
	public static String[] getRefinement(String parentName) {
		if (parentName == null || parentName.equals("")) {
			parentName = "NGA (No Glyph Assigned)";
		}
		TreeSet<String> refinementNames = new TreeSet<String>();
		if (roles.getValue(parentName) != null) {
			Set<URI> descendants = so.getDescendantURIsOf(roles.getValue(parentName));

			if (descendants != null) {
				for (URI uri : descendants) {
					refinementNames.add(so.getName(uri));
				}
			}
		}

		return refinementNames.toArray(new String[0]);

	}

	/**
	 * Returns all children SBO terms of the parent SBO term.
	 * 
	 * @param parentName - The parent name to find all children of
	 * @return
	 */
	public static String[] getInteractionRoleRefinement(String parentName) {
		if (parentName == null || parentName.contentEquals("")) {
			return new String[0];
		}
		URI parentURI = interactionRoles.getValue(parentName);
		if (parentURI == null) {
			return new String[0];
		}
		Set<String> refinementNames = new TreeSet<String>();
		Set<URI> descendants = sbo.getDescendantURIsOf(parentURI);
		if (descendants != null) {
			for (URI uri : descendants) {
				refinementNames.add(sbo.getName(uri));
			}

		}
		return refinementNames.toArray(new String[0]);
	}

	/**
	 * Returns a sorted list of interaction names
	 */
	public static String[] getInteractions() {
		String[] interactionNames = interactions.keys().toArray(new String[0]);
		Arrays.sort(interactionNames);
		return interactionNames;
	}

	public static Map<String, Object> getInteractionRules() {
		Map<String, Object> result = new LinkedHashMap<>();
		for (String interactionType : getInteractions()) {
			Map<String, Object> record = new LinkedHashMap<>();
			Map<String, Object> source = roleDescriptor(interactionType, true);
			Map<String, Object> target = roleDescriptor(interactionType, false);
			if ("Degradation".equals(interactionType)) {
				source.put("endpointTypes", Arrays.asList("species"));
				target.put("endpointTypes", Arrays.asList());
				record.put("targetless", true);
				record.put("maxReactants", 1);
			} else if ("Inhibition".equals(interactionType) || "Stimulation".equals(interactionType) || "Control".equals(interactionType)) {
				source.put("endpointTypes", Arrays.asList("species"));
				target.put("endpointTypes", Arrays.asList("dna"));
			} else if ("Process".equals(interactionType) || "Biochemical Reaction".equals(interactionType)) {
				source.put("endpointTypes", Arrays.asList("species", "dna", "node"));
				target.put("endpointTypes", Arrays.asList("species", "node"));
			} else if ("Genetic Production".equals(interactionType)) {
				source.put("endpointTypes", Arrays.asList("dna"));
				target.put("endpointTypes", Arrays.asList("species"));
			}
			if ("Non-Covalent Binding".equals(interactionType)) {
				record.put("maxProducts", 1);
			}
			if ("Dissociation".equals(interactionType)) record.put("maxReactants", 1);
			record.put("source", source);
			record.put("target", target);
			record.put("massAction", isMassActionInteraction(interactionType));
			result.put(interactionType, record);
		}
		return result;
	}

	private static Map<String, Object> roleDescriptor(String interactionType, boolean source) {
		URI type = interactions.getValue(interactionType);
		URI role = (source ? interactionSourceRoles : interactionTargetRoles).get(type);
		String name = interactionRoles.getKey(role);
		List<String> names = new ArrayList<>();
		names.add(name);
		names.addAll(Arrays.asList(getInteractionRoleRefinement(name)));
		boolean hasStrictRoles = "Non-Covalent Binding".equals(interactionType) || "Dissociation".equals(interactionType);
		if (isMassActionInteraction(interactionType) && !hasStrictRoles) {
			if (!names.contains("Modifier")) names.add("Modifier");
			names.addAll(Arrays.asList(getInteractionRoleRefinement("Modifier")));
		}
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("defaultRole", name);
		result.put("roles", names);
		if ("Non-Covalent Binding".equals(interactionType) && !source) {
			result.put("fixedCoefficient", 1.0);
		}
		if (isMassActionInteraction(interactionType)) {
			result.put("coefficientDefault", getParticipantCoefficientDefault(interactionType, source));
		}
		return result;
	}

	public static URI getInteractionRoleRefinementFromName(String name) {
		URI role = interactionRoles.getValue(name);
		return role != null ? role : sbo.getURIbyName(name);
	}

	public static String getInteractionRoleRefinementName(URI refinement) {
		String name = interactionRoles.getKey(refinement);
		return name != null ? name : sbo.getName(refinement);
	}

	public static boolean isMassActionInteraction(Set<URI> types) {
		return types.contains(SystemsBiologyOntology.BIOCHEMICAL_REACTION)
				|| types.contains(SystemsBiologyOntology.NON_COVALENT_BINDING)
				|| types.contains(SystemsBiologyOntology.DISSOCIATION)
				|| types.contains(SystemsBiologyOntology.PROCESS);
	}

	public static double getParticipantCoefficientDefault(String interactionType, boolean source) {
		return "Non-Covalent Binding".equals(interactionType) && source ? 2.0 : 1.0;
	}

	public static boolean isMassActionInteraction(String interactionType) {
		URI uri = interactions.getValue(interactionType);
		return uri != null && isMassActionInteraction(java.util.Collections.singleton(uri));
	}

	public static boolean isRoleAllowed(String interactionType, boolean source, URI role) {
		URI type = interactions.getValue(interactionType);
		URI parent = (source ? interactionSourceRoles : interactionTargetRoles).get(type);
		if (parent == null || role == null) {
			return false;
		}
		if (parent.equals(role) || sbo.isDescendantOf(role, parent)) {
			return true;
		}
		return isMassActionInteraction(java.util.Collections.singleton(type))
				&& isRole(role, SystemsBiologyOntology.MODIFIER);
	}

	public static boolean isSourceParticipant(Participation participant) {
		for (URI sourceRole : interactionSourceRoles.values()) {
			Set<URI> participantRoles = participant.getRoles();
			for (URI partRole : participantRoles) {
				if (partRole.equals(sourceRole) || sbo.isDescendantOf(partRole, sourceRole)) {
					return true;
				}
			}
		}
		return false;
	}

	public static boolean isRole(URI role, URI parent) {
		return role != null && parent != null && (role.equals(parent) || sbo.isDescendantOf(role, parent));
	}

	public static URI getParticipantRole(String interactionType, String refinement, boolean source) {
		URI type = interactions.getValue(interactionType);
		URI role = refinement == null || refinement.isEmpty()
				? (source ? interactionSourceRoles : interactionTargetRoles).get(type)
				: getInteractionRoleRefinementFromName(refinement);
		if (!isRoleAllowed(interactionType, source, role)) {
			throw new IllegalArgumentException("Unsupported " + (source ? "source" : "target") + " role for " + interactionType + ": " + refinement);
		}
		return role;
	}

	public static LinkedHashMap<String, List<LinkedHashMap<String, Object>>> getSimulationConfig() {
		return simulationConfig;
	}

	private static LinkedHashMap<String, Object> number(String key, String label, double value) {
		return field(key, "number", label, value, 0.0);
	}

	private static LinkedHashMap<String, Object> field(String key, String type, String label, Object value, Double min) {
		LinkedHashMap<String, Object> field = new LinkedHashMap<>();
		field.put("key", key);
		field.put("type", type);
		field.put("label", label);
		if (value != null) field.put("default", value);
		if (min != null) field.put("min", min);
		return field;
	}

	public static LinkedHashMap<String, Object> field(String context, String key) {
		List<LinkedHashMap<String, Object>> fields = simulationConfig.get(context);
		if (fields == null) return null;
		for (LinkedHashMap<String, Object> field : fields) {
			if (key.equals(field.get("key"))) return field;
		}
		return null;
	}

	public static Object getDefault(String context, String key) {
		LinkedHashMap<String, Object> field = field(context, key);
		return field == null ? null : field.get("default");
	}
}
