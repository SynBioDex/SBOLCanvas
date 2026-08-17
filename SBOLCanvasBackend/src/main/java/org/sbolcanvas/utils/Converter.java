package org.sbolcanvas.utils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import javax.xml.namespace.QName;

import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.Identified;
import org.sbolstandard.core2.SBOLValidationException;

import org.w3c.dom.Document;

import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import com.mxgraph.io.mxCodec;
import com.mxgraph.io.mxCodecRegistry;
import com.mxgraph.io.mxObjectCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.model.mxGraphModel.Filter;
import com.mxgraph.util.mxUtils;
import com.mxgraph.util.mxXmlUtils;
import com.mxgraph.view.mxGraph;

import org.sbolcanvas.data.CombinatorialInfo;
import org.sbolcanvas.data.GlyphInfo;
import org.sbolcanvas.data.Info;
import org.sbolcanvas.data.InteractionInfo;
import org.sbolcanvas.data.ModuleInfo;
import org.sbolcanvas.data.EventInfo;

public class Converter {

	// canvas constants
	public static final String URI_PREFIX = "https://sbolcanvas.org/";
	public static final String ANN_PREFIX = "SBOLCanvas";

	// data constants
	public static final int INFO_DICT_INDEX = 0;
	public static final int COMBINATORIAL_DICT_INDEX = 1;
	public static final int INTERACTION_DICT_INDEX = 2;
	public static final int EVENT_DICT_INDEX = 3;

	// style constants
	protected static final String STYLE_CIRCUIT_CONTAINER = "circuitContainer";
	protected static final String STYLE_BACKBONE = "backbone";
	protected static final String STYLE_TEXTBOX = "textBox";
	protected static final String STYLE_MODULE = "moduleGlyph";
	protected static final String STYLE_SCAR = "Scar (Assembly Scar)";
	protected static final String STYLE_NGA = "NGA (No Glyph Assigned)";
	protected static final String STYLE_MOLECULAR_SPECIES = "molecularSpeciesGlyph";
	protected static final String STYLE_SEQUENCE_FEATURE = "sequenceFeatureGlyph";
	protected static final String STYLE_INTERACTION = "interactionGlyph";
	protected static final String STYLE_MODULE_VIEW = "moduleViewCell";
	protected static final String STYLE_COMPONENT_VIEW = "componentViewCell";
	protected static final String STYLE_INTERACTION_NODE = "interactionNodeGlyph";
	protected static final String STYLE_EVENT = "eventGlyph";

	static {
		// Necessary for encoding/decoding GlyphInfo and InteractionInfo
		mxCodecRegistry.addPackage("org.sbolcanvas.data");

		// Custom codec for GlyphInfo and InteractionInfo simulation data
		// Default mxObjectCodec decodes as an ArrayList, losing the keys
		mxCodecRegistry.register(createSimulationDataCodec(
				new GlyphInfo(), GlyphInfo.class, GlyphInfo::setSimulationData));
		mxCodecRegistry.register(createSimulationDataCodec(
				new InteractionInfo(), InteractionInfo.class, InteractionInfo::setSimulationData));
		mxCodecRegistry.register(createSimulationDataCodec(
				new EventInfo(), EventInfo.class, EventInfo::setSimulationData));
	};

	/**
	 * mxObjectCodec that decodes to a Hashtable instead of an ArrayList.
	 *
	 * @param template    the template object (e.g., new GlyphInfo())
	 * @param targetType  the expected runtime class of the decoded object
	 * @param setter      applies the parsed Hashtable to the decoded object
	 */
	private static <T> mxObjectCodec createSimulationDataCodec(
			Object template, Class<T> targetType,
			java.util.function.BiConsumer<T, Hashtable<String, Object>> setter) {
		return new mxObjectCodec(template) {
			@Override
			protected void decodeChild(mxCodec dec, Node child, Object obj) {
				if (child instanceof Element) {
					Element elem = (Element) child;
					if ("Array".equals(child.getNodeName())
							&& "simulationData".equals(elem.getAttribute("as"))
							&& targetType.isInstance(obj)) {
						setter.accept(targetType.cast(obj), parseSimulationDataNode(child));
						return;
					}
				}
				super.decodeChild(dec, child, obj);
			}
		};
	}

	/**
	 * Parses an <Array> XML node with <add value="..." as="key"/> children
	 * into a Hashtable. The frontend encodes simulationData this way, but the
	 * default mxCodec decodes <Array> as ArrayList, losing the key names.
	 */
	private static Hashtable<String, Object> parseSimulationDataNode(Node arrayNode) {
		Hashtable<String, Object> data = new Hashtable<>();
		NodeList children = arrayNode.getChildNodes();
		for (int i = 0; i < children.getLength(); i++) {
			Node child = children.item(i);
			if (child instanceof Element && "add".equals(child.getNodeName())) {
				Element addElem = (Element) child;
				String key = addElem.getAttribute("as");
				String value = addElem.getAttribute("value");
				if (key != null && !key.isEmpty() && value != null) {
					data.put(key, value);
				}
			}
		}
		return data;
	}

