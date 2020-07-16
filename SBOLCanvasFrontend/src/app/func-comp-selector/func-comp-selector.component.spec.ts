import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FuncCompSelectorComponent } from './func-comp-selector.component';

describe('FuncCompSelectorComponent', () => {
  let component: FuncCompSelectorComponent;
  let fixture: ComponentFixture<FuncCompSelectorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FuncCompSelectorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FuncCompSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
