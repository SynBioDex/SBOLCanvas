import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportImageComponent } from './export-image.component';

describe('ExportComponent', () => {
  let component: ExportImageComponent;
  let fixture: ComponentFixture<ExportImageComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExportImageComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
