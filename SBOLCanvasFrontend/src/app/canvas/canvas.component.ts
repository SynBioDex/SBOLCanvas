import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {GraphService} from '../graph.service';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css']
})
export class CanvasComponent implements OnInit {

  constructor(private graphService: GraphService) { }

  @ViewChild('canvasContainer') canvasContainer: ElementRef;

  ngOnInit() {
    const container = this.canvasContainer.nativeElement;

    this.graphService.constructGraph(container);
    // const graph = new mxGraph(this.canvasContainer.nativeElement);
    // const parent = graph.getDefaultParent();
    //
    // graph.getModel().beginUpdate();
    // try {
    //   const v1 = graph.insertVertex(parent, null, 'Canvas,', 20, 20, 80, 30);
    //   const v2 = graph.insertVertex(parent, null, 'Works!', 200, 150, 80, 30);
    //   graph.insertEdge(parent, null, '', v1, v2);
    // } finally {
    //   graph.getModel().endUpdate();
    // }
  }

}
