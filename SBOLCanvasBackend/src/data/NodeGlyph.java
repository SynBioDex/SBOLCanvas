package data;

import java.net.URI;

import javax.xml.namespace.QName;

import org.sbolstandard.core2.SBOLValidationException;

public class NodeGlyph extends GraphicalObject {

	private double x;
	private double y;
	private double width;
	private double length;
	private int strokeColor;
	private int strokeOpacity;
	private double strokeWidth;
	private int fillColor;
	private	int fillOpacity;
	private int fontSize;
	
	
	NodeGlyph(URI identity, QName rdfType) throws SBOLValidationException {
		super(identity, rdfType);
	}

}
