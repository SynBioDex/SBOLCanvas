package utils;

import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.SequenceOntology;

public class SBOLData {

	public static String[][] getTypes() {
		String[][] types = { { "Complex", ComponentDefinition.COMPLEX.toString() },
				{ "DNA molecule", ComponentDefinition.DNA_MOLECULE.toString() },
				{ "DNA region", ComponentDefinition.DNA_REGION.toString() },
				{ "Effector", ComponentDefinition.EFFECTOR.toString() },
				{ "Protein", ComponentDefinition.PROTEIN.toString() },
				{ "RNA molecule", ComponentDefinition.RNA_MOLECULE.toString() },
				{ "RNA region", ComponentDefinition.RNA_REGION.toString() },
				{ "Small molecule", ComponentDefinition.SMALL_MOLECULE.toString() } };
		return types;
	}

	public static String[][] getRoles() {
		String[][] roles = { { "Gen (Engineered Region)", SequenceOntology.ENGINEERED_REGION.toString() },
				{ "Pro (Promoter)", SequenceOntology.PROMOTER.toString() },
				{ "RBS (Ribosome Binding Site)", SequenceOntology.RIBOSOME_ENTRY_SITE.toString() },
				{ "CDS (Coding Sequence)", SequenceOntology.CDS.toString() },
				{ "Ter (Terminator)", SequenceOntology.TERMINATOR.toString() },
				{ "Cir (Circular Backbone)", SequenceOntology.CIRCULAR.toString() },
				{ "gRNA (Non-Coding RNA gene)", "http://identifiers.org/so/SO:0001263" },
				{ "Ori (Origin of Replication)", SequenceOntology.ORIGIN_OF_REPLICATION.toString() },
				{ "OriT (Origin of Transfer)", "http://identifiers.org/so/SO:0000724" },
				{ "PBS (Primer Binding Site)", SequenceOntology.PRIMER_BINDING_SITE.toString() },
				{ "CUT (Sticky End Restriction Enzyme Cleavage Site)", "http://identifiers.org/so/SO:0001975" },
				{ "Scar (Assembly Scar)", "http://identifiers.org/so/SO:0001953" },
				{ "Op (Operator)", SequenceOntology.OPERATOR.toString() },
				{ "Ins (Insulator)", SequenceOntology.INSULATOR.toString() },
				{ "BRS (Blunt Restriction Site)", "http://identifiers.org/so/SO:0001691" },
				{ "_5OH (5' Overhang)", "http://identifiers.org/so/SO:0001932" },
				{ "_3OH (3' Overhang)", "http://identifiers.org/so/SO:0001933" },
				{ "APT (Aptamer)", "http://identifiers.org/so/SO:0000031" },
				{ "PolyA (PolyA Site)", "http://identifiers.org/so/SO:0000553" },
				{ "SRS (Specific Recombination Site)", "http://identifiers.org/so/SO:0000299" },
				{ "NGA (No Glyph Assigned)", SequenceOntology.SEQUENCE_FEATURE.toString() },
				{ "Sig (Signature)", "http://identifiers.org/so/SO:0001978" },
				{ "BS (Base)", "http://identifiers.org/so/SO:0001236" },
				{ "Jun (Junction)", "http://identifiers.org/so/SO:0000699" },
				{ "AA (Amino Acid)", "http://identifiers.org/so/SO:0001237" },
				{ "RERS (Restriction Enzyme Recognition Site)",
						SequenceOntology.RESTRICTION_ENZYME_RECOGNITION_SITE.toString() },
				{ "RS (Ribonuclease Site)", "http://identifiers.org/so/SO:0001977" },
				{ "PS (Protease Site)", "http://identifiers.org/so/SO:0001956" },
				{ "RSE (RNA Stability Element)", "http://identifiers.org/so/SO:0001979" },
				{ "PSE (Protein Stability Element)", "http://identifiers.org/so/SO:0001955" } };
		return roles;
	}

}
