package org.sbolcanvas.utils;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import javax.xml.namespace.QName;

import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.GenericTopLevel;
import org.sbolstandard.core2.Identified;
import org.sbolstandard.core2.Interaction;
import org.sbolstandard.core2.ModuleDefinition;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLValidationException;

public class ModelHelper {

	public static final int FORMAT_VERSION = 1;

	private SBOLDocument document;
	private HashMap<URI, GenericTopLevel> models;

	public ModelHelper(SBOLDocument document) {
		this.document = document;
		models = new HashMap<URI, GenericTopLevel>();
		for (GenericTopLevel model : findModels(document)) {
			URI owner = owner(model);
			if (owner != null)
				models.putIfAbsent(owner, model);
		}
	}

	public GenericTopLevel getOrCreateModel(URI objectRef, String displayIdStem) throws SBOLValidationException {
		GenericTopLevel model = models.get(objectRef);
		if (model == null) {
			model = document.createGenericTopLevel(displayIdStem + "_Model", Converter.createQName("Model"));
			model.createAnnotation(Converter.createQName("objectRef"), objectRef);
			model.createAnnotation(Converter.createQName("formatVersion"), FORMAT_VERSION);
			models.put(objectRef, model);
		}
		return model;
	}

	public static int formatVersion(SBOLDocument document) {
		int version = 0;
		for (GenericTopLevel model : findModels(document)) {
			Annotation stamp = model.getAnnotation(Converter.createQName("formatVersion"));
			if (stamp == null)
				continue;
			String text = stamp.isIntegerValue() ? String.valueOf(stamp.getIntegerValue())
					: stamp.isStringValue() ? stamp.getStringValue().trim() : null;
			if (text != null && text.matches("\\d{1,9}"))
				version = Math.max(version, Integer.parseInt(text));
		}
		return version;
	}

	public static List<GenericTopLevel> findModels(SBOLDocument document) {
		List<GenericTopLevel> found = new ArrayList<>();
		for (GenericTopLevel topLevel : document.getGenericTopLevels()) {
			if (Converter.createQName("Model").equals(topLevel.getRDFType()))
				found.add(topLevel);
		}
		return found;
	}

	public static URI owner(GenericTopLevel model) {
		Annotation reference = model.getAnnotation(Converter.createQName("objectRef"));
		return reference != null && reference.isURIValue() ? reference.getURIValue() : null;
	}

	public static String path(Identified owner, Identified object) {
		String base = owner.getPersistentIdentity().toString();
		String own = object.getPersistentIdentity().toString();
		if (own.equals(base))
			return "";
		if (!own.startsWith(base + "/"))
			throw new IllegalArgumentException(object.getIdentity() + " is not inside " + owner.getIdentity());
		return own.substring(base.length() + 1);
	}

	public static Identified resolve(SBOLDocument document, URI owner, String path) {
		ModuleDefinition module = document.getModuleDefinition(owner);
		ComponentDefinition definition = module == null ? document.getComponentDefinition(owner) : null;
		Identified ownerObject = module != null ? module : definition;
		if (ownerObject == null || path == null)
			return null;
		if (path.isEmpty())
			return ownerObject;
		if (module == null)
			return null;
		String[] steps = path.split("/");
		if (steps.length == 1) {
			Identified component = module.getFunctionalComponent(steps[0]);
			return component != null ? component : module.getInteraction(steps[0]);
		}
		if (steps.length == 2) {
			Interaction interaction = module.getInteraction(steps[0]);
			return interaction != null ? interaction.getParticipation(steps[1]) : null;
		}
		return null;
	}

	public static final class Entry {

		private String path;
		private String key;
		private String type;
		private Object value;

		private Entry() {
		}

		public Entry(String path, String key, String type, Object value) {
			this.path = path;
			this.key = key;
			this.type = type;
			this.value = value;
		}

		public String getPath() {
			return path;
		}

		public String getKey() {
			return key;
		}

		public String getType() {
			return type;
		}

		public Object getValue() {
			return value;
		}
	}

	public static String valueType(Object value) {
		if (value instanceof Number)
			return "number";
		if (value instanceof Boolean)
			return "boolean";
		if (value instanceof String)
			return "string";
		if (value instanceof URI)
			return "uri";
		throw new IllegalArgumentException("Unsupported typed simulation value: " + value);
	}

	public static Entry entry(String path, String key, Object value) {
		return new Entry(path, key, valueType(value), value instanceof Number ? ((Number) value).doubleValue() : value);
	}

	public static void addEntry(GenericTopLevel model, Entry entry) throws SBOLValidationException {
		QName entryQName = Converter.createQName("entry");
		int count = 0;
		for (Annotation annotation : model.getAnnotations()) {
			if (entryQName.equals(annotation.getQName()) && annotation.isNestedAnnotations())
				count++;
		}
		model.createAnnotation(entryQName, Converter.createQName("Entry"), "Entry_" + (count + 1), entryFields(entry));
	}

	private static Annotation newEntry(GenericTopLevel model, Entry entry, String displayId)
			throws SBOLValidationException {
		Annotation annotation = model.createAnnotation(Converter.createQName("entry"), Converter.createQName("Entry"),
				displayId, entryFields(entry));
		model.removeAnnotation(annotation);
		return annotation;
	}

