import {Component, HostListener, OnInit} from '@angular/core';
import {ComponentCanDeactivate} from '../pending-changes.guard';
import {Title, SafeHtml} from "@angular/platform-browser";
import { EmbeddedService } from '../embedded.service';
import { GlyphPaletteService } from '../glyph-menu/glyph-palette.service';

/** One dict-driven glyph palette section, rendered by the left panel's *ngFor. */
interface GlyphSection {
  title: string;
  glyphs: { [name: string]: SafeHtml };
  elementType: string;
  add: (key: string) => void;
  /** False for sections hidden while editing a component definition. */
  alwaysShown: boolean;
}

@Component({
  selector: 'app-sbol-canvas',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, ComponentCanDeactivate {

  /** Live search text from the left panel's search field, forwarded to the glyph grids. */
  glyphSearch = '';

  /** The dict-driven glyph sections (the Util section is hand-wired instead, see UtilGlyphGrid). */
  glyphSections: GlyphSection[] = [];

  constructor(private titleService: Title, private embeddedService: EmbeddedService, public palette: GlyphPaletteService) {
    this.titleService.setTitle('SBOLCanvas');
  }

  ngOnInit() {
    const p = this.palette;
    this.glyphSections = [
      { title: 'Sequence Feature', glyphs: p.sequenceFeatureDict, elementType: p.elementTypes.SEQUENCE_FEATURE, add: (k) => p.addSequenceFeature(k), alwaysShown: true },
      { title: 'Molecular Species', glyphs: p.molecularSpeciesDict, elementType: p.elementTypes.MOLECULAR_SPECIES, add: (k) => p.addMolecularSpecies(k), alwaysShown: false },
      { title: 'Interactions', glyphs: p.interactionsDict, elementType: p.elementTypes.INTERACTION, add: (k) => p.addInteraction(k), alwaysShown: false },
      { title: 'Interaction Nodes', glyphs: p.interactionNodeDict, elementType: p.elementTypes.INTERACTION_NODE, add: (k) => p.addInteractionNode(k), alwaysShown: false },
    ];
  }

  /** Drives section auto-expand during search. */
  sectionHasMatch(section: GlyphSection): boolean {
    if (!this.glyphSearch) {
      return false;
    }
    const phrase = this.glyphSearch.toLowerCase();
    return Object.keys(section.glyphs).some((name) => name.toLowerCase().indexOf(phrase) !== -1);
  }

  // @HostListener allows us to also guard against browser refresh, close, etc.
  @HostListener('window:beforeunload')
  canDeactivate(): boolean {
    // insert logic to check if there are pending changes here;
    // returning true will navigate without confirmation
    // returning false will show a confirm dialog before navigating away
    return this.embeddedService.isAppEmbedded();
  }
}
