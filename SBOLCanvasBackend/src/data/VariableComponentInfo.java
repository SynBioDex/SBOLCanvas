package data;

public class VariableComponentInfo {

	private String uri;
	private String cellID;
	private String operator;
	private IdentifiedInfo[] variants;

	public String getUri() {
		return uri;
	}

	public void setUri(String uri) {
		this.uri = uri;
	}

	public String getCellID() {
		return cellID;
	}

	public void setCellID(String cellID) {
		this.cellID = cellID;
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
