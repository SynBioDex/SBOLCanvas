
import {Component, OnInit, OnChanges, ViewChildren, QueryList, ElementRef, ViewEncapsulation, Input} from '@angular/core';
import {GraphService} from '../graph.service';
import {GlyphService} from '../glyph.service';
import {DomSanitizer} from '@angular/platform-browser';
import {MetadataService} from '../metadata.service';


@Component({
  selector: 'app-hierarchy-glyph-preview',
  templateUrl: './hierarchy-glyph-preview.component.html',
  styleUrl: './hierarchy-glyph-preview.component.css'
})
export class HierarchyGlyphPreviewComponent implements OnChanges, OnInit {
    constructor(private graphService: GraphService, private glyphService: GlyphService, private sanitizer: DomSanitizer) { }
    
    @Input() glyphName: string; 
    public sequenceFeatureDict = {};
    public svgHTML  : string;
    public glyphStack: string[] = [];

    ngOnInit(): void {
      if(this.graphService.onhierarchyOpen()) {
        this.registerSVGfirst();
      }
    }
    ngOnChanges(): void {
     
      if(this.graphService.onhierarchyOpen()) {
        console.log("updates!!!!", this.glyphName);
        this.svgHTML = "";
        this.registerSVGelements();
      }
    }

    showGlyph(){
      
        console.log("showing glyph", this.graphService.getSelectedGlyphName());
        this.graphService.addSequenceFeaturesNoBackBone(this.graphService.getSelectedGlyphName());
        //this.registerSVGelements();
    }

    registerSVGfirst(){
      const sequenceFeatureElts   = this.glyphService.getSequenceFeatureElements();
      let name = this.graphService.getSelectedGlyphName();
      const svg = sequenceFeatureElts[name];
      this.sequenceFeatureDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
      this.svgHTML = this.sequenceFeatureDict[name];
    }
    onHierarchyAgain(){
      return this.graphService.onhierarchyOpenAgain();
    }


    registerSVGelements(){
      this.svgHTML = "";
      const sequenceFeatureElts   = this.glyphService.getSequenceFeatureElements();
      let name = this.glyphName;
      const svg = sequenceFeatureElts[name];
      console.log("selected svg!!!!", name);
      
      this.sequenceFeatureDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
      console.log("selected svg dict!!", this.sequenceFeatureDict[name]);
      this.svgHTML = this.sequenceFeatureDict[name];
      console.log("svg image html", this.svgHTML);
      let selectedStack = this.graphService.getSelectedGlyphNameSet();
      // for(const selectedGlyphName in selectedStack){

      // }
      
    }

   
  
}
