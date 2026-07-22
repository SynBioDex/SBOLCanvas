import { Component, Input } from '@angular/core';
import { GlyphPaletteService } from './glyph-palette.service';

/** The "Util" section body; tile data and add-routing come from GlyphPaletteService. */
@Component({
  selector: 'app-util-glyph-grid',
  templateUrl: './util-glyph-grid.component.html',
  styleUrls: ['./glyph-grid.component.scss'],
})
export class UtilGlyphGridComponent {
  @Input() searchPhrase = '';

  constructor(public palette: GlyphPaletteService) {}
}
