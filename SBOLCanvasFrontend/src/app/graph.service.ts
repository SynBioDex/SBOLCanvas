import {Injectable} from '@angular/core';
import {mxgraph} from 'mxgraph';
declare var require: any;


@Injectable({
  providedIn: 'root'
})
export class GraphService {


  graph: mxgraph.mxGraph;
  graphContainer: HTMLElement;
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

    // const parent = this.graph.getDefaultParent();
    // this.graph.getModel().beginUpdate();
    // try {
    //   const v1 = this.graph.insertVertex(parent, null, 'Canvas,', 20, 20, 80, 30);
    //   const v2 = this.graph.insertVertex(parent, null, 'Works!', 200, 150, 80, 30);
    //   this.graph.insertEdge(parent, null, '', v1, v2);
    // } finally {
    //   this.graph.getModel().endUpdate();
    // }
  }

  /**
   * Returns the <div> that this graph displays to
   */
  getGraphDOM() {
    return this.graphContainer;
  }

  // noinspection JSUnusedGlobalSymbols
  /**
   * Returns the mxGraph object. This is meant for temporary testing - any permanent code should not rely on this.
   */
  getGraph() {
    return this.graph;
  }

}
