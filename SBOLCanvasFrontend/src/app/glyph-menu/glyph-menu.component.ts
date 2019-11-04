/*
 * GlyphMenu
 *
 * A tile-view list of glyphs the user can use to add components to the graph.
 */

import {Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef} from '@angular/core';
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

  @ViewChildren('sequenceFeatureElement') sequenceFeatureElements: QueryList<ElementRef>;

  public utilsDict = {};
  public sequenceFeatureDict = {};
  public interactionsDict = {};
  public miscDict = {};

  public componentDefinitionMode = false;

  constructor(private graphService: GraphService, private glyphService: GlyphService, private sanitizer: DomSanitizer, private metadataService: MetadataService) {
  }

  onSequenceFeatureGlyphClicked(name: string) {
    this.graphService.addSequenceFeature(name);
  }

  onMolecularSpeciesGlyphClicked(name: string) {
    this.graphService.addMolecularSpecies(name);
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
    for (const element of this.sequenceFeatureElements.toArray()) {
      this.graphService.makeSequenceFeatureDragsource(element.nativeElement, element.nativeElement.getAttribute('glyphStyle'));
    }
  }

  registerSvgElements() {
    const sequenceFeatureElts   = this.glyphService.getSequenceFeatureElements();
    const molecularSpeciesElts  = this.glyphService.getMolecularSpeciesElements();
    const interactionElts       = this.glyphService.getInteractionElements();
    const utilElts              = this.glyphService.getUtilElements();

    for (const name in sequenceFeatureElts) {
      const svg = sequenceFeatureElts[name];

      this.sequenceFeatureDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }

    for (const name in utilElts) {
      const svg = utilElts[name];
      this.utilsDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }
    // For now combine interactions and molecular species into the miscellaneous
    for (const name in molecularSpeciesElts) {
      const svg = molecularSpeciesElts[name];
      this.miscDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }
    for (const name in interactionElts) {
      const svg = interactionElts[name];
      this.interactionsDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }
  }

  addStrand() {
    this.graphService.addNewBackbone();
  }

  addTextBox() {
    this.graphService.addTextBox();
  }

  componentDefinitionModeUpdated(newSetting: boolean) {
    this.componentDefinitionMode = newSetting;
  }
}
