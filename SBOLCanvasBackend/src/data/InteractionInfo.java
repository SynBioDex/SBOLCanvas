package data;

import java.util.Hashtable;

public class InteractionInfo extends Info {

	private String displayID;
	private String interactionType;
	private String fromParticipationType;
	private String toParticipationType;
	private Hashtable<String, String> sourceRefinement;
	private Hashtable<String, String> targetRefinement;
	private Hashtable<String, String> fromURI;
	private Hashtable<String, String> toURI;

	public InteractionInfo() {
		sourceRefinement = new Hashtable<String, String>();
		targetRefinement = new Hashtable<String, String>();
		fromURI = new Hashtable<String, String>();
		toURI = new Hashtable<String, String>();
	}
	
	public String getDisplayID() {
		return displayID;
	}

	public void setDisplayID(String displayID) {
		this.displayID = displayID;
	}

	public String getInteractionType() {
		return interactionType;
	}

	public void setInteractionType(String interactionType) {
		this.interactionType = interactionType;
	}

	public String getFromParticipationType() {
		return fromParticipationType;
	}

	public void setFromParticipationType(String fromParticipationType) {
		this.fromParticipationType = fromParticipationType;
	}

	public String getToParticipationType() {
		return toParticipationType;
	}

	public void setToParticipationType(String toParticipationType) {
		this.toParticipationType = toParticipationType;
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
	
	public String getFullURI() {
		return this.uriPrefix + '/' + this.displayID;
	}
}
