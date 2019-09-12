package data;

public class MxCell {

	private int id;
	private String value;
	private String style;
	private boolean vertex;
	private boolean connectable;
	private int parent;
	private MxGeometry geometry;
	private GlyphInfo info;
	
	public int getId() {
		return id;
	}
	public void setId(int id) {
		this.id = id;
	}
	public String getValue() {
		return value;
	}
	public void setValue(String value) {
		this.value = value;
	}
	public boolean getVertex() {
		return vertex;
	}
	public void setVertex(boolean vertex) {
		this.vertex = vertex;
	}
	public boolean isConnectable() {
		return connectable;
	}
	public void setConnectable(boolean connectable) {
		this.connectable = connectable;
	}
	public int getParent() {
		return parent;
	}
	public void setParent(int parent) {
		this.parent = parent;
	}
	public MxGeometry getGeometry() {
		return geometry;
	}
	public void setGeometry(MxGeometry geometry) {
		this.geometry = geometry;
	}
	public GlyphInfo getInfo() {
		return info;
	}
	public void setInfo(GlyphInfo info) {
		this.info = info;
	}
	public String getStyle() {
		return style;
	}
	public void setStyle(String style) {
		this.style = style;
	}
	
}
