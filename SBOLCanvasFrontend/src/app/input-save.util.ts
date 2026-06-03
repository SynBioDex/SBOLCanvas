import { ElementRef } from '@angular/core';

// Commits focused input changes before mxGraph's canvas mousedown rebinds
export function registerInputSave(host: ElementRef): () => void {
  const listener = (event: MouseEvent) => {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return;
    const tag = active.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;
    if (!host.nativeElement.contains(active)) return;
    const target = event.target as HTMLElement | null;
    if (active === target || (target && active.contains(target))) return;
    active.blur();
  };
  document.addEventListener('mousedown', listener, true);
  return () => document.removeEventListener('mousedown', listener, true);
}
