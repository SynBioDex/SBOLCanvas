import {Injectable} from '@angular/core';
import {mxgraph} from 'mxgraph';
declare var require: any;

@Injectable({
  providedIn: 'root'
})
export class GraphService {


  graph: mxgraph.mxGraph;
  graphContainer: HTMLElement;
  glyphDragPreviewElt: HTMLElement;
  mx: any;

  constructor() {
    this.mx = require('mxgraph')({
      mxImageBasePath: 'mxgraph/images',
      mxBasePath: 'mxgraph'
    });

    this.graphContainer = document.createElement('div');
    this.graphContainer.id = 'graphContainer';

    this.graph = new this.mx.mxGraph(this.graphContainer);

    // Enables rubberband selection
    // tslint:disable-next-line:no-unused-expression
    new this.mx.mxRubberband(this.graph);

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
    const cell = new this.mx.mxCell('Test', new this.mx.mxGeometry(0, 0, 120, 40));
    cell.vertex = true;
    const cells = graph.importCells([cell], x, y, target);

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

    const ds: mxgraph.mxDragSource = this.mx.mxUtils.makeDraggable(elt, this.graph, this.insertGlyph, this.glyphDragPreviewElt);
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

}
