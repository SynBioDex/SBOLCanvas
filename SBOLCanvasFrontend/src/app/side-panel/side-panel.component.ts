import {
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  ViewChild,
} from '@angular/core';
import { CollapsibleSectionComponent } from './collapsible-section.component';

let panelSeq = 0;

/** Largest allowed expanded width. */
const MAX_CAP = 520;
/** Smallest allowed expanded width (drag floor + aria-valuemin). */
const MIN_WIDTH = 200;
/** Collapsed rail width in px; must match $rail-width in the SCSS. */
const RAIL_WIDTH = 48;
/** Width transition duration (ms); kept in sync with the SCSS, used as the scroll fallback timeout. */
const TRANSITION_MS = 260;

/**
 * Shared collapsible/resizable side-panel shell, configured per sidebar (differs
 * only by showSearch + projected bodies). Width toggle animates in CSS, suppressed mid-drag by
 * the global body.panel-resizing class.
 */
@Component({
  selector: 'app-side-panel',
  templateUrl: './side-panel.component.html',
  styleUrls: ['./side-panel.component.scss'],
  exportAs: 'sidePanel',
})
export class SidePanelComponent implements OnInit, OnDestroy {
  @Input() side: 'left' | 'right' = 'left';
  @Input() panelName = '';
  @Input() showSearch = false;

  /** Initial rail/expanded state on load (session-scoped, not persisted). */
  @Input() initialCollapsed = true;

  @Output() searchPhraseChange = new EventEmitter<string>();

  @ContentChildren(CollapsibleSectionComponent)
  sections!: QueryList<CollapsibleSectionComponent>;

  @ViewChild('panelEl') panelEl?: ElementRef<HTMLElement>;
  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLElement>;

  collapsed = true;

  width = 280;

  /** Remembered last expanded (dragged) width, restored on toggle-expand. */
  lastExpandedWidth = 280;

  /** Instance alias of MIN_WIDTH for template bindings. */
  readonly minWidth = MIN_WIDTH;

  searchPhrase = '';

  readonly maxWidth = MAX_CAP;
  readonly uid = `sp-${panelSeq++}`;
  get scrollAreaId(): string {
    return `${this.uid}-scroll`;
  }

  private resizing = false;
  private pointerId = -1;
  private startX = 0;
  private startWidth = 0;
  private rafId = 0;

  ngOnInit(): void {
    this.collapsed = this.initialCollapsed;
  }

  ngOnDestroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  get sectionList(): CollapsibleSectionComponent[] {
    return this.sections ? this.sections.toArray() : [];
  }

  /** True when the search box is non-empty; disables the all-row, since search drives expansion then. */
  get searchActive(): boolean {
    return !!this.searchPhrase;
  }

  /** Current on-screen width of the panel (rail when collapsed); offsets the canvas widgets. */
  get outerWidth(): number {
    return this.collapsed ? RAIL_WIDTH : this.width;
  }

  // ---- Panel toggle ----
  togglePanel(): void {
    if (this.collapsed) {
      this.collapsed = false;
      this.width = this.lastExpandedWidth;
    } else {
      this.collapsed = true;
    }
  }

  // ---- Expand / collapse all sections ----
  expandAll(): void {
    this.sectionList.forEach((s) => s.open());
  }

  collapseAll(): void {
    this.sectionList.forEach((s) => s.close());
  }

  onSearchInput(value: string): void {
    this.searchPhrase = value;
    this.searchPhraseChange.emit(value);
  }

  // ---- Rail chip click ----
  onChipClick(section: CollapsibleSectionComponent): void {
    const wasCollapsed = this.collapsed;
    section.open();
    if (this.collapsed) {
      this.collapsed = false;
      this.width = this.lastExpandedWidth;
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (wasCollapsed && !reduce) {
      // Snap to the section once the expand width-transition finishes.
      this.scrollAfterExpand(section);
    } else {
      requestAnimationFrame(() => this.scrollToSection(section, reduce ? 'auto' : 'smooth'));
    }
  }

  /** Scroll to a section after the panel's width transition ends (with a fallback timer). */
  private scrollAfterExpand(section: CollapsibleSectionComponent): void {
    const panel = this.panelEl?.nativeElement;
    if (!panel) {
      requestAnimationFrame(() => this.scrollToSection(section, 'auto'));
      return;
    }
    let done = false;
    let fallback = 0;
    const finish = () => {
      if (done) {
        return;
      }
      done = true;
      panel.removeEventListener('transitionend', onEnd);
      clearTimeout(fallback);
      this.scrollToSection(section, 'auto');
    };
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName === 'width') {
        finish();
      }
    };
    panel.addEventListener('transitionend', onEnd);
    // Fallback if transitionend never fires (e.g. width didn't change, or transition suppressed).
    fallback = window.setTimeout(finish, TRANSITION_MS + 50);
  }

  private scrollToSection(
    section: CollapsibleSectionComponent,
    behavior: ScrollBehavior,
  ): void {
    const area = this.scrollArea?.nativeElement;
    const el = area?.querySelector<HTMLElement>(`#${section.headingId}`);
    if (area && el) {
      area.scrollTo({ top: el.offsetTop - area.offsetTop, behavior });
    }
  }

  // ---- Resize grabber (pointer events; never animated) ----
  onGrabberPointerDown(event: PointerEvent): void {
    const target = event.target as HTMLElement;
    target.setPointerCapture(event.pointerId);
    this.resizing = true;
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startWidth = this.width;
    document.body.classList.add('panel-resizing');
    event.preventDefault();
  }

  onGrabberPointerMove(event: PointerEvent): void {
    if (!this.resizing || event.pointerId !== this.pointerId) {
      return;
    }
    const delta = event.clientX - this.startX;
    const raw = this.side === 'left' ? this.startWidth + delta : this.startWidth - delta;
    const clamped = this.clampWidth(raw);
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
    this.rafId = requestAnimationFrame(() => {
      this.width = clamped;
      this.rafId = 0;
    });
  }

  onGrabberPointerUp(event: PointerEvent): void {
    if (!this.resizing) {
      return;
    }
    this.resizing = false;
    try {
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    } catch {
      /* capture may already be released */
    }
    document.body.classList.remove('panel-resizing');
    this.lastExpandedWidth = this.width;
  }

  private clampWidth(raw: number): number {
    return Math.min(Math.max(raw, this.minWidth), MAX_CAP);
  }
}
