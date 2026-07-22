import {Component, HostListener, OnInit, ViewChild} from '@angular/core';
import {GlyphInfo} from '../glyphInfo';
import {GraphService} from "../graph.service";
import { ToolbarComponent } from "../toolbar/toolbar.component";
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

export enum KEY_CODE {
  DELETE = "Delete",
  BACKSPACE = "Backspace",
  UNDO = "Undo",
  REDO = "Redo",
  COPY = "Copy",
  PASTE = "Paste"
}

@Component({
  selector: 'app-sbol-canvas',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, ComponentCanDeactivate {

  @ViewChild(ToolbarComponent) toolbar

  /** Live search text from the left panel's search field, forwarded to the glyph grids. */
  glyphSearch = '';

  /** The dict-driven glyph sections (the Util section is hand-wired instead, see UtilGlyphGrid). */
  glyphSections: GlyphSection[] = [];

  constructor(private graphService: GraphService, private titleService: Title, private embeddedService: EmbeddedService, public palette: GlyphPaletteService) {
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
  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    console.debug(event);
    this.handleEvent(event, event.code);
  }

  @HostListener('window:keydown.control.z', ['$event'])
  onControlZHandler(event: KeyboardEvent) {
    console.debug('Undo');
    console.debug(event);
    this.handleEvent(event, KEY_CODE.UNDO);
  }

  @HostListener('window:keydown.control.shift.z', ['$event'])
  onShiftControlZHandler(event: KeyboardEvent) {
    console.debug('Redo');
    this.handleEvent(event, KEY_CODE.REDO);
  }

  @HostListener('window:keydown.control.c', ['$event'])
  onControlCHandler(event: KeyboardEvent) {
    console.debug('Copy');
    this.handleEvent(event, KEY_CODE.COPY);
  }
  @HostListener('window:keydown.control.v', ['$event'])
  onControlVHandler(event: KeyboardEvent) {
    console.debug('Paste');
    this.handleEvent(event, KEY_CODE.PASTE);
  }

  handleEvent(event: KeyboardEvent, code: string) {

    const target = event.target as HTMLElement;

    // If we are not an input field or text area, then we are safe to assume the user is trying to do
    // stuff to the graph.
    if ((target == null || (target.tagName != "INPUT" && target.tagName != "TEXTAREA" && target.tagName != "DIV")) && !this.toolbar.popupOpen) {
      // prevent default actions on keypresses using preventDefault()


      if (code === KEY_CODE.DELETE || code === KEY_CODE.BACKSPACE) {
        this.graphService.delete();
      }
      else if (code == KEY_CODE.UNDO) {
        this.graphService.undo();
      }
      else if (code == KEY_CODE.REDO) {
        this.graphService.redo();
      }
      else if (code == KEY_CODE.COPY) {
        this.graphService.copy();
      }
      else if (code == KEY_CODE.PASTE) {
        this.graphService.paste();
      }
    }
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
