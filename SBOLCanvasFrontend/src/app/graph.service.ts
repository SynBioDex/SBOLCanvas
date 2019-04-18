import {Injectable} from '@angular/core';
import * as mxGraph from 'mxgraph';
import * as mxDragSource from 'mxgraph';

declare var require: any;
const mx = require('mxgraph')({
  mxImageBasePath: 'mxgraph/images',
  mxBasePath: 'mxgraph'
});

// Constants (there is no doubt a better way to do this
const glyphWidth = 60;
const glyphHeight = 60;
const glyphWidthStr = glyphWidth + 'px';
const glyphHeightStr = glyphHeight + 'px';

@Injectable({
  providedIn: 'root'
})
export class GraphService {

  graph: mxGraph;
  graphContainer: HTMLElement;
  glyphDragPreviewElt: HTMLElement;
  baseGlyphStyle;

  constructor() {

    this.graphContainer = document.createElement('div');
    this.graphContainer.id = 'graphContainer';
    this.graphContainer.style.margin = 'auto';

    this.graph = new mx.mxGraph(this.graphContainer);

    // Enables rubberband selection
    // tslint:disable-next-line:no-unused-expression
    new mx.mxRubberband(this.graph);

    // A dummy element used for previewing glyphs as they are dragged onto the graph
    this.glyphDragPreviewElt = document.createElement('div');
    this.glyphDragPreviewElt.style.border = 'dashed white 1px';
    this.glyphDragPreviewElt.style.width = glyphWidthStr;
    this.glyphDragPreviewElt.style.height = glyphHeightStr;

    this.baseGlyphStyle = new Object();
    this.baseGlyphStyle[mx.mxConstants.STYLE_SHAPE] = mx.mxConstants.SHAPE_IMAGE;
    this.baseGlyphStyle[mx.mxConstants.STYLE_PERIMETER] = mx.mxPerimeter.RectanglePerimeter;
    this.baseGlyphStyle[mx.mxConstants.STYLE_FONTCOLOR] = '#FFFFFF';
    this.baseGlyphStyle[mx.mxConstants.STYLE_SHAPE] = mx.mxConstants.SHAPE_LABEL;
    this.baseGlyphStyle[mx.mxConstants.STYLE_STROKECOLOR] = '#000000';
    this.baseGlyphStyle[mx.mxConstants.STYLE_ALIGN] = mx.mxConstants.ALIGN_CENTER;
    this.baseGlyphStyle[mx.mxConstants.STYLE_VERTICAL_ALIGN] = mx.mxConstants.ALIGN_BOTTOM;
    this.baseGlyphStyle[mx.mxConstants.STYLE_IMAGE_ALIGN] = mx.mxConstants.ALIGN_CENTER;
    this.baseGlyphStyle[mx.mxConstants.STYLE_IMAGE_VERTICAL_ALIGN] = mx.mxConstants.ALIGN_TOP;
    this.baseGlyphStyle[mx.mxConstants.STYLE_IMAGE_WIDTH] = String(glyphWidth);
    this.baseGlyphStyle[mx.mxConstants.STYLE_IMAGE_HEIGHT] = String(glyphHeight);
  }

  /**
   * Returns the <div> that this graph displays to
   */
  getGraphDOM() {
    return this.graphContainer;
  }

