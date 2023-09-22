package utils;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.sbolstandard.core2.Annotation;
import org.sbolstandard.core2.GenericTopLevel;
import org.sbolstandard.core2.SBOLDocument;
import org.sbolstandard.core2.SBOLValidationException;

import com.mxgraph.model.mxCell;
import com.mxgraph.model.mxGeometry;
import com.mxgraph.util.mxConstants;
import com.mxgraph.util.mxPoint;
import com.mxgraph.view.mxGraph;

public class LayoutHelper {
	
	private SBOLDocument document;
	private mxGraph graph;
	private HashMap<URI, GenericTopLevel> layouts;
	
	public LayoutHelper(SBOLDocument document, mxGraph graph) {
		this.document = document;
		this.graph = graph;
		layouts = new HashMap<URI, GenericTopLevel>();
		
		for(GenericTopLevel layout : document.getGenericTopLevels()) {
			if(!layout.getRDFType().getLocalPart().equals("Layout"))
				continue;
			URI objectRef = layout.getAnnotation(Converter.createQName("objectRef")).getURIValue();
			layouts.put(objectRef, layout);
		}
	}
	
	/**
	 * Adds a otherLayout as a reference in layoutRef.
	 * Eg, layoutRef(Module layout) references otherLayout(Component Layout)
	 * @param layoutRef
	 * @param otherLayout
	 * @throws SBOLValidationException 
	 */
	public void addLayoutRef(URI objectRef, URI otherLayout, String displayId) throws SBOLValidationException {
		GenericTopLevel layout = this.getGraphicalLayout(objectRef);
		layout.createAnnotation(Converter.createQName(displayId), otherLayout);
	}
	
	public void createGraphicalLayout(URI objectRef, String displayId) throws SBOLValidationException {
		if(layouts.containsKey(objectRef))
			return;
		GenericTopLevel layout = document.createGenericTopLevel(displayId, Converter.createQName("Layout"));
		layout.createAnnotation(Converter.createQName("objectRef"), objectRef);
		layouts.put(objectRef, layout);
	}
	
