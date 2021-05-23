import { HttpClientModule } from '@angular/common/http';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../material.module';
import { SearchfilterPipe } from '../searchfilter.pipe';

import { GlyphMenuComponent } from './glyph-menu.component';

describe('GlyphMenuComponent', () => {
  let component: GlyphMenuComponent;
  let fixture: ComponentFixture<GlyphMenuComponent>;
  let inputElement: HTMLInputElement;

  async function setSearchValue(text: string){
    inputElement.value = text;
    inputElement.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, MaterialModule, HttpClientModule],
      declarations: [ GlyphMenuComponent, SearchfilterPipe]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GlyphMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    inputElement = fixture.nativeElement.querySelector('input[id=displayID]');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('filter works', () => {
    setSearchValue("promoter");
    // get all the draggable tiles
    let tiles = fixture.nativeElement.querySelectorAll('mat-grid-tile');
    // currently with the filter promoter it should only find one tile
    expect(tiles.length).toBe(1);
    // probably a good way to determine if it's actually the promoter, but for now I can't figure that out
  });
});