	private static List<Annotation> entryFields(Entry entry) throws SBOLValidationException {
		List<Annotation> fields = new ArrayList<>();
		fields.add(new Annotation(Converter.createQName("path"), entry.getPath()));
		fields.add(new Annotation(Converter.createQName("key"), entry.getKey()));
		switch (entry.getType()) {
		case "number":
			fields.add(new Annotation(Converter.createQName("numberValue"), (Double) entry.getValue()));
			break;
		case "boolean":
			fields.add(new Annotation(Converter.createQName("booleanValue"), (Boolean) entry.getValue()));
			break;
		case "string":
			fields.add(new Annotation(Converter.createQName("stringValue"), (String) entry.getValue()));
			break;
		case "uri":
			fields.add(new Annotation(Converter.createQName("uriValue"), (URI) entry.getValue()));
			break;
		default:
			throw new IllegalArgumentException("Unknown entry type: " + entry.getType());
		}
		return fields;
	}

	public static List<Entry> readEntries(GenericTopLevel model) {
		return readEntries(model.getAnnotations(), model.getIdentity().toString());
	}

	public static List<Entry> readEntries(Annotation container) {
		return readEntries(container.getAnnotations(), String.valueOf(container.getNestedIdentity()));
	}

	private static List<Entry> readEntries(List<Annotation> annotations, String where) {
		List<Entry> entries = new ArrayList<>();
		QName entryQName = Converter.createQName("entry");
		for (Annotation annotation : annotations) {
			if (!entryQName.equals(annotation.getQName()) || !annotation.isNestedAnnotations())
				continue;
			try {
				entries.add(readEntry(annotation));
			} catch (IllegalArgumentException undecodable) {
				System.err.println("Warning: skipped an unreadable Model entry in " + where + ": "
						+ undecodable.getMessage());
			}
		}
		return entries;
	}

	private static Entry readEntry(Annotation annotation) {
		Entry entry = new Entry();
		for (Annotation child : annotation.getAnnotations()) {
			switch (child.getQName().getLocalPart()) {
			case "path":
				entry.path = text(child);
				break;
			case "key":
				entry.key = text(child);
				break;
			case "numberValue":
				entry.type = "number";
				entry.value = child.isDoubleValue() ? child.getDoubleValue()
						: child.isIntegerValue() ? (double) child.getIntegerValue()
						: Converter.numericValue(text(child), "numberValue", null);
				break;
			case "booleanValue":
				entry.type = "boolean";
				if (child.isBooleanValue()) {
					entry.value = child.getBooleanValue();
				} else if ("true".equals(text(child)) || "false".equals(text(child))) {
					entry.value = Boolean.valueOf(text(child));
				} else {
					throw new IllegalArgumentException("Invalid booleanValue: " + text(child));
				}
				break;
			case "stringValue":
				entry.type = "string";
				entry.value = text(child);
				break;
			case "uriValue":
				entry.type = "uri";
				entry.value = child.isURIValue() ? child.getURIValue() : URI.create(text(child));
				break;
			default:
				break;
			}
		}
		if (entry.path == null || entry.key == null || entry.type == null)
			throw new IllegalArgumentException("entry without path, key or value");
		return entry;
	}

	private static String text(Annotation child) {
		if (child.isStringValue())
			return child.getStringValue();
		if (child.isURIValue())
			return child.getURIValue().toString();
		throw new IllegalArgumentException("Expected text in " + child.getQName().getLocalPart());
	}

	public static Annotation findEvent(GenericTopLevel model, String displayId) {
		for (Annotation event : events(model)) {
			if (displayId.equals(eventDisplayId(event)))
				return event;
		}
		return null;
	}

	public static List<Annotation> events(GenericTopLevel model) {
		List<Annotation> events = new ArrayList<>();
		QName eventChildQName = Converter.createQName("event");
		QName eventQName = Converter.createQName("Event");
		for (Annotation annotation : model.getAnnotations()) {
			if (eventChildQName.equals(annotation.getQName()) && annotation.isNestedAnnotations()
					&& eventQName.equals(annotation.getNestedQName()))
				events.add(annotation);
		}
		return events;
	}

	public static String eventDisplayId(Annotation event) {
		for (Annotation child : event.getAnnotations()) {
			if ("displayId".equals(child.getQName().getLocalPart()) && child.isStringValue())
				return child.getStringValue();
		}
		return null;
	}

	public static void putEvent(GenericTopLevel model, String displayId, List<Annotation> fields, List<Entry> values)
			throws SBOLValidationException {
		if (findEvent(model, displayId) != null)
			return;
		List<Annotation> children = new ArrayList<>();
		children.add(new Annotation(Converter.createQName("displayId"), displayId));
		children.addAll(fields);
		int index = 1;
		for (Entry value : values) {
			children.add(newEntry(model, value, displayId + "_Entry_" + index++));
		}
		model.createAnnotation(Converter.createQName("event"), Converter.createQName("Event"), displayId, children);
	}
}
