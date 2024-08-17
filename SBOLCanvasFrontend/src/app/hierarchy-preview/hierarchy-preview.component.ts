import { Component, Input, OnInit } from '@angular/core'
import { GraphService } from '../graph.service'
import { GlyphService } from '../glyph.service';
import { DomSanitizer } from '@angular/platform-browser';
@Component({
    selector: 'app-hierarchy-preview',
    templateUrl: './hierarchy-preview.component.html',
    styleUrls: ['./hierarchy-preview.component.css']
})

export class HierarchyPreviewComponent   {
  
    
    constructor(private graphService: GraphService, private glyphService: GlyphService, private sanitizer : DomSanitizer) { }

    glyphName: string;
    selectedStack = [];
    selectedHTMLStack = [];
    
    getViewStack() {       
        this.glyphName = this.graphService.getSelectedGlyphName();
        this.selectedStack = this.graphService.getSelectedGlyphNameSet();
        this.selectedHTMLStack = this.graphService.getSelectedHTMLSet();

        return this.graphService.viewStack
    }

    switchView(depth) {
        let levels = this.graphService.viewStack.length - depth - 1
        
        for (let i = 0; i < levels; i++){
            this.graphService.exitGlyph()
        }
    }
}
