package utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Hashtable;
import java.util.List;
import java.util.Set;

import javax.xml.namespace.QName;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactoryConfigurationError;

// JSBML API Docs: https://sbml.org/jsbml/files/doc/api/1.6.1/overview-summary.html
import org.sbml.jsbml.SBMLDocument;
import org.sbml.jsbml.SBO;
import org.sbml.jsbml.Model;
import org.sbml.jsbml.Species;
import org.synbiohub.frontend.SynBioHubException;
import org.synbiohub.frontend.SynBioHubFrontend;
import org.w3c.dom.Document;

import com.mxgraph.io.mxCodec;
import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGraphModel;
import com.mxgraph.util.mxConstants;
import com.mxgraph.util.mxUtils;
import com.mxgraph.util.mxXmlUtils;
import com.mxgraph.view.mxGraph;

import data.CanvasAnnotation;
import data.Info;
import data.GlyphInfo;
import data.IdentifiedInfo;
import data.InteractionInfo;
import data.ModuleInfo;
import data.VariableComponentInfo;
import data.CombinatorialInfo;

public class MxToSBML extends Converter {

	private HashMap<String, String> userTokens;

	public MxToSBML() {
		this(null);
	}

	public MxToSBML(HashMap<String, String> userTokens) {
		infoDict = new Hashtable<String, Info>();
		combinatorialDict = new Hashtable<String, CombinatorialInfo>();
		interactionDict = new Hashtable<String, InteractionInfo>();
		this.userTokens = userTokens;
	}

	public void toSBML(InputStream graphStream, OutputStream sbmlStream)
			throws IOException, URISyntaxException, TransformerFactoryConfigurationError,
			TransformerException, SynBioHubException {

		// to do: implement main method
		// note: missing "SBMLWriter" equivalent. Investigate JSBML package.
		// SBOLWriter comes from `import org.sbolstandard.core2.SBOLWriter;`

		// SBMLDocument document = setupDocument(graphStream);

		// temp test output
		sbmlStream.write("Test of MxToSBML export".getBytes("UTF-8"));
	}

	@SuppressWarnings("unchecked")
	private void setupDocument(InputStream graphStream) throws IOException {
		// read in the mxGraph
		mxGraph graph = parseGraph(graphStream);
		mxGraphModel model = (mxGraphModel) graph.getModel();
		mxCell cell0 = (mxCell) model.getCell("0");
		ArrayList<Object> dataContainer = (ArrayList<Object>) cell0.getValue();
		infoDict = loadDictionary(dataContainer, INFO_DICT_INDEX);
		combinatorialDict = loadDictionary(dataContainer, COMBINATORIAL_DICT_INDEX);
		interactionDict = loadDictionary(dataContainer, INTERACTION_DICT_INDEX);

		// to do: create SBML document that has species and reactions
	}

	// == helper methods
	// copied from `SBOLCanvasBackend/src/utils/MxToSBOL.java`
	private mxGraph parseGraph(InputStream graphStream) throws IOException {
		mxGraph graph = new mxGraph();
		((mxGraphModel) graph.getModel()).setMaintainEdgeParent(false);
		Document document = mxXmlUtils.parseXml(mxUtils.readInputStream(graphStream));
		mxCodec codec = new mxCodec(document);
		codec.decode(document.getDocumentElement(), graph.getModel());
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
	private <T extends Info> Hashtable<String, T> loadDictionary(ArrayList<Object> dataContainer, int dictionaryIndex) {
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
				}
			}
			return dict;
		} else {
			return (Hashtable<String, T>) dataContainer.get(dictionaryIndex);
		}
	}
}
