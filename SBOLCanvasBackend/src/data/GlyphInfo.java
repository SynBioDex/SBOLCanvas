package data;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

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
	
	@Override
	public Element encode(Document doc) {
		Element glyphInfo = doc.createElement("GlyphInfo");
		if (description != null)
			glyphInfo.setAttribute("description", description);
		if (displayID != null)
			glyphInfo.setAttribute("displayID", displayID);
		if (name != null)
			glyphInfo.setAttribute("name", name);
		if (partRefine != null)
			glyphInfo.setAttribute("partRefine", partRefine);
		if (partRole != null)
			glyphInfo.setAttribute("partRole", partRole);
		if (partType != null)
			glyphInfo.setAttribute("partType", partType);
		if (sequence != null)
			glyphInfo.setAttribute("sequence", sequence);
		if (version != null)
			glyphInfo.setAttribute("version", version);
		if (uriPrefix != null)
			glyphInfo.setAttribute("uriPrefix", uriPrefix);
		glyphInfo.setAttribute("as", "data");
		return glyphInfo;
	}
}
