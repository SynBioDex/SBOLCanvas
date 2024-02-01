package data;

import java.net.URI;

import javax.xml.namespace.QName;

public class CanvasAnnotation {

	private String namespaceURI;
	private String localPart;
	private String prefix;
	private String nestedNamespaceURI;
	private String nestedLocalPart;
	private String nestedPrefix;
	private URI nestedURI;
	private String stringValue;
	private URI uriValue;
	private CanvasAnnotation[] annotations;

	public void setQName(QName qname) {
		this.namespaceURI = qname.getNamespaceURI();
		this.localPart = qname.getLocalPart();
		this.prefix = qname.getPrefix();
	}
	
	public void setNestedQName(QName nestedQName) {
		this.nestedNamespaceURI = nestedQName.getNamespaceURI();
		this.nestedLocalPart = nestedQName.getLocalPart();
		this.nestedPrefix = nestedQName.getPrefix();
	}
	
	public String getNamespaceURI() {
		return namespaceURI;
	}

	public void setNamespaceURI(String namespaceURI) {
		this.namespaceURI = namespaceURI;
	}

	public String getLocalPart() {
		return localPart;
	}

	public void setLocalPart(String localPart) {
		this.localPart = localPart;
	}

	public String getPrefix() {
		return prefix;
	}

	public void setPrefix(String prefix) {
		this.prefix = prefix;
	}

	public String getNestedNamespaceURI() {
		return nestedNamespaceURI;
	}

	public void setNestedNamespaceURI(String nestedNamespaceURI) {
		this.nestedNamespaceURI = nestedNamespaceURI;
	}

	public String getNestedLocalPart() {
		return nestedLocalPart;
	}

	public void setNestedLocalPart(String nestedLocalPart) {
		this.nestedLocalPart = nestedLocalPart;
	}

	public String getNestedPrefix() {
		return nestedPrefix;
	}

	public void setNestedPrefix(String nestedPrefix) {
		this.nestedPrefix = nestedPrefix;
	}
	
	public URI getNestedURI() {
		return this.nestedURI;
	}
	
	public void setNestedURI(URI nestedURI) {
		this.nestedURI = nestedURI;
	}
	
	public String getStringValue() {
		return stringValue;
	}

	public void setStringValue(String stringValue) {
		this.stringValue = stringValue;
	}

	public URI getUriValue() {
		return uriValue;
	}

	public void setUriValue(URI uriValue) {
		this.uriValue = uriValue;
	}

	public CanvasAnnotation[] getAnnotations() {
		return annotations;
	}

	public void setAnnotations(CanvasAnnotation[] annotations) {
		this.annotations = annotations;
	}

}
