import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GraphService } from '../graph.service';
import { GlyphService } from '../glyph.service';
import { MetadataService } from '../metadata.service';
import { ELEMENT_TYPES } from './glyph-element-types';

type GlyphDict = { [name: string]: SafeHtml };

/** Glyph-palette data (sanitized SVG dicts) and add-to-canvas routing for HomeComponent. */
@Injectable()
export class GlyphPaletteService {
  readonly elementTypes = ELEMENT_TYPES;

  utilsDict: GlyphDict = {};
  sequenceFeatureDict: GlyphDict = {};
  molecularSpeciesDict: GlyphDict = {};
  interactionsDict: GlyphDict = {};
  interactionNodeDict: GlyphDict = {};

  /** Hides the molecule/interaction sections while editing a component definition. */
  componentDefinitionMode = false;

  constructor(
    private graphService: GraphService,
    private glyphService: GlyphService,
    private sanitizer: DomSanitizer,
    private metadataService: MetadataService,
  ) {
    this.metadataService.componentDefinitionMode.subscribe(
      (mode) => (this.componentDefinitionMode = mode),
    );
    this.buildDicts();
  }

  private buildDicts(): void {
    const seq = this.glyphService.getSequenceFeatureElements();
    const molecular = this.glyphService.getMolecularSpeciesElements();
    const interaction = this.glyphService.getInteractionElements();
    const interactionNode = this.glyphService.getInteractionNodeElements();
    const util = this.glyphService.getUtilElements();

    for (const name in seq) {
      this.sequenceFeatureDict[name] = this.sanitizer.bypassSecurityTrustHtml(seq[name].innerHTML);
    }
    for (const name in util) {
      this.utilsDict[name] = this.sanitizer.bypassSecurityTrustHtml(util[name].innerHTML);
    }
    for (const name in molecular) {
      if (name === 'replacement-glyph') continue; // load-only, not user-addable
      this.molecularSpeciesDict[name] = this.sanitizer.bypassSecurityTrustHtml(
        molecular[name].innerHTML,
      );
    }
    for (const name in interaction) {
      this.interactionsDict[name] = this.sanitizer.bypassSecurityTrustHtml(
        interaction[name].innerHTML,
      );
    }
    for (const name in interactionNode) {
      if (name === 'replacement-glyph') continue; // load-only, not user-addable
      this.interactionNodeDict[name] = this.sanitizer.bypassSecurityTrustHtml(
        interactionNode[name].innerHTML,
      );
    }
  }

  // ---- Add-to-canvas routing (click handlers) ----
  addSequenceFeature(name: string): void {
    this.graphService.addSequenceFeature(name);
  }

  addMolecularSpecies(name: string): void {
    this.graphService.addMolecularSpecies(name);
  }

  addInteraction(name: string): void {
    // Capitalize first letter to match the canvas's expected interaction style names.
    this.graphService.addInteraction(name.charAt(0).toUpperCase() + name.slice(1));
  }

  addInteractionNode(name: string): void {
    this.graphService.addInteractionNode(name);
  }

  // ---- Util tiles ----
  addBackbone(): void {
    this.graphService.addBackbone();
  }

  addTextBox(): void {
    this.graphService.addTextBox();
  }

  addModule(): void {
    this.graphService.addModule();
  }

  addEvent(): void {
    this.graphService.addEvent();
  }

  addCircularPlasmid(): void {
    this.graphService.addCircularPlasmid();
  }

  addChromosomalLocus(): void {
    this.graphService.addChromosomalLocus();
  }

  stringMatches(mainString: string, searchString: string): boolean {
    return mainString.toLowerCase().indexOf(searchString.toLowerCase()) !== -1;
  }

  /** Single source for util-tile search visibility. */
  private readonly utilSearchTerms = {
    backbone: 'backbone dna strand circuit',
    textBox: 'textbox text box',
    circularPlasmid: 'circular plasmid',
    chromosomalLocus: 'Chromosomal Locus',
    module: 'module definition',
    event: 'event simulation time',
  };

  utilTileVisible(tile: keyof typeof this.utilSearchTerms, searchPhrase: string): boolean {
    if ((tile === 'backbone' || tile === 'module') && this.componentDefinitionMode) {
      return false;
    }
    return this.stringMatches(this.utilSearchTerms[tile], searchPhrase);
  }

  /** Drives the Util section auto-expand. */
  utilHasMatch(searchPhrase: string): boolean {
    if (!searchPhrase) {
      return false;
    }
    return (Object.keys(this.utilSearchTerms) as Array<keyof typeof this.utilSearchTerms>).some(
      (tile) => this.utilTileVisible(tile, searchPhrase),
    );
  }
}
