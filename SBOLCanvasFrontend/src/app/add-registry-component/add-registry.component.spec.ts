import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddRegistryComponent } from './add-registry.component';

describe('AddRegistryComponentComponent', () => {
  let component: AddRegistryComponent;
  let fixture: ComponentFixture<AddRegistryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddRegistryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddRegistryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
