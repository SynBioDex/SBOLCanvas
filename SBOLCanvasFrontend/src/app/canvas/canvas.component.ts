import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GraphService } from '../graph.service';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css']
})
export class CanvasComponent implements OnInit {

  lastGraph: string;
  constructor(private graphService: GraphService) {}

  @ViewChild('canvasContainer') canvasContainer: ElementRef;

  ngOnInit() {
    const canvasContainer = this.canvasContainer.nativeElement;
    const graphContainer = this.graphService.getGraphDOM();
    canvasContainer.appendChild(graphContainer);
  }

}
