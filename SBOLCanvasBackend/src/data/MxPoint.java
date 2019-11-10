package data;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

public class MxPoint {

	private double x;
	private double y;

	public double getX() {
		return x;
	}

	public void setX(double x) {
		this.x = x;
	}

	public double getY() {
		return y;
	}

	public void setY(double y) {
		this.y = y;
	}
	
	public Element encode(Document doc) {
		Element mxPoint = doc.createElement("mxPoint");
		mxPoint.setAttribute("x", "" + x);
		mxPoint.setAttribute("y", "" + y);
		return mxPoint;
	}

}
