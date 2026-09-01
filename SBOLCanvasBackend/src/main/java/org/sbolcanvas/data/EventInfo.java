package org.sbolcanvas.data;

import java.util.Hashtable;

public class EventInfo extends Info {

	private Hashtable<String, Object> simulationData;
	private String name;
	private String description;

	public Hashtable<String, Object> getSimulationData() {
		return simulationData;
	}

	public void setSimulationData(Hashtable<String, Object> simulationData) {
		this.simulationData = simulationData;
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

}