  /**
   * Creates a dragsource that can be used to add glyphs to the canvas,
   * and returns the html element associated with it
   */
  createGlyphDragSource(sourceImg) {
    const elt = document.createElement('img');
    elt.src = sourceImg;
    elt.width = glyphWidth;
    elt.height = glyphHeight;

    const newGlyphStyle = mx.mxUtils.clone(this.baseGlyphStyle);
    newGlyphStyle[mx.mxConstants.STYLE_IMAGE] = sourceImg;
    const styleName = 'cellStyle:' + sourceImg;
    this.graph.getStylesheet().putCellStyle(styleName, newGlyphStyle);

    const insertGlyph = function (graph, evt, target, x, y) {
      // When executed, 'this' is the dragSource, not the graphService

      graph.getModel().beginUpdate();
      try {
        graph.insertVertex(graph.getDefaultParent(), null, '', x, y, glyphWidth, glyphHeight, styleName);
      } finally {
        graph.getModel().endUpdate();
      }
    }

    const ds: mxDragSource = mx.mxUtils.makeDraggable(elt, this.graph, insertGlyph, this.glyphDragPreviewElt);
    ds.isGridEnabled = function() {
      return this.graph.graphHandler.guidesEnabled;
    };

    return elt;
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Returns the mxGraph object. This is meant for temporary testing - any permanent code should not rely on this.
   */
  getGraph() {
    return this.graph;
  }

  graphToString(): string {
    var encoder = new mx.mxCodec();
    var result = encoder.encode(this.graph.getModel());
    var xml = mx.mxUtils.getXml(result);
    return xml;
  }

  stringToGraph(graphString: string){
    var doc = mx.mxUtils.parseXml(graphString);
    var codec = new mx.mxCodec(doc);
    this.graph.getModel().clear();
    //this.graph = new mx.mxGraph(this.graphContainer);
    var elt = doc.documentElement.firstChild.firstChild;

    this.graph.getModel().beginUpdate();
    let vertecies = new Map<number, any>();
    let edges = [];
    while (elt != null) {
      if (elt.attributes.getNamedItem('value') == null) {
        elt = elt.nextSibling;
        continue;
      }
      var id = elt.attributes.getNamedItem('id').value;
      var value = elt.attributes.getNamedItem('value').value;
      if (elt.attributes.getNamedItem('vertex') != null) {
        var geo = elt.firstChild;
        var x = geo.attributes.getNamedItem('x').value;
        var y = geo.attributes.getNamedItem('y').value;
        var width = geo.attributes.getNamedItem('width').value;
        var height = geo.attributes.getNamedItem('height').value;
        var style = elt.attributes.getNamedItem('style').value;
        vertecies.set(id, this.graph.insertVertex(this.graph.getDefaultParent(), null, value, x, y, width, height, style));
      } else if (elt.attributes.getNamedItem('edge') != null) {
        var geo = null;
        var source = null;
        if (elt.attributes.getNamedItem('source') != null) {
          source = elt.attributes.getNamedItem('source').value;
        } else {
          geo = elt.firstChild.firstChild;
          var x = geo.attributes.getNamedItem('x').value;
          var y = geo.attributes.getNamedItem('y').value;
          source = [x, y];
        }
        var target = null;
        if (elt.attributes.getNamedItem('target') != null) {
          target = elt.attributes.getNamedItem('target').value;
        } else {
          if (geo == null) {
            geo = elt.firstChild.firstChild;
          } else {
            geo = geo.nextSibling;
          }
          var x = geo.attributes.getNamedItem('x').value;
          var y = geo.attributes.getNamedItem('y').value;
          target = [x, y];
        }
        edges.push([value, source, target]);
      }
      elt = elt.nextSibling;
    }
    // edges have to have their source and target set after all the vertecies have been read in
    for (var i = 0; i < edges.length; i++) {
      var source = null;
      var target = null;
      if (!(edges[i][1] instanceof Array)) {
        source = vertecies.get(edges[i][1]);
      }
      if (!(edges[i][2] instanceof Array)) {
        target = vertecies.get(edges[i][2]);
      }
      const edge = this.graph.insertEdge(this.graph.getDefaultParent(), null, edges[i][0], source, target);
      // if you remove the /1's below the positioning of the edge scales up by 10
      // we don't want any scaling, so there it shall stay
      // this sure is fun
      if (edges[i][1] instanceof Array) {
        edge.geometry.setTerminalPoint(new mx.mxPoint(edges[i][1][0] / 1, edges[i][1][1] / 1), true);
      }
      if (edges[i][2] instanceof Array) {
        edge.geometry.setTerminalPoint(new mx.mxPoint(edges[i][2][0] / 1, edges[i][2][1] / 1), false);
      }
      edge.relative = true;
    }
    this.graph.getModel().endUpdate();
    this.graph.refresh();
  }
}
