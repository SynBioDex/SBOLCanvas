import { Component, ElementRef, OnInit, ViewChild, HostListener, Input, OnChanges, SimpleChanges } from '@angular/core';
import { GraphService } from '../graph.service';

@Component({
    selector: 'app-canvas',
    templateUrl: './canvas.component.html',
    styleUrls: ['./canvas.component.css']
})
export class CanvasComponent implements OnInit, OnChanges {

    constructor(
        private graphService: GraphService
    ) { }
    
    @ViewChild('canvasContainer', {static: true}) canvasContainer: ElementRef;

    ngOnInit() {
        const canvasContainer = this.canvasContainer.nativeElement;
        const svg = this.graphService.getGraphDOM();
        canvasContainer.appendChild(svg);
    }
    ngOnChanges(): void {
        
    }

    @HostListener('wheel', ['$event']) onMouseWheel(event: WheelEvent) {
        const zoomCoef = -1 / 1000,
            minZoom = 0.1,
            maxZoom = 4;

        // calculate new zoom value
        let newZoom = this.graphService.getZoom() + zoomCoef * event.deltaY;

        // clip illegal cases
        newZoom = Math.max(minZoom, newZoom);
        newZoom = Math.min(maxZoom, newZoom);

        // set the zoom
        this.graphService.setZoom(newZoom);
    }
 
}
