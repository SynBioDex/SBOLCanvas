import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadGraphComponent } from './upload-graph.component';

describe('UploadGraphComponent', () => {
  let component: UploadGraphComponent;
  let fixture: ComponentFixture<UploadGraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ UploadGraphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(UploadGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
