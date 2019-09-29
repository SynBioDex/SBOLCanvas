import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DesignMenuComponent } from './design-menu.component';

describe('ColorPaletteComponent', () => {
  let component: DesignMenuComponent;
  let fixture: ComponentFixture<DesignMenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DesignMenuComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DesignMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
