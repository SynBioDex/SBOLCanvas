package data;

import java.util.List;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

public class MxGeometry {

	private double x;
	private double y;
	private double width;
	private double height;

	private boolean relative;
	private List<MxPoint> points;
	private MxPoint sourcePoint;
	private MxPoint targetPoint;

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

	public double getWidth() {
		return width;
	}

	public void setWidth(double width) {
		this.width = width;
	}

	public double getHeight() {
		return height;
	}

	public void setHeight(double height) {
		this.height = height;
	}

	public boolean isRelative() {
		return relative;
	}

	public void setRelative(boolean relative) {
		this.relative = relative;
	}

	public List<MxPoint> getPoints() {
		return points;
	}

	public void setPoints(List<MxPoint> points) {
		this.points = points;
	}

	public MxPoint getSourcePoint() {
		return sourcePoint;
	}

	public void setSourcePoint(MxPoint sourcePoint) {
		this.sourcePoint = sourcePoint;
	}

	public MxPoint getTargetPoint() {
		return targetPoint;
	}

	public void setTargetPoint(MxPoint targetPoint) {
		this.targetPoint = targetPoint;
	}
	
	public Element encode(Document doc) {
		Element mxGeometry = doc.createElement("mxGeometry");
		if (x != 0)
			mxGeometry.setAttribute("x", "" + x);
		if (y != 0)
			mxGeometry.setAttribute("y", "" + y);
		if (width != 0)
			mxGeometry.setAttribute("width", "" + width);
		if (height != 0)
			mxGeometry.setAttribute("height", "" + height);
		if (sourcePoint != null) {
			Element mxPoint = sourcePoint.encode(doc);
			mxPoint.setAttribute("as", "sourcePoint");
			mxGeometry.appendChild(mxPoint);
		}
		if (targetPoint != null) {
			Element mxPoint = targetPoint.encode(doc);
			mxPoint.setAttribute("as", "targetPoint");
			mxGeometry.appendChild(mxPoint);
		}
		if (points != null) {
			Element array = doc.createElement("Array");
			array.setAttribute("as", "points");
			for (MxPoint point : points) {
				Element mxPoint = point.encode(doc);
				array.appendChild(mxPoint);
			}
			mxGeometry.appendChild(array);
		}
		mxGeometry.setAttribute("as", "geometry");
		return mxGeometry;
	}

}
