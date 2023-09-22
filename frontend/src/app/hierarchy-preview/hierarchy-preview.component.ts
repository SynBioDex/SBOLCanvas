import { Component } from '@angular/core'
import { GraphService } from '../graph.service'


@Component({
    standalone: true,
    selector: 'app-hierarchy-preview',
    templateUrl: './hierarchy-preview.component.html',
    styleUrls: ['./hierarchy-preview.component.css']
})

export class HierarchyPreviewComponent {

    constructor(private graphService: GraphService) { }

    getViewStack() {
        // console.log(this.glyphMenu.sequenceFeatureDict)
        return this.graphService.viewStack
    }

    switchView(depth) {
        let levels = this.graphService.viewStack.length - depth - 1

        for (let i = 0; i < levels; i++)
            this.graphService.exitGlyph()
    }
}
