package data;

import java.awt.Point;
import java.util.List;

public class MxGeometry {

	private double x;
	private double y;
	private double width;
	private double height;
	
	private boolean relative;
	private List<Point> points;
	
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
	
	public List<Point> getPoints() {
		return points;
	}
	
	public void setPoints(List<Point> points) {
		this.points = points;
	}
	
}
