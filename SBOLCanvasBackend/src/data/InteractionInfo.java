package data;

public class InteractionInfo extends Info {

	private String displayID;
	private String interactionType;
	private String fromParticipationType;

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

	private String toParticipationType;

}
