package data;

import utils.Converter;

public class InteractionInfo extends Info {

	private String displayID;
	private String interactionType;
	private String fromParticipationType;
	private String toParticipationType;
	private String fromURI;
	private String toURI;
	
	public String getFromURI() {
		return fromURI;
	}

	public void setFromURI(String fromURI) {
		this.fromURI = fromURI;
	}

	public String getToURI() {
		return toURI;
	}

	public void setToURI(String toURI) {
		this.toURI = toURI;
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
	
	public String getFullURI() {
		return Converter.URI_PREFIX+'/'+this.displayID;
	}
}
