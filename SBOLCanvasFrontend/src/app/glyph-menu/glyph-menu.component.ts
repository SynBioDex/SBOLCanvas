/*
 * GlyphMenu
 *
 * A tile-view list of glyphs the user can use to add components to the graph.
 */

import {Component, OnInit, AfterViewInit} from '@angular/core';
import {GraphService} from '../graph.service';
import {GlyphService} from '../glyph.service';
import {DomSanitizer} from '@angular/platform-browser';

@Component({
  selector: 'app-glyph-menu',
  templateUrl: './glyph-menu.component.html',
  styleUrls: ['./glyph-menu.component.css']
})
export class GlyphMenuComponent implements OnInit, AfterViewInit {

  public sequenceFeatureDict = {};
  public miscDict = {};

  constructor(private graphService: GraphService, private glyphService: GlyphService, private sanitizer: DomSanitizer) {
  }

  onSequenceFeatureGlyphClicked(name: string) {
    this.graphService.addSequenceFeatureGlyph(name);
  }

  onMolecularSpeciesGlyphClicked(name: string) {
    this.graphService.addMolecularSpeciesGlyph(name);
  }

  ngOnInit() {
    const sfElts = this.glyphService.getSequenceFeatureElements();
    const msElts = this.glyphService.getMolecularSpeciesElements();
    const iElts = this.glyphService.getInteractionElements();

    for (const name in sfElts) {
      const svg = sfElts[name];

      this.sequenceFeatureDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }

    // For now combine interactions and molecular species into the miscellaneous
    for (const name in msElts) {
      const svg = msElts[name];
      this.miscDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }
    for (const name in iElts) {
      const svg = iElts[name];
      this.miscDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }
  }

  ngAfterViewInit() {
  }

  addStrand() {
    this.graphService.addNewBackbone();
  }

  addTextBox() {
    this.graphService.addTextBox();
  }

  addInteraction() {
    this.graphService.addInteraction();
  }

}
