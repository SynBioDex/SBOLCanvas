package utils;

import org.sbolstandard.core2.ComponentDefinition;

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

	public static String[][] getRoles(){
		String[][] roles = {
				{}
		};
		return roles;
	}
	
}
