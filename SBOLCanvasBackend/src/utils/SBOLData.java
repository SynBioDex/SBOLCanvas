package utils;

import java.net.URI;
import java.util.HashMap;
import java.util.Set;

import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.SequenceOntology;

public class SBOLData {

	public static HashMap<String,String> getTypes() {
		HashMap<String, String> types = new HashMap<String,String>();
		types.put(ComponentDefinition.COMPLEX.toString(), "Complex");
		types.put(ComponentDefinition.DNA_MOLECULE.toString(), "DNA molecule");
		types.put(ComponentDefinition.DNA_REGION.toString(), "DNA region");
		types.put(ComponentDefinition.EFFECTOR.toString(), "Effector");
		types.put(ComponentDefinition.PROTEIN.toString(), "Protein");
		types.put(ComponentDefinition.RNA_MOLECULE.toString(), "RNA molecule");
		types.put(ComponentDefinition.RNA_REGION.toString(), "RNA region");
		types.put(ComponentDefinition.SMALL_MOLECULE.toString(), "Small molecule");
		return types;
	}

	public static HashMap<String,String> getRoles() {
		HashMap<String,String> roles = new HashMap<String,String>();
		roles.put(SequenceOntology.ENGINEERED_REGION.toString(), "Gen (Engineered Region)");
		roles.put(SequenceOntology.PROMOTER.toString(), "Pro (Promoter)");
		roles.put(SequenceOntology.RIBOSOME_ENTRY_SITE.toString(), "RBS (Ribosome Binding Site)");
		roles.put(SequenceOntology.CDS.toString(), "CDS (Coding Sequence)");
		roles.put(SequenceOntology.TERMINATOR.toString(), "Ter (Terminator)");
		roles.put(SequenceOntology.CIRCULAR.toString(), "Cir (Circular Backbone)");
		roles.put("http://identifiers.org/so/SO:0001263", "gRNA (Non-Coding RNA gene)");
		roles.put(SequenceOntology.ORIGIN_OF_REPLICATION.toString(), "Ori (Origin of Replication)");
		roles.put("http://identifiers.org/so/SO:0000724", "OriT (Origin of Transfer)");
		roles.put(SequenceOntology.PRIMER_BINDING_SITE.toString(), "PBS (Primer Binding Site)");
		roles.put("http://identifiers.org/so/SO:0001975", "CUT (Sticky End Restriction Enzyme Cleavage Site)");
		roles.put("http://identifiers.org/so/SO:0001953", "Scar (Assembly Scar)");
		roles.put(SequenceOntology.OPERATOR.toString(), "Op (Operator)");
		roles.put(SequenceOntology.INSULATOR.toString(), "Ins (Insulator)");
		roles.put("http://identifiers.org/so/SO:0001691", "BRS (Blunt Restriction Site)");
		roles.put("http://identifiers.org/so/SO:0001932", "_5OH (5' Overhang)");
		roles.put("http://identifiers.org/so/SO:0001933", "_3OH (3' Overhang)");
		roles.put("http://identifiers.org/so/SO:0000031", "APT (Aptamer)");
		roles.put("http://identifiers.org/so/SO:0000553", "PolyA (PolyA Site)");
		roles.put("http://identifiers.org/so/SO:0000299", "SRS (Specific Recombination Site)");
		roles.put(SequenceOntology.SEQUENCE_FEATURE.toString(), "NGA (No Glyph Assigned)");
		roles.put("http://identifiers.org/so/SO:0001978", "Sig (Signature)");
		roles.put("http://identifiers.org/so/SO:0001236", "BS (Base)");
		roles.put("http://identifiers.org/so/SO:0000699", "Jun (Junction)");
		roles.put("http://identifiers.org/so/SO:0001237", "AA (Amino Acid)");
		roles.put(SequenceOntology.RESTRICTION_ENZYME_RECOGNITION_SITE.toString(), "RERS (Restriction Enzyme Recognition Site)");
		roles.put("http://identifiers.org/so/SO:0001977", "RS (Ribonuclease Site)");
		roles.put("http://identifiers.org/so/SO:0001956", "PS (Protease Site)");
		roles.put("http://identifiers.org/so/SO:0001979", "RSE (RNA Stability Element)");
		roles.put("http://identifiers.org/so/SO:0001955", "PSE (Protein Stability Element)");
		return roles;
	}
	
	public static HashMap<String,String> getRefinement(String parentURI){
		SequenceOntology so = new SequenceOntology();
		Set<URI> descendants = so.getDescendantURIsOf(URI.create(parentURI));
		HashMap<String,String> refinements = new HashMap<String,String>();
		for(URI uri : descendants) {
			refinements.put(uri.toString(), so.getName(uri));
		}
		return refinements;
		
	}

}
