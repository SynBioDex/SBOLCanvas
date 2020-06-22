package data;

public class GlyphInfo extends Info {

	private String partType;
	private String[] otherTypes;
	private String partRole;
	private String[] otherRoles;
	private String partRefine;
	private String displayID;
	private String name;
	private String description;
	private String version;
	private String sequence;
	private String uriPrefix;
	private CanvasAnnotation[] annotations;

	public String getUriPrefix() {
		return uriPrefix;
	}

	public void setUriPrefix(String uriPrefix) {
		this.uriPrefix = uriPrefix;
	}

	public String getPartType() {
		return partType;
	}

	public void setPartType(String partType) {
		this.partType = partType;
	}

	public String[] getOtherTypes() {
		return otherTypes;
	}
	
	public void setOtherTypes(String[] otherTypes) {
		this.otherTypes = otherTypes;
	}
	
	public String getPartRole() {
		return partRole;
	}

	public void setPartRole(String partRole) {
		this.partRole = partRole;
	}

	public String[] getOtherRoles() {
		return otherRoles;
	}
	
	public void setOtherRoles(String[] otherRoles) {
		this.otherRoles = otherRoles;
	}
	
	public String getPartRefine() {
		return partRefine;
	}

	public void setPartRefine(String partRefine) {
		this.partRefine = partRefine;
	}

	public String getDisplayID() {
		return displayID;
	}

	public void setDisplayID(String displayID) {
		this.displayID = displayID;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public String getVersion() {
		return version;
	}

	public void setVersion(String version) {
		this.version = version;
	}

	public String getSequence() {
		return this.sequence;
	}

	public void setSequence(String sequence) {
		this.sequence = sequence;
	}
	
	public CanvasAnnotation[] getAnnotations() {
		return annotations;
	}

	public void setAnnotations(CanvasAnnotation[] annotations) {
		this.annotations = annotations;
	}
	
	public String getFullURI() {
		String fullURI = this.uriPrefix + '/' + this.displayID;
		if(this.version != null && this.version.length() > 0) {
			fullURI += '/' + this.version;
		}
		return fullURI;
	}
}
