import { Component } from '@angular/core'
import { GraphService } from '../graph.service'
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import {FormsModule} from '@angular/forms'
import {RouterModule } from '@angular/router';
@Component({
    standalone:true,
    selector: 'app-zoom-controls',
    templateUrl: './zoom-controls.component.html',
    styleUrls: ['./zoom-controls.component.css'],
    imports: [MatIconModule, MatFormFieldModule,MatSliderModule, MatTooltipModule, FormsModule, RouterModule]
})

export class ZoomControlsComponent {

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
        let percent = this.graphService.getZoom() * 100;
        let string = percent.toFixed(0);
        return string.toString() + '%';
    }
}
