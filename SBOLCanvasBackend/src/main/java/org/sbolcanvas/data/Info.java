package org.sbolcanvas.data;

public abstract class Info {

	protected String uriPrefix;
	protected String displayID;
	protected String version;

	public String getFullURI() {
		if (uriPrefix == null || displayID == null) {
			throw new IllegalStateException(
					"Info has null uriPrefix or displayID (uriPrefix=" + uriPrefix + ", displayID=" + displayID + ")");
		}
		String fullURI = this.uriPrefix + '/' + this.displayID;
		if (this.version != null && this.version.length() > 0) {
			fullURI += '/' + this.version;
		}
		return fullURI;
	}

	public String getUriPrefix() {
		return uriPrefix;
	}

	public void setUriPrefix(String uriPrefix) {
		this.uriPrefix = uriPrefix;
	}

	public String getDisplayID() {
		return displayID;
	}

	public void setDisplayID(String displayID) {
		this.displayID = displayID;
	}

	public String getVersion() {
		return version;
	}

	public void setVersion(String version) {
		this.version = version;
	}

	public String getName() {
		return null;
	}

	/** The human-facing label: the name when one is set, else the displayID. */
	public String getDisplayName() {
		String name = getName();
		if (name != null && !name.trim().isEmpty()) {
			return name;
		}
		return displayID;
	}

}
