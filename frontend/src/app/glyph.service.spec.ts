import { TestBed } from '@angular/core/testing';

import { GlyphService } from './glyph.service';

describe('GlyphService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: GlyphService = TestBed.get(GlyphService);
    expect(service).toBeTruthy();
  });
});
