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

  onGlyphClicked(name: string) {
    this.graphService.dropNewGlyph(name);
  }

  ngOnInit() {
    const sfElts = this.glyphService.getSequenceFeatureElements();
    const miscElts = this.glyphService.getMolecularSpecieElements();

    for (const name in sfElts) {
      const svg = sfElts[name];

      this.sequenceFeatureDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }

    for (const name in miscElts) {
      const svg = miscElts[name];
      this.miscDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }
  }

  ngAfterViewInit() {
  }

}
