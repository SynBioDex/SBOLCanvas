/*
 * GlyphMenu
 *
 * A tile-view list of glyphs the user can use to add components to the graph.
 */

import {Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef, ViewEncapsulation} from '@angular/core';
import {GraphService} from '../graph.service';
import {GlyphService} from '../glyph.service';
import {DomSanitizer} from '@angular/platform-browser';
import {MetadataService} from '../metadata.service';

@Component({
  selector: 'app-glyph-menu',
  templateUrl: './glyph-menu.component.html',
  styleUrls: ['./glyph-menu.component.css']
})
export class GlyphMenuComponent implements OnInit, AfterViewInit {

  // object used as an enum to identify glyph types
  elementTypes = {
    BACKBONE: "Backbone",
    TEXT_BOX: "Text box",
    MODULE: "Module",
    SEQUENCE_FEATURE: "Sequence Feature",
    MOLECULAR_SPECIES: "Molecular Species",
    INTERACTION: "Interaction",
    INTERACTION_NODE: "Interaction Node",
  }

  @ViewChildren('canvasElement') canvasElements: QueryList<ElementRef>;

  public searchPhrase = '';

  public utilsDict = {};
  public sequenceFeatureDict = {};
  public interactionsDict = {};
  public interactionNodeDict={};
  public molecularSpeciesDict = {};

  public componentDefinitionMode = false;

  constructor(private graphService: GraphService, private glyphService: GlyphService, private sanitizer: DomSanitizer, private metadataService: MetadataService) {
  }

  onSequenceFeatureGlyphClicked(name: string) {
    this.graphService.addSequenceFeature(name);
  }

  onMolecularSpeciesGlyphClicked(name: string) {
    this.graphService.addMolecularSpecies(name);
  }

  onInteractionNodeGlyphClicked(name: string){
    //name = name.charAt(0).toUpperCase()+name.slice(1);
    this.graphService.addInteractionNode(name);
  }

  onInteractionGlyphClicked(name: string) {
    name = name.charAt(0).toUpperCase() + name.slice(1); // Capitalize first letter because bah humbug.
    this.graphService.addInteraction(name);
  }

  ngOnInit() {
    this.metadataService.componentDefinitionMode.subscribe(newSetting => this.componentDefinitionModeUpdated(newSetting));
    this.registerSvgElements();
  }

  ngAfterViewInit() {
    this.canvasElements.changes.subscribe(
      (next: QueryList<ElementRef>) => {
        this.registerDragsources();
      }
    );
    this.registerDragsources();
  }

  registerDragsources() {
    for (const element of this.canvasElements.toArray().filter(
      element => !(element.nativeElement.getAttribute('isDragsource') == 'true')
    ))
    {
      const elt = element.nativeElement;
      element.nativeElement.setAttribute('isDragsource', 'true');
      switch (elt.getAttribute('elementType')) {
        case this.elementTypes.BACKBONE:
          this.graphService.makeBackboneDragsource(elt);
          break;
        case this.elementTypes.TEXT_BOX:
          this.graphService.makeTextboxDragsource(elt);
          break;
        case this.elementTypes.MODULE:
          this.graphService.makeModuleDragsource(elt);
          break;
        case this.elementTypes.SEQUENCE_FEATURE:
          this.graphService.makeSequenceFeatureDragsource(elt, elt.getAttribute('glyphStyle'));
          break;
        case this.elementTypes.MOLECULAR_SPECIES:
          this.graphService.makeMolecularSpeciesDragsource(elt, elt.getAttribute('glyphStyle'));
          break;
        case this.elementTypes.INTERACTION:
          this.graphService.makeInteractionDragsource(elt, elt.getAttribute('glyphStyle'));
          break;
        case this.elementTypes.INTERACTION_NODE:
          this.graphService.makeInteractionNodeDragsource(elt, elt.getAttribute('glyphStyle'));
          break;
      }
    }


  }

  registerSvgElements() {
    const sequenceFeatureElts   = this.glyphService.getSequenceFeatureElements();
    const molecularSpeciesElts  = this.glyphService.getMolecularSpeciesElements();
    const interactionElts       = this.glyphService.getInteractionElements();
    const interactionNodeElts   = this.glyphService.getInteractionNodeElements();
    const utilElts              = this.glyphService.getUtilElements();

    for (const name in sequenceFeatureElts) {
      const svg = sequenceFeatureElts[name];

      this.sequenceFeatureDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }

    for (const name in utilElts) {
      const svg = utilElts[name];
      this.utilsDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }
    for (const name in molecularSpeciesElts) {
      if(name == "replacement-glyph") // Shouldn't be possible to add in canvas, only loaded
        continue;
      const svg = molecularSpeciesElts[name];
      this.molecularSpeciesDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }
    for (const name in interactionElts) {
      const svg = interactionElts[name];
      this.interactionsDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }
    for(const name in interactionNodeElts){
      if(name == "replacement-glyph") // Shouldn't be possible to add in canvas, only loaded
        continue;
      const svg = interactionNodeElts[name];
      this.interactionNodeDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }
  }

  addStrand() {
    this.graphService.addBackbone();
  }

  addTextBox() {
    this.graphService.addTextBox();
  }

  addModule(){
    this.graphService.addModule();
  }

  componentDefinitionModeUpdated(newSetting: boolean) {
    this.componentDefinitionMode = newSetting;
  }

  /**
   * Returns true if mainString contains searchString (case insensitive) false otherwise
   */
  stringMatches(mainString:string, searchString:string) {
    return mainString.toLowerCase().indexOf(searchString.toLowerCase()) !== -1;
  }

  keepOrder = (a, b) => {
    return a;
  }
  /**
   * Returns true if
   */
}
