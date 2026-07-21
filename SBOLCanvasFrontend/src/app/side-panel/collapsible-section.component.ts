import { Component, Input, OnInit } from '@angular/core';

let sectionSeq = 0;

/**
 * Boxed accordion section. Presentational: exposes title + open()/close()/toggle() so the parent
 * drives it via @ContentChildren. Displayed state is derived (see isCollapsed) from the user's
 * `collapsed` and the `searchMatch` lens rather than stored, so search and collapse-all can't desync.
 */
@Component({
  selector: 'app-collapsible-section',
  templateUrl: './collapsible-section.component.html',
  styleUrls: ['./collapsible-section.component.scss'],
})
export class CollapsibleSectionComponent implements OnInit {
  /** Heading text; also used by the shell for the rail-chip label and aria-label. */
  @Input() title = '';

  /** Initial collapsed state, applied once on init. Not a live binding. */
  @Input() initialCollapsed = false;

  /** Live search lens: `true` = match here, `false` = no match here, `null` = no active search. */
  @Input() searchMatch: boolean | null = null;

  collapsed = false;

  /** Stable ids wiring the heading button to its body region for ARIA. */
  readonly uid = `cs-${sectionSeq++}`;
  get headingId(): string {
    return `${this.uid}-heading`;
  }
  get bodyId(): string {
    return `${this.uid}-body`;
  }

  get isCollapsed(): boolean {
    return this.searchMatch === null ? this.collapsed : this.searchMatch === false;
  }

  ngOnInit(): void {
    this.collapsed = this.initialCollapsed;
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
  }

  open(): void {
    this.collapsed = false;
  }

  close(): void {
    this.collapsed = true;
  }
}
