package data;

public class EventInfo extends Info {

	private String name;
	private String targetSpecies;
	private double delay; // Defaults to 0
	private double assignmentValue; // Defaults to 0

	@Override
	public String getFullURI() {
		return uriPrefix + "/" + displayID;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public double getDelay() {
		return delay;
	}

	public void setDelay(double delay) {
		this.delay = delay;
	}

	public String getTargetSpecies() {
		return targetSpecies;
	}

	public void setTargetSpecies(String targetSpecies) {
		this.targetSpecies = targetSpecies;
	}

	public double getAssignmentValue() {
		return assignmentValue;
	}

	public void setAssignmentValue(double assignmentValue) {
		this.assignmentValue = assignmentValue;
	}

}
