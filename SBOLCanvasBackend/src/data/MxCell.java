package data;

public class MxCell {

	private int id;
	private String value;
	private String style;
	private boolean vertex;
	private boolean edge;
	private boolean connectable;
	private int parent;
	private int source;
	private int target;
	private boolean collapsed;
	private MxGeometry geometry;
	// transient prevents this field from making it to json
	private transient GlyphInfo info;

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

	public boolean isVertex() {
		return vertex;
	}

	public void setVertex(boolean vertex) {
		this.vertex = vertex;
	}
	
	public boolean isEdge() {
		return edge;
	}
	
	public void setEdge(boolean edge) {
		this.edge = edge;
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

	public int getSource() {
		return source;
	}
	
	public void setSource(int source) {
		this.source = source;
	}
	
	public int getTarget() {
		return target;
	}
	
	public void setTarget(int target) {
		this.target = target;
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
	
	public boolean isCollapsed() {
		return collapsed;
	}
	
	public void setCollapsed(boolean collapsed) {
		this.collapsed = collapsed;
	}

	@Override
	public String toString() {
		return "{id:" + id + ",value:" + value + ",style:" + style + ",vertex:" + vertex + ",connectable:" + connectable
				+ ",parent:" + parent + ",geometry:" + geometry + ",info:" + info + "}";
	}

}