	public void addGraphicalNode(URI layoutRef, String displayId, mxCell cell) throws SBOLValidationException {
		GenericTopLevel layout = getGraphicalLayout(layoutRef);
		Map<String, Object> styles = graph.getCellStyle(cell);

		if (cell.isVertex()) {

			List<Annotation> annList = new ArrayList<Annotation>();

			// positional
			mxGeometry cellGeometry = cell.getGeometry();
			annList.add(new Annotation(Converter.createQName("x"), cellGeometry.getX()));
			annList.add(new Annotation(Converter.createQName("y"), cell.getGeometry().getY()));
			annList.add(new Annotation(Converter.createQName("width"), cellGeometry.getWidth()));
			annList.add(new Annotation(Converter.createQName("height"), cellGeometry.getHeight()));

			// styling
			if (cell.getStyle().contains(mxConstants.STYLE_STROKECOLOR))
				annList.add(new Annotation(Converter.createQName("strokeColor"),
						(String) styles.get(mxConstants.STYLE_STROKECOLOR)));

			if (cell.getStyle().contains(mxConstants.STYLE_STROKE_OPACITY))
				annList.add(new Annotation(Converter.createQName("strokeOpacity"),
						(String) styles.get(mxConstants.STYLE_STROKE_OPACITY)));

			if (cell.getStyle().contains(mxConstants.STYLE_STROKEWIDTH))
				annList.add(new Annotation(Converter.createQName("strokeWidth"),
						(String) styles.get(mxConstants.STYLE_STROKEWIDTH)));

			if (cell.getStyle().contains(mxConstants.STYLE_FILLCOLOR))
				annList.add(new Annotation(Converter.createQName("fillColor"),
						(String) styles.get(mxConstants.STYLE_FILLCOLOR)));

			if (cell.getStyle().contains(mxConstants.STYLE_FILL_OPACITY))
				annList.add(new Annotation(Converter.createQName("fillOpacity"),
						(String) styles.get(mxConstants.STYLE_FILL_OPACITY)));

			if (cell.getStyle().contains(mxConstants.STYLE_FONTCOLOR))
				annList.add(new Annotation(Converter.createQName("fontColor"),
						(String) styles.get(mxConstants.STYLE_FONTCOLOR)));

			if (cell.getStyle().contains(mxConstants.STYLE_FONTSIZE))
				annList.add(new Annotation(Converter.createQName("fontSize"),
						(String) styles.get(mxConstants.STYLE_FONTSIZE)));

			if (cell.getStyle().contains(Converter.STYLE_TEXTBOX))
				annList.add(new Annotation(Converter.createQName("text"), (String) cell.getValue()));

			annList.add(new Annotation(Converter.createQName("displayId"), displayId));

			layout.createAnnotation(Converter.createQName("nodeGlyph"),
					Converter.createQName("NodeGlyph"), "NodeGlyph_"+cell.getId(), annList);

		} else if (cell.isEdge()) {

			List<Annotation> annList = new ArrayList<Annotation>();

			// styling
			if (cell.getStyle().contains(mxConstants.STYLE_STROKECOLOR))
				annList.add(new Annotation(Converter.createQName("strokeColor"),
						(String) styles.get(mxConstants.STYLE_STROKECOLOR)));

			if (cell.getStyle().contains(mxConstants.STYLE_STROKE_OPACITY))
				annList.add(new Annotation(Converter.createQName("strokeOpacity"),
						(String) styles.get(mxConstants.STYLE_STROKE_OPACITY)));

			if (cell.getStyle().contains(mxConstants.STYLE_STROKEWIDTH))
				annList.add(new Annotation(Converter.createQName("strokeWidth"),
						(String) styles.get(mxConstants.STYLE_STROKEWIDTH)));

			if (cell.getStyle().contains(mxConstants.STYLE_ENDSIZE))
				annList.add(new Annotation(Converter.createQName("endSize"),
						(String) styles.get(mxConstants.STYLE_ENDSIZE)));

			if (cell.getStyle().contains(mxConstants.STYLE_SOURCE_PERIMETER_SPACING))
				annList.add(new Annotation(Converter.createQName("sourceSpacing"),
						(String) styles.get(mxConstants.STYLE_SOURCE_PERIMETER_SPACING)));

			if (cell.getStyle().contains(mxConstants.STYLE_TARGET_PERIMETER_SPACING))
				annList.add(new Annotation(Converter.createQName("targetSpacing"),
						(String) styles.get(mxConstants.STYLE_TARGET_PERIMETER_SPACING)));

			if (cell.getStyle().contains(mxConstants.STYLE_EDGE))
				annList.add(new Annotation(Converter.createQName("edge"),
						(String) styles.get(mxConstants.STYLE_EDGE)));

			if (cell.getStyle().contains(mxConstants.STYLE_ROUNDED))
				annList.add(new Annotation(Converter.createQName("rounded"),
						Integer.parseInt((String) styles.get(mxConstants.STYLE_ROUNDED)) == 1));

			if (cell.getStyle().contains("curved"))
				annList.add(new Annotation(Converter.createQName("curved"),
						Integer.parseInt((String) styles.get("curved")) == 1));

			annList.add(new Annotation(Converter.createQName("displayId"), displayId));

			Annotation edgeGlyphAnn = layout.createAnnotation(Converter.createQName("edgeGlyph"),
					Converter.createQName("EdgeGlyph"), "EdgeGlyph_"+cell.getId(), annList);
			// edgeGlyphAnn.setNestedIdentity(reference);

			// positional
			mxGeometry geometry = cell.getGeometry();
			if (geometry.getSourcePoint() != null) {
				List<Annotation> sourcePointAnns = new ArrayList<Annotation>();
				sourcePointAnns
						.add(new Annotation(Converter.createQName("x"), geometry.getSourcePoint().getX()));
				sourcePointAnns
						.add(new Annotation(Converter.createQName("y"), geometry.getSourcePoint().getY()));
				edgeGlyphAnn.createAnnotation(Converter.createQName("sourcePoint"),
						Converter.createQName("SourcePoint"), "SourcePoint", sourcePointAnns);
			}
			if (geometry.getTargetPoint() != null) {
				List<Annotation> targetPointAnns = new ArrayList<Annotation>();
				targetPointAnns
						.add(new Annotation(Converter.createQName("x"), geometry.getTargetPoint().getX()));
				targetPointAnns
						.add(new Annotation(Converter.createQName("y"), geometry.getTargetPoint().getY()));
				edgeGlyphAnn.createAnnotation(Converter.createQName("targetPoint"),
						Converter.createQName("TargetPoint"), "TargetPoint", targetPointAnns);
			}
			if (geometry.getPoints() != null && geometry.getPoints().size() > 0) {
				for (mxPoint point : geometry.getPoints()) {
					List<Annotation> pointAnns = new ArrayList<Annotation>();
					pointAnns.add(new Annotation(Converter.createQName("x"), point.getX()));
					pointAnns.add(new Annotation(Converter.createQName("y"), point.getY()));
					edgeGlyphAnn.createAnnotation(Converter.createQName("point"),
							Converter.createQName("Point"), "Point", pointAnns);
				}
			}
		}
	}
	
	public GenericTopLevel getGraphicalLayout(URI objectRef) {
		return layouts.get(objectRef);
	}
	
