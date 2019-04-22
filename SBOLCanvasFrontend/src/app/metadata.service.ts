import { Injectable } from '@angular/core';
import {GlyphInfo} from './glyphInfo';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MetadataService {

  // Glyph Info
  private glyphInfoSource = new BehaviorSubject(null);
  selectedGlyphInfo = this.glyphInfoSource.asObservable();

  // Color Info
  private colorSource = new BehaviorSubject(null);
  color = this.colorSource.asObservable();

  // TODO: DNA strand info

  constructor() { }

  setSelectedGlyphInfo(newInfo: GlyphInfo) {
    this.glyphInfoSource.next(newInfo);
  }

  setColor(newColor: string) {
    this.colorSource.next(newColor);
  }
}
