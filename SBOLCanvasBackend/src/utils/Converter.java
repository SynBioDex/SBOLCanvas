package utils;

import org.sbolstandard.core2.SBOLDocument;

public class Converter {

	public static String toSBOL(String graph) {
		String uriPrefix = "http://cellocad.org/";
		SBOLDocument document = new SBOLDocument();
		document.setDefaultURIprefix(uriPrefix);
		document.setComplete(true);
		document.setCreateDefaults(true);
		return null;
	}
	
	public static String toGraph(String sbol) {
		return null;
		
	}
	
}
