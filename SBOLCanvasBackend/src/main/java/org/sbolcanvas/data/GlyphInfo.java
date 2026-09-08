package org.sbolcanvas.data;

import java.util.Hashtable;

public class GlyphInfo extends Info {

	private String partType;
	private String[] otherTypes;
	private String partRole;
	private String[] otherRoles;
	private String partRefine;
	private String name;
	private String description;
	private String sequence;
	private String sequenceURI;
	private CanvasAnnotation[] annotations;
	private String[] derivedFroms;
	private String[] generatedBys;
	private Hashtable<String, Object> simulationData;

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

	public String getSequence() {
		return this.sequence;
	}

	public void setSequence(String sequence) {
		this.sequence = sequence;
	}
	
	public String getSequenceURI() {
		return sequenceURI;
	}

	public void setSequenceURI(String sequenceURI) {
		this.sequenceURI = sequenceURI;
	}
	
	public CanvasAnnotation[] getAnnotations() {
		return annotations;
	}

	public void setAnnotations(CanvasAnnotation[] annotations) {
		this.annotations = annotations;
	}
	
	public String[] getDerivedFroms() {
		return derivedFroms;
	}

	public void setDerivedFroms(String[] derivedFroms) {
		this.derivedFroms = derivedFroms;
	}

	public String[] getGeneratedBys() {
		return generatedBys;
	}

	public void setGeneratedBys(String[] generatedBys) {
		this.generatedBys = generatedBys;
	}
	
	public Hashtable<String, Object> getSimulationData() {
		return simulationData;
	}

	public void setSimulationData(Hashtable<String, Object> simulationData) {
		this.simulationData = simulationData;
	}
}
