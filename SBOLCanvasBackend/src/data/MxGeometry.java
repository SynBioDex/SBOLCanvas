package data;

import java.util.List;

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

}
