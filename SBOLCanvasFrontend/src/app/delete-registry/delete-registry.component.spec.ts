import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteRegistryComponent } from './delete-registry.component';

describe('DeleteRegistryComponent', () => {
  let component: DeleteRegistryComponent;
  let fixture: ComponentFixture<DeleteRegistryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteRegistryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteRegistryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
