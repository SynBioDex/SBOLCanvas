import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { GraphService } from '../graph.service';
import {GlyphInfo} from '../glyphInfo';
import {MetadataService} from '../metadata.service';

@Component({
  selector: 'app-canvas',
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.css']
})
export class CanvasComponent implements OnInit {

  currentColor: string;

  constructor(
    private graphService: GraphService,
    private metadataService: MetadataService
  ) {}

  @ViewChild('canvasContainer') canvasContainer: ElementRef;

  ngOnInit() {
    const canvasContainer = this.canvasContainer.nativeElement;
    const graphContainer = this.graphService.getGraphDOM();
    canvasContainer.appendChild(graphContainer);
  }

  @Input()
  set color(color: string) {
    console.log('updating color');
    this.currentColor = color;
  }
}
