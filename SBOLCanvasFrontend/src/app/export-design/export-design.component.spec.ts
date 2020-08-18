import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportDesignComponent } from './export-design.component';

describe('ExportDesignComponent', () => {
  let component: ExportDesignComponent;
  let fixture: ComponentFixture<ExportDesignComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ExportDesignComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportDesignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
