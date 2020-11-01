package data;

import java.util.Hashtable;

public class CombinatorialInfo extends Info {

	private String templateURI;
	private String version;
	private String strategy;
	private String name;
	private String description;
	private Hashtable<String, VariableComponentInfo> variableComponents;

	public String getTemplateURI() {
		return templateURI;
	}

	public void setTemplateURI(String templateURI) {
		this.templateURI = templateURI;
	}

	public String getVersion() {
		return version;
	}

	public void setVersion(String version) {
		this.version = version;
	}

	public String getStrategy() {
		return strategy;
	}

	public void setStrategy(String strategy) {
		this.strategy = strategy;
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

	public Hashtable<String, VariableComponentInfo> getVariableComponents() {
		return variableComponents;
	}

	public void setVariableComponents(Hashtable<String, VariableComponentInfo> variableComponents) {
		this.variableComponents = variableComponents;
	}

	public String getFullURI() {
		String fullURI = this.uriPrefix + '/' + this.displayID;
		if (this.version != null && this.version.length() > 0) {
			fullURI += '/' + this.version;
		}
		return fullURI;
	}

}
