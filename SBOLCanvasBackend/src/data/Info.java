package data;

public abstract class Info {

	protected String uriPrefix;
	protected String displayID;

	abstract String getFullURI();
	
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
	
}
