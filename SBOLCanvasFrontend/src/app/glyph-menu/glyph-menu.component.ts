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

  public glyphDict = {};

  constructor(private graphService: GraphService, private glyphService: GlyphService, private sanitizer: DomSanitizer) {
  }

  onGlyphClicked(name: string) {
    this.graphService.dropNewGlyph(name);
  }

  ngOnInit() {
    const svgElts = this.glyphService.getSvgElements();

    for (const name in svgElts) {
      const svg = svgElts[name];

      this.glyphDict[name] = this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML);
    }
  }

  ngAfterViewInit() {
  }

}
