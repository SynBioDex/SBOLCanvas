package org.sbolcanvas.utils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.ArrayList;
import java.util.Hashtable;
import java.util.Set;
import java.util.TreeSet;
import java.util.Map;

import javax.xml.namespace.QName;

import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.Identified;
import org.sbolstandard.core2.SBOLValidationException;
import org.sbolstandard.core2.ComponentDefinition;
import org.sbolstandard.core2.GenericTopLevel;
import org.sbolstandard.core2.Interaction;
import org.sbolstandard.core2.Participation;

import org.w3c.dom.Document;

import org.w3c.dom.Element;
import org.w3c.dom.Node;

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
		mxCodecRegistry.addPackage("org.sbolcanvas.data");
		mxCodecRegistry.register(createInfoCodec(new GlyphInfo()));
		mxCodecRegistry.register(createInfoCodec(new InteractionInfo()));
		mxCodecRegistry.register(createInfoCodec(new EventInfo()));
	};

	// Custom codec for GlyphInfo, InteractionInfo and EventInfo simulation data and coefficients
	// Default mxObjectCodec decodes as an ArrayList, losing the keys
	private static mxObjectCodec createInfoCodec(Info template) {
		return new mxObjectCodec(template) {
			@Override
			protected void writeComplexAttribute(mxCodec enc, Object obj, String attr, Object value, Node node) {
				if ("simulationData".equals(attr) || "sourceCoefficient".equals(attr)
						|| "targetCoefficient".equals(attr)) {
					Document document = node.getOwnerDocument();
					Element array = document.createElement("Array");
					array.setAttribute("as", attr);
					for (Map.Entry<?, ?> entry : ((Map<?, ?>) value).entrySet()) {
						Element child = document.createElement("add");
						child.setAttribute("as", entry.getKey().toString());
						Object v = entry.getValue();
						child.setAttribute("type", ModelHelper.valueType(v));
						child.setAttribute("value", v.toString());
						array.appendChild(child);
					}
					node.appendChild(array);
				} else {
					super.writeComplexAttribute(enc, obj, attr, value, node);
				}
			}

			@Override
			protected void decodeChild(mxCodec dec, Node child, Object obj) {
				if (child instanceof Element && "Array".equals(child.getNodeName())) {
					String as = ((Element) child).getAttribute("as");
					if ("simulationData".equals(as)) {
						Hashtable<String, Object> data = new Hashtable<>();
						decodeTypedKeyedArray(child, data);
						if (obj instanceof GlyphInfo) {
							readKnownFields(data, "species", "Promoter");
							((GlyphInfo) obj).setSimulationData(data);
						} else if (obj instanceof InteractionInfo) {
							readKnownFields(data, SBOLData.INTERACTION_FIELD_CONTEXTS);
							((InteractionInfo) obj).setSimulationData(data);
						} else if (obj instanceof EventInfo) {
							readKnownFields(data, "event");
							((EventInfo) obj).setSimulationData(data);
						}
						return;
					}
					if (obj instanceof InteractionInfo) {
						InteractionInfo info = (InteractionInfo) obj;
						if ("sourceCoefficient".equals(as) || "targetCoefficient".equals(as)) {
							Hashtable<String, Object> data = new Hashtable<>();
							decodeTypedKeyedArray(child, data);
							Double min = (Double) SBOLData.field("participation", "coefficient").get("min");
							for (Map.Entry<String, Object> entry : data.entrySet())
								entry.setValue(readNumber(entry.getValue(), "coefficient", min));
							if ("sourceCoefficient".equals(as))
								info.setSourceCoefficient(data);
							else
								info.setTargetCoefficient(data);
							return;
						}
						Hashtable<String, String> map = null;
						if ("sourceRefinement".equals(as))
							map = info.getSourceRefinement();
						else if ("targetRefinement".equals(as))
							map = info.getTargetRefinement();
						else if ("fromURI".equals(as))
							map = info.getFromURI();
						else if ("toURI".equals(as))
							map = info.getToURI();
						if (map != null) {
							decodeKeyedArray(child, map);
							return;
						}
					}
				}
				super.decodeChild(dec, child, obj);
			}
		};
	}

	private static void decodeKeyedArray(Node arrayNode, Hashtable<String, String> data) {
		for (Node child = arrayNode.getFirstChild(); child != null; child = child.getNextSibling()) {
			if (child instanceof Element) {
				Element entry = (Element) child;
				data.put(entry.getAttribute("as"), entry.getAttribute("value"));
			}
		}
	}

	private static void decodeTypedKeyedArray(Node arrayNode, Hashtable<String, Object> data) {
		for (Node child = arrayNode.getFirstChild(); child != null; child = child.getNextSibling()) {
			if (child instanceof Element) {
				Element entry = (Element) child;
				String key = entry.getAttribute("as");
				String type = entry.getAttribute("type");
				if (!"number".equals(type) && !"boolean".equals(type) && !"string".equals(type)) {
					throw new IllegalArgumentException("Unsupported scalar type: " + key + " = " + type);
				}
				data.put(key, decodeValue(key, type, entry.getAttribute("value")));
			}
		}
	}

	private static Object decodeValue(String key, String type, String text) {
		switch (type) {
		case "number":
			return numericValue(text, key, null);
		case "boolean":
			if ("true".equals(text))
				return Boolean.TRUE;
			if ("false".equals(text))
				return Boolean.FALSE;
			throw new IllegalArgumentException("Invalid boolean: " + key + " = " + text);
		default:
			return text;
		}
	}

	private static void readKnownFields(Hashtable<String, Object> data, String... contexts) {
		for (Map.Entry<String, Object> entry : data.entrySet()) {
			entry.setValue(checkedValue(entry.getKey(), entry.getValue(), contexts));
		}
	}

	protected static Object checkedValue(String key, Object value, String... contexts) {
		Map<String, Object> field = knownField(key, contexts);
		if (field == null)
			return value;
		String type = (String) field.get("type");
		if ("number".equals(type))
			return numericValue(value, key, (Double) field.get("min"));
		if ("boolean".equals(type) && !(value instanceof Boolean))
			throw new IllegalArgumentException("Invalid boolean: " + key + " = " + value);
		if ("uri".equals(type) && (!(value instanceof String) || ((String) value).isEmpty()))
			throw new IllegalArgumentException("Invalid species URI: " + value);
		return value;
	}

	protected static double readNumber(Object value, String key, Double min) {
		if (!(value instanceof Double))
			throw new IllegalArgumentException("Invalid number: " + key + " = " + value);
		return numericValue(value, key, min);
	}

	protected static Map<String, Object> knownField(String key, String... contexts) {
		for (String context : contexts) {
			Map<String, Object> field = SBOLData.field(context, key);
			if (field != null)
				return field;
		}
		return null;
	}

	protected Hashtable<String, Info> infoDict;
	protected Hashtable<String, CombinatorialInfo> combinatorialDict;
	protected Hashtable<String, InteractionInfo> interactionDict;
	protected Hashtable<String, EventInfo> eventDict;
	protected LayoutHelper layoutHelper;
	protected ModelHelper modelHelper;

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
			return (arg0 instanceof mxCell && ((mxCell) arg0).getStyle() != null && (((mxCell) arg0).getStyle().contains(STYLE_CIRCUIT_CONTAINER))
					&& (((mxCell) arg0).getChildCount() > 1));
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
		mxCodec codec = new mxCodec(document) {
			@Override
			public Object decode(Node node, Object into) {
				if (node != null && node.getNodeType() == Node.ELEMENT_NODE) {
					mxObjectCodec objectCodec = mxCodecRegistry.getCodec(node.getNodeName());
					if (objectCodec != null) {
						return objectCodec.decode(this, node, into);
					}
				}
				return super.decode(node, into);
			}
		};
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

	private static final java.util.regex.Pattern NUMBER_TEXT = java.util.regex.Pattern.compile("[-+]?(\\d+\\.?\\d*|\\.\\d+)([eE][-+]?\\d+)?");

	static double numericValue(Object value, String key, Double min) {
		double number;
		if (value instanceof Number) {
			number = ((Number) value).doubleValue();
		} else if (value instanceof String) {
			String text = ((String) value).trim();
			if (!NUMBER_TEXT.matcher(text).matches()) {
				throw new IllegalArgumentException("Invalid number: " + key + " = " + value);
			}
			number = Double.parseDouble(text);
		} else
			throw new IllegalArgumentException("Invalid number: " + key + " = " + value);
		if (!Double.isFinite(number) || (min != null && number < min)) {
			throw new IllegalArgumentException("Invalid number: " + key + " = " + value);
		}
		return number;
	}

}
