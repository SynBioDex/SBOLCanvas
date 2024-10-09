import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddRegistryComponentComponent } from './add-registry-component.component';

describe('AddRegistryComponentComponent', () => {
  let component: AddRegistryComponentComponent;
  let fixture: ComponentFixture<AddRegistryComponentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddRegistryComponentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddRegistryComponentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
