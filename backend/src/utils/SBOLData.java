package utils;

import java.net.URI;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Set;
import java.util.TreeSet;

import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.Participation;
import org.sbolstandard.core2.SequenceOntology;
import org.sbolstandard.core2.SystemsBiologyOntology;
import org.synbiohub.frontend.SynBioHubException;
import org.synbiohub.frontend.SynBioHubFrontend;
import org.synbiohub.frontend.WebOfRegistriesData;

public class SBOLData {

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
	public static HashSet<String> registries;
	
	
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
		
		roles = new BiMap<String, URI>();
		roles.put("Gen (Engineered Region)", SequenceOntology.ENGINEERED_REGION);
		roles.put("Pro (Promoter)", SequenceOntology.PROMOTER);
		roles.put("RBS (Ribosome Binding Site)", SequenceOntology.RIBOSOME_ENTRY_SITE);
		roles.put("CDS (Coding Sequence)", SequenceOntology.CDS);
		roles.put("Ter (Terminator)", SequenceOntology.TERMINATOR);
		roles.put("Cir (Circular Backbone)", SequenceOntology.CIRCULAR);
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
		
		refinements = new BiMap<String, URI>();
		parents = new HashMap<URI, URI>();
		for(URI uri : roles.values()) {
			Set<URI> descendants = so.getDescendantURIsOf(uri);
			for(URI dURI : descendants) {
				refinements.put(so.getName(dURI), dURI);
				parents.put(dURI, uri);
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
		interactionTargetRoles.put(SystemsBiologyOntology.GENETIC_PRODUCTION, SystemsBiologyOntology.PRODUCT);
		interactionTargetRoles.put(SystemsBiologyOntology.CONTROL, SystemsBiologyOntology.MODIFIED);
		interactionTargetRoles.put(SystemsBiologyOntology.DISSOCIATION, SystemsBiologyOntology.PRODUCT);
		
		interactionSourceRoles = new HashMap<URI, URI>();
		interactionSourceRoles.put(SystemsBiologyOntology.INHIBITION, SystemsBiologyOntology.INHIBITOR);
		interactionSourceRoles.put(SystemsBiologyOntology.STIMULATION, SystemsBiologyOntology.STIMULATOR);
		interactionSourceRoles.put(SystemsBiologyOntology.BIOCHEMICAL_REACTION, SystemsBiologyOntology.REACTANT);
		interactionSourceRoles.put(SystemsBiologyOntology.NON_COVALENT_BINDING, SystemsBiologyOntology.REACTANT);
		interactionSourceRoles.put(SystemsBiologyOntology.DEGRADATION, SystemsBiologyOntology.REACTANT);
		interactionSourceRoles.put(SystemsBiologyOntology.GENETIC_PRODUCTION, SystemsBiologyOntology.TEMPLATE);
		interactionSourceRoles.put(SystemsBiologyOntology.CONTROL, SystemsBiologyOntology.MODIFIER);
		interactionSourceRoles.put(SystemsBiologyOntology.DISSOCIATION, SystemsBiologyOntology.REACTANT);
		
		registries = new HashSet<String>();
		try {
			for(WebOfRegistriesData registry : SynBioHubFrontend.getRegistries()) {
				registries.add(registry.getInstanceUrl());
			}
		} catch (SynBioHubException e) {
			e.printStackTrace();
		}
		
	}
	
	/**
	 * Returns the top type names for component definitions.
	 * @return
	 */
	public static String[] getTypes() {
		String[] typeNames = types.keys().toArray(new String[0]);
		Arrays.sort(typeNames);
		return typeNames;
	}

	/**
	 * Returns the top role names for component definitions.
	 * @return
	 */
	public static String[] getRoles() {
		String[] roleNames = roles.keys().toArray(new String[0]);
		Arrays.sort(roleNames);
		return roleNames;
	}
	
	/**
	 * Returns all children SO terms of the parent SO term.
	 * @param parentName - The parent name to find all children of
	 * @return
	 */
	public static String[] getRefinement(String parentName){
		if(parentName == null || parentName.equals("")) {
			parentName = "NGA (No Glyph Assigned)";
		}
		TreeSet<String> refinementNames = new TreeSet<String>();
		Set<URI> descendants = so.getDescendantURIsOf(roles.getValue(parentName));
		for(URI uri : descendants) {
			refinementNames.add(so.getName(uri));
		}
		return refinementNames.toArray(new String[0]);	
	}
	
	/**
	 * Returns all children SBO terms of the parent SBO term.
	 * @param parentName - The parent name to find all children of
	 * @return
	 */
	public static String[] getInteractionRoleRefinement(String parentName) {
		if(parentName == null || parentName.contentEquals("")) {
			return new String[0];
		}
		URI parentURI = interactionRoles.getValue(parentName);
		if(parentURI == null) {
			return new String[0];
		}
		Set<String> refinementNames = new TreeSet<String>();
		Set<URI> descendants = sbo.getDescendantURIsOf(parentURI);
		for(URI uri : descendants) {
			refinementNames.add(sbo.getName(uri));
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
	
	/**
	 * Returns a hashmap of interaction name to valid roles (roles[0] = source role, roles[1] = target role)
	 */
	public static HashMap<String, String[]> getInteractionRoles(){
		HashMap<String, String[]> result = new HashMap<String, String[]>();
		for(URI interactionURI : interactions.values()) {
			String[] roles = new String[2];
			roles[0] = interactionRoles.getKey(interactionSourceRoles.get(interactionURI));
			roles[1] = interactionRoles.getKey(interactionTargetRoles.get(interactionURI));
			result.put(interactions.getKey(interactionURI), roles);
		}
		return result;
	}
	
	public static URI getInteractionRoleRefinementFromName(String name) {
		return sbo.getURIbyName(name);
	}
	
	public static String getInteractionRoleRefinementName(URI refinement) {
		return sbo.getName(refinement);
	}
	
	public static boolean isSourceParticipant(Participation participant) {
		for(URI sourceRole : interactionSourceRoles.values()) {
			Set<URI> participantRoles = participant.getRoles();
			for(URI partRole : participantRoles) {
				if(partRole.equals(sourceRole) || sbo.isDescendantOf(partRole, sourceRole)) {
					return true;
				}				
			}
		}
		return false;
	}

}
