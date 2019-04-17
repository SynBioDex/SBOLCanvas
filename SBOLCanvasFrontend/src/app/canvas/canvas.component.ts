import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GraphService } from '../graph.service';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css']
})
export class CanvasComponent implements OnInit {

  constructor(private graphService: GraphService) {}

  @ViewChild('canvasContainer') canvasContainer: ElementRef;

  ngOnInit() {
    const canvasContainer = this.canvasContainer.nativeElement;
    const graphContainer = this.graphService.getGraphDOM();
    canvasContainer.appendChild(graphContainer);
  }

  printGraph(){
    console.log(this.graphService.graphToString());
  }

  changeGraph(){
    this.graphService.stringToGraph('<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Loading" vertex="1" parent="1"><mxGeometry x="20" y="200" width="80" height="30" as="geometry"/></mxCell><mxCell id="3" value="Works!" vertex="1" parent="1"><mxGeometry x="200" y="150" width="80" height="30" as="geometry"/></mxCell><mxCell id="4" value="" edge="1" parent="1" source="2" target="3"><mxGeometry relative="1" as="geometry"/></mxCell></root></mxGraphModel>');
  }

}
