package utils;

import java.io.OutputStream;
import java.net.URI;

import org.sbolstandard.core2.AccessType;
import org.sbolstandard.core2.Component;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.RestrictionType;
import org.sbolstandard.core2.SBOLConversionException;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLValidationException;
import org.sbolstandard.core2.SBOLWriter;
import org.w3c.dom.Document;

public class Converter {

	public static void toSBOL(Document graph, OutputStream body) {
		// create the document
		String uriPrefix = "https://sbolcanvas.org/";
		SBOLDocument document = new SBOLDocument();
		document.setDefaultURIprefix(uriPrefix);
		document.setComplete(true);
		document.setCreateDefaults(true);

		try {
			// create the top level component definition (aka strand)
			ComponentDefinition componentdefinition = document
					.createComponentDefinition("displayID_componentDefinition", ComponentDefinition.DNA_REGION);
			componentdefinition.addRole(URI.create("http://identifiers.org/so/SO:0000804"));

			// create a component definition to represent a promoter
			String promoterDefID = "Promoter_componentDefinition";
			ComponentDefinition promoterDef = document.createComponentDefinition(promoterDefID,
					ComponentDefinition.DNA_REGION);
			promoterDef.addRole(getRole("promoter"));

			//create the component
			Component promoter = componentdefinition.createComponent("I_am_a_Promoter", AccessType.PUBLIC, promoterDefID);
			
			//create a component definition to represent a terminator
			String terminatorDefID = "Terminator_componentDefinition";
			ComponentDefinition terminatorDef = document.createComponentDefinition(terminatorDefID, ComponentDefinition.DNA_REGION);
			terminatorDef.addRole(getRole("terminator"));
			
			//create the component
			Component terminator = componentdefinition.createComponent("I_am_a_terminator", AccessType.PUBLIC, terminatorDefID);
			
			//create a sequence constraint
			componentdefinition.createSequenceConstraint("constraint"+1, RestrictionType.PRECEDES, promoter.getIdentity(), terminator.getIdentity());
			

			// write to body
			SBOLWriter.setKeepGoing(true);
			SBOLWriter.write(document, body);

		} catch (SBOLValidationException | SBOLConversionException e) {
			e.printStackTrace();
		}
	}

	public static String toGraph(String sbol) {
		return null;

	}

	private static URI getRole(String typeName) {
		String so = "http://identifiers.org/so/";
		switch (typeName) {
		case "ribozyme":
			return URI.create(so + "SO:0000374");
		case "scar":
			return URI.create(so + "SO:0001953");
		case "cds":
			return URI.create(so + "SO:0000316");
		case "promoter":
			return URI.create(so + "SO:0000167");
		case "rbs":
			return URI.create(so + "SO:0000139");
		case "terminator":
			return URI.create(so + "SO:0000141");
		default:
			System.err.println("Part Type not found");
			return null;
		}
	}

}
