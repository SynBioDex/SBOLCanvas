import { Component, ViewChild  } from '@angular/core'
import { GraphService } from '../graph.service'
import { MatTooltip } from '@angular/material/tooltip';


@Component({
    selector: 'app-zoom-controls',
    templateUrl: './zoom-controls.component.html',
    styleUrls: ['./zoom-controls.component.css']
})

export class ZoomControlsComponent {
    @ViewChild("tooltip") tooltip: MatTooltip
    constructor(public graphService: GraphService) { }

    zoomSliderChanged($event) {
        this.graphService.setZoom($event.value / 100);
    }
    
    zoomInputChanged($event) {
        let number = parseInt($event.target.value);
        if (!isNaN(number)) {
            const percent = number / 100;
            this.graphService.setZoom(percent);
        }
        // if they entered nonsense the zoom doesn't change, which
        // means angular won't refresh the input box on its own
        $event.target.value = this.getZoomDisplayValue();
    }
    
    getZoomSliderValue() {
        return this.graphService.getZoom() * 100;
    }

    getZoomDisplayValue() {
        const maxZoom = 4
        let percent = Math.min(this.graphService.getZoom(), maxZoom) * 100;
        let string = percent.toFixed(0);
        return string.toString() + '%';
    }

    displayTooltip(){
        this.tooltip.show()
        setTimeout(() => {
          this.tooltip.hide()
        }, 2000);
    }
}
