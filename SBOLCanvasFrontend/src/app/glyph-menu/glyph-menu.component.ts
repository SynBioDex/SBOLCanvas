/*
 * GlyphMenu
 *
 * A tile-view list of glyphs the user can use to add components to the graph.
 */

import {Component, OnInit, AfterViewInit, ElementRef, ViewChildren} from '@angular/core';
import {GraphService} from '../graph.service';
import {GlyphService} from '../glyph.service';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

@Component({
  selector: 'app-glyph-menu',
  templateUrl: './glyph-menu.component.html',
  styleUrls: ['./glyph-menu.component.css']
})
export class GlyphMenuComponent implements OnInit, AfterViewInit {

  @ViewChildren('glyphSvg')
  container: ElementRef;

  public glyphPics: SafeHtml[] = [];

  constructor(private graphService: GraphService, private glyphService: GlyphService, private sanitizer: DomSanitizer) {
    let svg = this.glyphService.getSvg();
    this.glyphPics.push(this.sanitizer.bypassSecurityTrustHtml(svg.innerHTML));
  }

  onGlyphClicked(event: any) {
    this.graphService.dropNewGlyph('promoter');
  }

  ngOnInit() {

  }

  ngAfterViewInit() {
  }

}
