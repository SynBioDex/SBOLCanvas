import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GlyphMenuComponent } from './glyph-menu.component';

describe('GlyphMenuComponent', () => {
  let component: GlyphMenuComponent;
  let fixture: ComponentFixture<GlyphMenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GlyphMenuComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GlyphMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
