import { Injectable } from '@angular/core';
import { mxGraph } from 'mxGraphTypes';

@Injectable({
  providedIn: 'root'
})
export class GraphService {

  constructor() { }

  constructGraph(container) {
    const graph = new mxGraph(container);

    const parent = graph.getDefaultParent();

    graph.getModel().beginUpdate();
    try {
      const v1 = graph.insertVertex(parent, null, 'Canvas,', 20, 20, 80, 30);
      const v2 = graph.insertVertex(parent, null, 'Works!', 200, 150, 80, 30);
      graph.insertEdge(parent, null, '', v1, v2);
    } finally {
      graph.getModel().endUpdate();
    }
  }
}
