import {Injectable} from '@angular/core';
//import {mxGraph, mxDragSource, mxCodec} from '../mxgraph';
import * as mxGraph from 'mxgraph';
import * as mxDragSource from 'mxgraph';

declare var require: any;
const mx = require('mxgraph')({
  mxImageBasePath: 'mxgraph/images',
  mxBasePath: 'mxgraph'
});

@Injectable({
  providedIn: 'root'
})
export class GraphService {

  graph: mxGraph;
  graphContainer: HTMLElement;
  glyphDragPreviewElt: HTMLElement;

  constructor() {

    this.graphContainer = document.createElement('div');
    this.graphContainer.id = 'graphContainer';

    this.graph = new mx.mxGraph(this.graphContainer);

    // Enables rubberband selection
    // tslint:disable-next-line:no-unused-expression
    new mx.mxRubberband(this.graph);

    // A dummy element used for previewing glyphs as they are dragged onto the graph
    this.glyphDragPreviewElt = document.createElement('div');
    this.glyphDragPreviewElt.style.border = 'dashed black 1px';
    this.glyphDragPreviewElt.style.width = '120px';
    this.glyphDragPreviewElt.style.height = '40px';

    const parent = this.graph.getDefaultParent();
    this.graph.getModel().beginUpdate();
    try {
      const v1 = this.graph.insertVertex(parent, null, 'Canvas,', 20, 20, 80, 30);
      const v2 = this.graph.insertVertex(parent, null, 'Works!', 200, 150, 80, 30);
      this.graph.insertEdge(parent, null, '', v1, v2);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Returns the <div> that this graph displays to
   */
  getGraphDOM() {
    return this.graphContainer;
  }

  insertGlyph(graph, evt, target, x, y) {
    const cell = new mx.mxCell('Test', new mx.mxGeometry(0, 0, 120, 40));
    cell.vertex = true;
    const cells = graph.importCells([cell], x, y, target);
    console.log(target);

    if (cells != null && cells.length > 0) {
      graph.scrollCellToVisible(cells[0], false);
      graph.setSelectionCells(cells);
    }
  }

  createGlyphDragSource() {
    const elt = document.createElement('p');
    elt.innerHTML = 'Drag me';
    elt.style.width = '48px';
    elt.style.height = '48px';
    elt.style.backgroundColor = 'red';

    const ds: mxDragSource = mx.mxUtils.makeDraggable(elt, this.graph, this.insertGlyph, this.glyphDragPreviewElt);
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
    while (elt != null){
      if(elt.attributes.getNamedItem("value") == null){
        elt = elt.nextSibling;
        continue;
      }
      var id = elt.attributes.getNamedItem("id").value;
      var value = elt.attributes.getNamedItem("value").value;
      if(elt.attributes.getNamedItem("vertex") != null){
        var geo = elt.firstChild;
        var x = geo.attributes.getNamedItem("x").value;
        var y = geo.attributes.getNamedItem("y").value;
        var width = geo.attributes.getNamedItem("width").value;
        var height = geo.attributes.getNamedItem("height").value;
        vertecies.set(id, this.graph.insertVertex(this.graph.getDefaultParent(), null, value, x, y, width, height));
      }else if(elt.attributes.getNamedItem("edge") != null){
        var geo = null;
        var source = null;
        if(elt.attributes.getNamedItem("source") != null){
          source = elt.attributes.getNamedItem("source").value;
        }else{
          geo = elt.firstChild.firstChild;
          var x = geo.attributes.getNamedItem("x").value;
          var y = geo.attributes.getNamedItem("y").value;
          source = [x,y];
        }
        var target = null;
        if(elt.attributes.getNamedItem("target") != null){
          target = elt.attributes.getNamedItem("target").value;
        }else{
          if(geo == null){
            geo = elt.firstChild.firstChild;
          }else{
            geo = geo.nextSibling;
          }
          var x = geo.attributes.getNamedItem("x").value;
          var y = geo.attributes.getNamedItem("y").value;
          target = [x,y];
        }
        edges.push([value, source, target]);
      }
      elt = elt.nextSibling;
    }
    // edges have to have their source and target set after all the vertecies have been read in
    for(var i = 0; i < edges.length; i++){
      var source = null;
      var target = null;
      if(!(edges[i][1] instanceof Array))
        source = vertecies.get(edges[i][1]);
      if(!(edges[i][2] instanceof Array))
        target = vertecies.get(edges[i][2]);
      const edge = this.graph.insertEdge(this.graph.getDefaultParent(), null, edges[i][0], source, target);
      // if you remove the /1's below the positioning of the edge scales up by 10
      // we don't want any scaling, so there it shall stay
      // this sure is fun
      if(edges[i][1] instanceof Array)
        edge.geometry.setTerminalPoint(new mx.mxPoint(edges[i][1][0]/1, edges[i][1][1]/1), true);
      if(edges[i][2] instanceof Array)
        edge.geometry.setTerminalPoint(new mx.mxPoint(edges[i][2][0]/1, edges[i][2][1]/1), false);
      edge.relative = true;
    }
    this.graph.getModel().endUpdate();
    this.graph.refresh();
  }

}
