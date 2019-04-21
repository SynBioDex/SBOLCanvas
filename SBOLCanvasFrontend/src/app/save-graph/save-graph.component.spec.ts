import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SaveGraphComponent } from './save-graph.component';

describe('SaveGraphComponent', () => {
  let component: SaveGraphComponent;
  let fixture: ComponentFixture<SaveGraphComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SaveGraphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SaveGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
