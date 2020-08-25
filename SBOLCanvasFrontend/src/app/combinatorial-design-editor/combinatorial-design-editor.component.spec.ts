import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CombinatorialDesignEditorComponent } from './combinatorial-design-editor.component';

describe('CombinatorialDesignEditorComponent', () => {
  let component: CombinatorialDesignEditorComponent;
  let fixture: ComponentFixture<CombinatorialDesignEditorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CombinatorialDesignEditorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CombinatorialDesignEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
