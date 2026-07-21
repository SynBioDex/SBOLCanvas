import { AfterViewInit, Directive, ElementRef, OnDestroy } from '@angular/core';
import { GraphService } from '../graph.service';
import { ELEMENT_TYPES } from './glyph-element-types';

/** Registers each glyph svg as an mxGraph drag source. Hidden (0-width) elements are left
 *  unmarked so they re-register when visible to prevent the drag offset freezing at (0,0). */
function registerDragsources(elements: SVGElement[], graph: GraphService): void {
  for (const elt of elements) {
    if (elt.getAttribute('isDragsource') === 'true') {
      continue;
    }
    if (elt.getBoundingClientRect().width === 0) {
      // Hidden: do NOT mark -- retry when visible.
      continue;
    }
    const style = elt.getAttribute('glyphStyle');
    switch (elt.getAttribute('elementType')) {
      case ELEMENT_TYPES.BACKBONE:
        graph.makeBackboneDragsource(elt);
        break;
      case ELEMENT_TYPES.TEXT_BOX:
        graph.makeTextboxDragsource(elt);
        break;
      case ELEMENT_TYPES.MODULE:
        graph.makeModuleDragsource(elt);
        break;
      case ELEMENT_TYPES.EVENT:
        graph.makeEventDragsource(elt);
        break;
      case ELEMENT_TYPES.SEQUENCE_FEATURE:
        graph.makeSequenceFeatureDragsource(elt, style);
        break;
      case ELEMENT_TYPES.MOLECULAR_SPECIES:
        graph.makeMolecularSpeciesDragsource(elt, style);
        break;
      case ELEMENT_TYPES.INTERACTION:
        graph.makeInteractionDragsource(elt, style);
        break;
      case ELEMENT_TYPES.INTERACTION_NODE:
        graph.makeInteractionNodeDragsource(elt, style);
        break;
      default:
        // Unknown type -- don't mark.
        continue;
    }
    elt.setAttribute('isDragsource', 'true');
  }
}

/** Registers a grid's glyph svgs as drag sources on first reveal, when sizes are real (not 0x0).
 *  Tiles are only hidden, never removed, so one IntersectionObserver suffices; it short-circuits
 *  once all are registered. */
@Directive({
  selector: '[appGlyphDragsources]',
})
export class GlyphDragsourcesDirective implements AfterViewInit, OnDestroy {
  private intersectionObserver?: IntersectionObserver;
  private fullyRegistered = false;

  constructor(
    private el: ElementRef<HTMLElement>,
    private graphService: GraphService,
  ) { }

  ngAfterViewInit(): void {
    this.intersectionObserver = new IntersectionObserver((entries) => {
      if (!this.fullyRegistered && entries.some((e) => e.isIntersecting)) {
        this.register();
      }
    });
    this.intersectionObserver.observe(this.el.nativeElement);
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
  }

  private register(): void {
    const svgs = Array.from(this.el.nativeElement.querySelectorAll('svg')) as SVGElement[];
    registerDragsources(svgs, this.graphService);
    this.fullyRegistered = svgs.every((s) => s.getAttribute('isDragsource') === 'true');
  }
}
