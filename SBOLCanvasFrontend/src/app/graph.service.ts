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
    console.log(this.graphContainer);
    console.log(this.graph.getModel().cells);
    return xml;
  }

  stringToGraph(graphString: string){
    var model = this.graph.model;
    var doc = mx.mxUtils.parseXml(graphString);
    var codec = new mx.mxCodec(doc);
    this.graph.getModel().clear();
    //this.graph = new mx.mxGraph(this.graphContainer);
    var elt = doc.documentElement.firstChild.firstChild;
    
    var cells = [];
    //this.graph.getModel().beginUpdate();
    while (elt != null){
      var cell = codec.decodeCell(elt);
      if(cell.value != null)
        cells.push(codec.decodeCell(elt));
      //this.graph.addCell(codec.decodeCell(elt));
      //this.graph.refresh();
      elt = elt.nextSibling;
    }
    console.log(cells);
    this.graph.addCells(cells);
    //this.graph.importCells(cells, 0,0,null);
    console.log(this.graphContainer);
    //this.graph.getModel().endUpdate();
    //console.log(this.graph.getModel());
  }

}
