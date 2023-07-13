package utils;

import java.net.URI;
import java.util.Hashtable;
import java.util.Set;

import javax.xml.namespace.QName;

import com.mxgraph.io.mxCodecRegistry;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel.Filter;

import data.CombinatorialInfo;
import data.Info;
import data.InteractionInfo;

public class Converter {

	// canvas constants
	public static final String URI_PREFIX = "https://sbolcanvas.org/";
	public static final String ANN_PREFIX = "SBOLCanvas";

	// data constants
	public static final int INFO_DICT_INDEX = 0;
	public static final int COMBINATORIAL_DICT_INDEX = 1;
	public static final int INTERACTION_DICT_INDEX = 2;
	
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

	static {
		// Necessary for encoding/decoding GlyphInfo and InteractionInfo
		mxCodecRegistry.addPackage("data");
	};

	protected Hashtable<String, Info> infoDict;
	protected Hashtable<String, CombinatorialInfo> combinatorialDict;
	protected Hashtable<String, InteractionInfo> interactionDict;
	protected LayoutHelper layoutHelper;

	/**
	 * Filters mxCells that contain "textBox" in the style string
	 */
	static Filter textBoxFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_TEXTBOX);
		}
	};

	/**
	 * Filters mxCells that contain "protein" in the style string
	 */
	static Filter proteinFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_MOLECULAR_SPECIES);
		}
	};

	/**
	 * 
	 */
	static Filter moduleFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_MODULE);
		}
	};

	/**
	 * Filters mxCells that contain "circuitContainer" in the style string
	 */
	static Filter containerFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_CIRCUIT_CONTAINER);
		}
	};

	/**
	 * Filters mxCells that contain "backbone" in the style string
	 */
	static Filter backboneFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_BACKBONE);
		}
	};

	/**
	 * Filters mxCells that contain "sequenceFeatureGlyph" in the style string
	 */
	static Filter sequenceFeatureFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_SEQUENCE_FEATURE);
		}
	};
	
	static Filter interactionNodeFilter = new Filter() {
		@Override
		public boolean filter(Object arg0) {
			return arg0 instanceof mxCell && ((mxCell) arg0).getStyle().contains(STYLE_INTERACTION_NODE);
		}
	};
	
	protected static URI getParticipantType(boolean source, Set<URI> interactionTypes) {
		URI interactionType = null;
		for(URI interactionURI : SBOLData.interactions.values()) {
			if(interactionTypes.contains(interactionURI)) {
				interactionType = interactionURI;
				break;
			}
		}
		if(interactionType == null) {
			return null;
		}
		if(source) {
			return SBOLData.interactionSourceRoles.get(interactionType);
		}else {
			return SBOLData.interactionTargetRoles.get(interactionType);
		}
	}

	static QName createQName(String name) {
		return new QName(URI_PREFIX, name, ANN_PREFIX);
	}
	
	// helpers
}
