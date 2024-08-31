import { Component } from '@angular/core'
import { GraphService } from '../graph.service'

import { DomSanitizer } from '@angular/platform-browser';
import { GlyphService } from '../glyph.service';
import { element } from 'protractor';

@Component({
    selector: 'app-hierarchy-preview',
    templateUrl: './hierarchy-preview.component.html',
    styleUrls: ['./hierarchy-preview.component.css']
})

export class HierarchyPreviewComponent {

    constructor(private graphService: GraphService, private glyphService: GlyphService, private sanitizer: DomSanitizer) { }


    glyphName: string;
    selectedStack = [];
    selectedHTMLStack = [];
    newLevelGlyph : string;
    sfDict = {};
    newLevelHTML: string;
    isModule: boolean;
    isComponent: boolean;

    selectedHTML : string;
    tempHTMLStack = [];
  
    getViewStack() {
        this.glyphName = this.graphService.getSelectedGlyphName();
        this.selectedStack = this.graphService.getSelectedGlyphNameSet();
        this.selectedHTMLStack = this.graphService.getSelectedHTMLSet();
        this.newLevelGlyph = this.graphService.clickedSequenceFeature;
        this.isModule = this.graphService.isModuleView();
       
        if(this.graphService.getChildrenLength()) {
            let name = 'Gen (Engineered Region)';
            this.newLevelHTML = this.graphService.registerSVG(name);
        } else if(this.newLevelGlyph){
            this.newLevelHTML = this.graphService.registerSVG(this.newLevelGlyph);
        } 
        if(this.isModule){
            this.newLevelHTML = "";
        }    
        this.selectedHTML = this.selectedHTMLStack[this.selectedHTMLStack.length-1];
        this.tempHTMLStack = this.graphService.tempHTMLStack;
      
        return this.graphService.viewStack
    }

    getTempStack(){
       this.getViewStack();

       return this.graphService.tempViewStack;
    }
    switchView(depth) {
        let levels = this.graphService.viewStack.length - depth - 1

        for (let i = 0; i < levels; i++){
            this.graphService.exitGlyph();
        }
    }
}
