package data;

public class VariableComponentInfo {

	private String uri;
	private String variable;
	private String operator;
	private IdentifiedInfo[] variants;

	public String getUri() {
		return uri;
	}

	public void setUri(String uri) {
		this.uri = uri;
	}

	public String getVariable() {
		return variable;
	}

	public void setVariable(String variable) {
		this.variable = variable;
	}

	public String getOperator() {
		return operator;
	}

	public void setOperator(String operator) {
		this.operator = operator;
	}

	public IdentifiedInfo[] getVariants() {
		return variants;
	}

	public void setVariants(IdentifiedInfo[] variants) {
		this.variants = variants;
	}

}
