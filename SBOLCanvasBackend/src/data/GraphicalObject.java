package data;

import java.net.URI;

import javax.xml.namespace.QName;

import org.sbolstandard.core2.GenericTopLevel;
import org.sbolstandard.core2.SBOLValidationException;

public class GraphicalObject extends GenericTopLevel{

	GraphicalObject(URI identity, QName rdfType) throws SBOLValidationException {
		super(identity, rdfType);
	}

}
