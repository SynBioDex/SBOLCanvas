package org.sbolcanvas.data;

import java.util.Hashtable;

public class CombinatorialInfo extends Info {

	private String templateURI;
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

}
