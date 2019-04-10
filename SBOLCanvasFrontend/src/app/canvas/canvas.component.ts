import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { GraphService } from '../graph.service';

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
  }

}
