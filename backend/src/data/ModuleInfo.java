package data;

public class ModuleInfo extends Info {

	private String name;
	private String description;
	private String version;

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
	
	public String getFullURI() {
		String fullURI = this.uriPrefix + '/' + this.displayID;
		if(this.version != null && this.version.length() > 0) {
			fullURI += '/' + this.version;
		}
		return fullURI;
	}

}