	protected Hashtable<String, Info> infoDict;
	protected Hashtable<String, CombinatorialInfo> combinatorialDict;
	protected Hashtable<String, InteractionInfo> interactionDict;
	protected Hashtable<String, EventInfo> eventDict;
	protected LayoutHelper layoutHelper;

	protected Converter() {
		infoDict = new Hashtable<>();
		combinatorialDict = new Hashtable<>();
		interactionDict = new Hashtable<>();
		eventDict = new Hashtable<>();
	}

	/**
	 * Filters mxCells that contain "textBox" in the style string
	 */
	static Filter textBoxFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle() != null && ((mxCell) arg0).getStyle().contains(STYLE_TEXTBOX);
		}
	};

	/**
	 * Filters mxCells with molecularSpeciesGlyph style (proteins, small molecules, complexes, etc.)
	 */
	static Filter molecularSpeciesFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle() != null && ((mxCell) arg0).getStyle().contains(STYLE_MOLECULAR_SPECIES);
		}
	};

	/**
	 * 
	 */
	static Filter moduleFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle() != null && ((mxCell) arg0).getStyle().contains(STYLE_MODULE);
		}
	};

	/**
	 * Filters mxCells that are Circuit Containers
	 */
	static Filter containerFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return (arg0 instanceof mxCell && ((mxCell) arg0).getStyle() != null && (((mxCell) arg0).getStyle().contains(STYLE_CIRCUIT_CONTAINER)) && (((mxCell) arg0).getChildCount() > 1));
		}
	};

	/**
	 * Filters mxCells that contain "backbone" in the style string
	 */
	static Filter backboneFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle() != null && ((mxCell) arg0).getStyle().contains(STYLE_BACKBONE);
		}
	};

	/**
	 * Filters mxCells that contain "sequenceFeatureGlyph" in the style string
	 * Additionally filters out the left portion of a Circular Backbone
	 */
	static Filter sequenceFeatureFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			if (arg0 instanceof mxCell && ((mxCell) arg0).getStyle() != null && ((mxCell) arg0).getStyle().contains(STYLE_SEQUENCE_FEATURE)) {
				if (((mxCell) arg0).getStyle().contains("Cir (Circular Backbone Left)")) {
					return false;
				}
				return true;
			}
			return false;
		}
	};

	static Filter interactionNodeFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle() != null && ((mxCell) arg0).getStyle().contains(STYLE_INTERACTION_NODE);
		}
	};

	/**
	 * Filters mxCells that contain "eventGlyph" in the style string
	 */
	static Filter eventFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle() != null && ((mxCell) arg0).getStyle().contains(STYLE_EVENT);
		}
	};

	protected static URI getParticipantType(boolean source, Set<URI> interactionTypes) {
		URI interactionType = null;
		for (URI interactionURI : SBOLData.interactions.values()) {
			if (interactionTypes.contains(interactionURI)) {
				interactionType = interactionURI;
				break;
			}
		}
		if (interactionType == null) {
			return null;
		}
		if (source) {
			return SBOLData.interactionSourceRoles.get(interactionType);
		} else {
			return SBOLData.interactionTargetRoles.get(interactionType);
		}
	}

	static QName createQName(String name) {
		return new QName(URI_PREFIX, name, ANN_PREFIX);
	}

	/**
	 * Sanitize a string to be a valid XML NCName for use as a QName local part.
	 * Characters not valid in NCNames are encoded as _xHHHH_ where HHHH is 4-digit uppercase hex.
	 * Needed because InteractionInfo simulationData keys can contain full URIs
	 * (e.g., "nc_https://sbolcanvas.org/FKha2kkU/1") which are invalid XML element names.
	 *
	 * @see MxToSBML#sanitizeId for SBML SId sanitization (different spec, different rules)
	 */
	static String sanitizeAnnotationKey(String key) {
		if (key == null || key.isEmpty()) return key;
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < key.length(); i++) {
			char c = key.charAt(i);
			if (i == 0 ? (Character.isLetter(c) || c == '_')
					   : (Character.isLetterOrDigit(c) || c == '.' || c == '-' || c == '_')) {
				sb.append(c);
			} else {
				sb.append("_x").append(String.format("%04X", (int) c)).append("_");
			}
		}
		return sb.toString();
	}

	/**
	 * Reverse sanitizeAnnotationKey: decode _xHHHH_ sequences back to characters.
	 */
	static String desanitizeAnnotationKey(String key) {
		if (key == null || key.isEmpty()) return key;
		StringBuilder sb = new StringBuilder();
		int i = 0;
		while (i < key.length()) {
			if (i + 6 < key.length() && key.charAt(i) == '_' && key.charAt(i + 1) == 'x'
					&& isHexDigit(key.charAt(i + 2)) && isHexDigit(key.charAt(i + 3))
					&& isHexDigit(key.charAt(i + 4)) && isHexDigit(key.charAt(i + 5))
					&& key.charAt(i + 6) == '_') {
				sb.append((char) Integer.parseInt(key.substring(i + 2, i + 6), 16));
				i += 7;
			} else {
				sb.append(key.charAt(i));
				i++;
			}
		}
		return sb.toString();
	}

	private static boolean isHexDigit(char c) {
		return (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f');
	}

	// Helpers shared between MxToSBOL and MxToSBML

	/**
	 * Parses an mxGraph from an input stream.
	 * 
	 * @param graphStream
	 * @return
	 * @throws IOException
	 */
	protected mxGraph parseGraph(InputStream graphStream) throws IOException {
		mxGraph graph = new mxGraph();
		((mxGraphModel) graph.getModel()).setMaintainEdgeParent(false);
		Document document = mxXmlUtils.parseXml(mxUtils.readInputStream(graphStream));
		mxCodec codec = new mxCodec(document);
		codec.decode(document.getDocumentElement(), graph.getModel());
		return graph;
	}

	/**
	 * Parses an mxGraph from an input stream and loads all four dictionaries
	 * (info, combinatorial, interaction, event) from cell 0's data container.
	 */
	@SuppressWarnings("unchecked")
	protected mxGraph loadGraphAndDictionaries(InputStream graphStream) throws IOException {
		mxGraph graph = parseGraph(graphStream);
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell0 = (mxCell) model.getCell("0");
		ArrayList<Object> dataContainer = (ArrayList<Object>) cell0.getValue();
		infoDict = loadDictionary(dataContainer, INFO_DICT_INDEX);
		combinatorialDict = loadDictionary(dataContainer, COMBINATORIAL_DICT_INDEX);
		interactionDict = loadDictionary(dataContainer, INTERACTION_DICT_INDEX);
		eventDict = loadDictionary(dataContainer, EVENT_DICT_INDEX);
		return graph;
	}

	/**
	 * Dictionaries from the front end sometimes get decoded as array lists. This
	 * method ensures that we load them as hash tables.
	 * 
	 * @param <T>
	 * @param dataContainer
	 * @param dictionaryIndex
	 */
	@SuppressWarnings("unchecked")
	protected <T extends Info> Hashtable<String, T> loadDictionary(ArrayList<Object> dataContainer, int dictionaryIndex) {
		// Older designs predate this slot; treat an absent slot as an empty dictionary.
		if (dictionaryIndex >= dataContainer.size()) {
			return new Hashtable<String, T>();
		}
		if (dataContainer.get(dictionaryIndex) instanceof ArrayList) {
			// 90% sure it only happens when it's empty meaning that we could just return a
			// empty hash table.
			Hashtable<String, T> dict = new Hashtable<String, T>();
			for (T item : (ArrayList<T>) dataContainer.get(dictionaryIndex)) {
				// nasty instanceof as I couldn't convince the compiler that the abstract method
				// is guaranteed to be implemented
				if (item instanceof GlyphInfo) {
					dict.put(((GlyphInfo) item).getFullURI(), item);
				} else if (item instanceof ModuleInfo) {
					dict.put(((ModuleInfo) item).getFullURI(), item);
				} else if (item instanceof CombinatorialInfo) {
					dict.put(((CombinatorialInfo) item).getFullURI(), item);
				} else if (item instanceof InteractionInfo) {
					dict.put(((InteractionInfo) item).getFullURI(), item);
				} else if (item instanceof EventInfo) {
					dict.put(((EventInfo) item).getFullURI(), item);
				}
			}
			return dict;
		} else {
			return (Hashtable<String, T>) dataContainer.get(dictionaryIndex);
		}
	}

	/**
	 * Write simulation data as a nested SBOL annotation on the given Identified object.
	 * Keys are sorted for deterministic output; URI-containing keys are sanitized for XML.
	 *
	 * @param identityPrefix the parent's displayId (not full URI) — used to build the
	 *                       nested annotation's displayId, which must be a valid SBOL
	 *                       identifier (alphanumeric + underscore, sbol-10204)
	 */
	static void writeSimulationAnnotations(Identified parent, Hashtable<String, Object> simulationData,
			String identityPrefix) throws SBOLValidationException {
		if (simulationData == null || simulationData.isEmpty()) return;
		List<Annotation> annList = new ArrayList<Annotation>();
		for (String key : new TreeSet<>(simulationData.keySet())) {
			annList.add(new Annotation(createQName(sanitizeAnnotationKey(key)), simulationData.get(key).toString()));
		}
		parent.createAnnotation(
				createQName("simulationData"),
				createQName("SimulationData"),
				identityPrefix + "_SimulationData",
				annList);
	}

	/**
	 * Read simulation data from a nested SBOL annotation on the given Identified object.
	 * Returns an empty Hashtable if no simulationData annotation exists.
	 */
	static Hashtable<String, Object> readSimulationAnnotations(Identified identified) {
		for (Annotation annotation : identified.getAnnotations()) {
			if (annotation.getQName().getLocalPart().equals("simulationData")) {
				Hashtable<String, Object> simData = new Hashtable<String, Object>();
				for (Annotation child : annotation.getAnnotations()) {
					simData.put(desanitizeAnnotationKey(child.getQName().getLocalPart()), child.getStringValue());
				}
				return simData;
			}
		}
		return new Hashtable<>();
	}

}
