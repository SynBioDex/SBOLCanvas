import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CollectionCreationComponent } from './collection-creation.component';

describe('CollectionCreationComponent', () => {
  let component: CollectionCreationComponent;
  let fixture: ComponentFixture<CollectionCreationComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CollectionCreationComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CollectionCreationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