	public mxCell[] getGraphicalObjects(URI layoutRef, String displayId) {
		GenericTopLevel layout = getGraphicalLayout(layoutRef);
		if(layout == null)
			return null;
		
		ArrayList<mxCell> cells = new ArrayList<mxCell>();

		List<Annotation> annotations = layout.getAnnotations();
		for (Annotation annotation : annotations) {
			boolean shouldContinue = true;
			if(annotation.getAnnotations() == null)
				continue;
			for (Annotation attributeAnn : annotation.getAnnotations()) {
				if (attributeAnn.getQName().getLocalPart().equals("displayId")
						&& attributeAnn.getStringValue().equals(displayId)) {
					shouldContinue = false;
					break;
				}
			}
			if (shouldContinue)
				continue;
			mxCell cell = new mxCell();
			mxCell[] cellArr = { cell };
			cell.setGeometry(new mxGeometry());

			if (annotation.getQName().getLocalPart().equals("nodeGlyph")) {
				cell.setVertex(true);
				for (Annotation attributeAnn : annotation.getAnnotations()) {
					String value = attributeAnn.getStringValue();
					switch (attributeAnn.getQName().getLocalPart()) {
					case "x":
						cell.getGeometry().setX(Double.parseDouble(value));
						break;
					case "y":
						cell.getGeometry().setY(Double.parseDouble(value));
						break;
					case "width":
						cell.getGeometry().setWidth(Double.parseDouble(value));
						break;
					case "height":
						cell.getGeometry().setHeight(Double.parseDouble(value));
						break;
					case "strokeColor":
						graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, value, cellArr);
						break;
					case "strokeOpacity":
						graph.setCellStyles(mxConstants.STYLE_STROKE_OPACITY, value, cellArr);
						break;
					case "strokeWidth":
						graph.setCellStyles(mxConstants.STYLE_STROKEWIDTH, value, cellArr);
						break;
					case "fillColor":
						graph.setCellStyles(mxConstants.STYLE_FILLCOLOR, value, cellArr);
						break;
					case "fillOpacity":
						graph.setCellStyles(mxConstants.STYLE_FILL_OPACITY, value, cellArr);
						break;
					case "fontColor":
						graph.setCellStyles(mxConstants.STYLE_FONTCOLOR, value, cellArr);
						break;
					case "fontSize":
						graph.setCellStyles(mxConstants.STYLE_FONTSIZE, value, cellArr);
						break;
					case "text":
						cell.setValue(value);
						break;
					}
				}
			} else if (annotation.getQName().getLocalPart().equals("edgeGlyph")) {
				cell.setEdge(true);
				List<mxPoint> points = new ArrayList<mxPoint>();
				for (Annotation attributeAnn : annotation.getAnnotations()) {
					String value = attributeAnn.getStringValue();
					switch (attributeAnn.getQName().getLocalPart()) {
					case "strokeColor":
						graph.setCellStyles(mxConstants.STYLE_STROKECOLOR, value, cellArr);
						break;
					case "strokeOpacity":
						graph.setCellStyles(mxConstants.STYLE_STROKE_OPACITY, value, cellArr);
						break;
					case "strokeWidth":
						graph.setCellStyles(mxConstants.STYLE_STROKEWIDTH, value, cellArr);
						break;
					case "endSize":
						graph.setCellStyles(mxConstants.STYLE_ENDSIZE, value, cellArr);
						break;
					case "sourceSpacing":
						graph.setCellStyles(mxConstants.STYLE_SOURCE_PERIMETER_SPACING, value, cellArr);
						break;
					case "targetSpacing":
						graph.setCellStyles(mxConstants.STYLE_TARGET_PERIMETER_SPACING, value, cellArr);
						break;
					case "edge":
						graph.setCellStyles(mxConstants.STYLE_EDGE, value, cellArr);
						break;
					case "rounded":
						if (value.equals("true")) {
							graph.setCellStyles(mxConstants.STYLE_ROUNDED, "1", cellArr);
						}
						break;
					case "curved":
						if (value.equals("true")) {
							graph.setCellStyles("curved", "1", cellArr);
						}
						break;
					case "sourcePoint":
						mxPoint sourcePoint = new mxPoint();
						for (Annotation sourceAnn : attributeAnn.getAnnotations()) {
							switch (sourceAnn.getQName().getLocalPart()) {
							case "x":
								sourcePoint.setX(Double.parseDouble(sourceAnn.getStringValue()));
								break;
							case "y":
								sourcePoint.setY(Double.parseDouble(sourceAnn.getStringValue()));
								break;
							}
						}
						cell.getGeometry().setSourcePoint(sourcePoint);
						break;
					case "targetPoint":
						mxPoint targetPoint = new mxPoint();
						for (Annotation sourceAnn : attributeAnn.getAnnotations()) {
							switch (sourceAnn.getQName().getLocalPart()) {
							case "x":
								targetPoint.setX(Double.parseDouble(sourceAnn.getStringValue()));
								break;
							case "y":
								targetPoint.setY(Double.parseDouble(sourceAnn.getStringValue()));
								break;
							}
						}
						cell.getGeometry().setTargetPoint(targetPoint);
						break;
					case "point":
						mxPoint point = new mxPoint();
						for (Annotation sourceAnn : attributeAnn.getAnnotations()) {
							switch (sourceAnn.getQName().getLocalPart()) {
							case "x":
								point.setX(Double.parseDouble(sourceAnn.getStringValue()));
								break;
							case "y":
								point.setY(Double.parseDouble(sourceAnn.getStringValue()));
								break;
							}
						}
						points.add(point);
						break;
					}
				}
				cell.getGeometry().setPoints(points);
			}
			cells.add(cell);
		}

		return cells.size() > 0 ? cells.toArray(new mxCell[0]) : null;
	}
	
	public mxCell getGraphicalObject(URI layoutRef, String displayId) {
		mxCell[] cells = getGraphicalObjects(layoutRef, displayId);
		return cells != null ? cells[0] : null;
	}
	
}
