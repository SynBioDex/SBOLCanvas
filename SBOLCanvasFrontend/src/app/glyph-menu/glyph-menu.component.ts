import { Component, OnInit } from '@angular/core';
import { GraphService } from '../graph.service';

@Component({
  selector: 'app-glyph-menu',
  templateUrl: './glyph-menu.component.html',
  styleUrls: ['./glyph-menu.component.css']
})
export class GlyphMenuComponent implements OnInit {

  constructor(private graphService: GraphService) { }

  ngOnInit() {
    const graph = this.graphService.getGraph();
    const parent = graph.getDefaultParent();

    graph.getModel().beginUpdate();
    try {
      const v1 = graph.insertVertex(parent, null, 'GlyphMenu,', 20, 60, 80, 30);
      const v2 = graph.insertVertex(parent, null, 'Works!', 200, 190, 80, 30);
      graph.insertEdge(parent, null, '', v1, v2);
      graph.refresh(v1);
    } finally {
      graph.getModel().endUpdate();
    }
  }

}
