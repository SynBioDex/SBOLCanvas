package utils;

import java.net.URI;
import java.util.Hashtable;
import java.util.Set;

import javax.xml.namespace.QName;

import org.sbolstandard.core2.SystemsBiologyOntology;

import com.mxgraph.io.mxCodecRegistry;

import data.Info;

public class Converter {

	// canvas constants
	public static final String URI_PREFIX = "https://sbolcanvas.org/";
	public static final String ANN_PREFIX = "SBOLCanvas";

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

	static {
		// Necessary for encoding/decoding GlyphInfo and InteractionInfo
		mxCodecRegistry.addPackage("data");
	};

	protected Hashtable<String, Info> infoDict;
	protected LayoutHelper layoutHelper;

	protected static URI getParticipantType(boolean source, Set<URI> interactionTypes) {
		if (interactionTypes.contains(SystemsBiologyOntology.BIOCHEMICAL_REACTION)) {
			return source ? SystemsBiologyOntology.REACTANT : SystemsBiologyOntology.PRODUCT;
		} else if (interactionTypes.contains(SystemsBiologyOntology.CONTROL)) {
			return source ? SystemsBiologyOntology.MODIFIER : SystemsBiologyOntology.MODIFIED;
		} else if (interactionTypes.contains(SystemsBiologyOntology.DEGRADATION)) {
			return SystemsBiologyOntology.REACTANT;
		} else if (interactionTypes.contains(SystemsBiologyOntology.GENETIC_PRODUCTION)) {
			return source ? SystemsBiologyOntology.TEMPLATE : SystemsBiologyOntology.PRODUCT;
		} else if (interactionTypes.contains(SystemsBiologyOntology.INHIBITION)) {
			return source ? SystemsBiologyOntology.INHIBITOR : SystemsBiologyOntology.INHIBITED;
		} else if (interactionTypes.contains(SystemsBiologyOntology.NON_COVALENT_BINDING)) {
			return source ? SystemsBiologyOntology.REACTANT : SystemsBiologyOntology.PRODUCT;
		} else if (interactionTypes.contains(SystemsBiologyOntology.STIMULATION)) {
			return source ? SystemsBiologyOntology.STIMULATOR : SystemsBiologyOntology.STIMULATED;
		}
		return null;
	}

	static QName createQName(String name) {
		return new QName(URI_PREFIX, name, ANN_PREFIX);
	}
	
	// helpers
}
