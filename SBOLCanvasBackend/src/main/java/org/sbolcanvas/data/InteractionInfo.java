package org.sbolcanvas.data;

import java.util.Hashtable;

public class InteractionInfo extends Info {

	private String interactionType;
	private Hashtable<String, String> sourceRefinement;
	private Hashtable<String, String> targetRefinement;
	private Hashtable<String, Object> sourceCoefficient;
	private Hashtable<String, Object> targetCoefficient;
	private Hashtable<String, String> fromURI;
	private Hashtable<String, String> toURI;
	private Hashtable<String, Object> simulationData;

	public InteractionInfo() {
		sourceRefinement = new Hashtable<String, String>();
		targetRefinement = new Hashtable<String, String>();
		sourceCoefficient = new Hashtable<String, Object>();
		targetCoefficient = new Hashtable<String, Object>();
		fromURI = new Hashtable<String, String>();
		toURI = new Hashtable<String, String>();
		simulationData = new Hashtable<String, Object>();
	}

	public String getInteractionType() {
		return interactionType;
	}

	public void setInteractionType(String interactionType) {
		this.interactionType = interactionType;
	}

	public Hashtable<String, Object> getSourceCoefficient() {
		return sourceCoefficient;
	}

	public void setSourceCoefficient(Hashtable<String, Object> sourceCoefficient) {
		this.sourceCoefficient = sourceCoefficient;
	}

	public Hashtable<String, Object> getTargetCoefficient() {
		return targetCoefficient;
	}

	public void setTargetCoefficient(Hashtable<String, Object> targetCoefficient) {
		this.targetCoefficient = targetCoefficient;
	}

	public Hashtable<String, String> getSourceRefinement() {
		return sourceRefinement;
	}

	public void setSourceRefinement(Hashtable<String, String> sourceRefinement) {
		this.sourceRefinement = sourceRefinement;
	}

	public Hashtable<String, String> getTargetRefinement() {
		return targetRefinement;
	}

	public void setTargetRefinement(Hashtable<String, String> targetRefinement) {
		this.targetRefinement = targetRefinement; 
	}

	public Hashtable<String, String> getFromURI() {
		return fromURI;
	}

	public void setFromURI(Hashtable<String, String> fromURI) {
		this.fromURI = fromURI;
	}

	public Hashtable<String, String> getToURI() {
		return toURI;
	}

	public void setToURI(Hashtable<String, String> toURI) {
		this.toURI = toURI;
	}

	public Hashtable<String, Object> getSimulationData() {
		return simulationData;
	}

	public void setSimulationData(Hashtable<String, Object> simulationData) {
		this.simulationData = simulationData;
	}
	
}
