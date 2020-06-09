package data;

import java.awt.Point;
import java.net.URI;

import javax.xml.namespace.QName;

import org.sbolstandard.core2.GenericTopLevel;
import org.sbolstandard.core2.SBOLValidationException;

public class EdgeGlyph extends GraphicalObject{

	private int strokeColor;
	private int strokeWidth;
	private int strokeOpacity;
	private int arrowSize;
	private int sourceMargin;
	private int targetMargin;
	private String edgeStyle;
	private boolean rounded;
	private boolean curved;
	private Point sourcePoint;
	private Point targetPoint;
	private Point[] points;
	
	EdgeGlyph(URI identity, QName rdfType) throws SBOLValidationException {
		super(identity, rdfType);
	}

}
