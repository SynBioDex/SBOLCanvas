import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';

/**
 * One category's flex-wrap grid of draggable glyph tiles. Presentational; drag
 * registration lives in the appGlyphDragsources directive on the container.
 */
@Component({
  selector: 'app-glyph-grid',
  templateUrl: './glyph-grid.component.html',
  styleUrls: ['./glyph-grid.component.scss'],
})
export class GlyphGridComponent {
  /** Sanitized SVG markup keyed by glyph style name. */
  @Input() glyphs: { [name: string]: SafeHtml } = {};

  /** elementType written on every tile in this grid (drives drag-source dispatch). */
  @Input() elementType = '';

  @Input() searchPhrase = '';

  @Output() glyphClicked = new EventEmitter<string>();

  /** Preserve glyphService insertion order through the keyvalue pipe. */
  keepOrder = (): number => 0;

  /** Stable identity per tile. Every glyph stays in the DOM permanently (search hides via
   *  [hidden], never removes), so the isDragsource mark survives and tiles register once. */
  trackByKey = (_: number, pair: { key: string }): string => pair.key;

  matches(key: string): boolean {
    return key.toLowerCase().indexOf(this.searchPhrase.toLowerCase()) !== -1;
  }
}
