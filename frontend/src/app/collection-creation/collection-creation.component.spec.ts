import { HttpClientModule } from '@angular/common/http';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../material.module';

import { CollectionCreationComponent } from './collection-creation.component';

describe('CollectionCreationComponent', () => {
  let component: CollectionCreationComponent;
  let fixture: ComponentFixture<CollectionCreationComponent>;

  // This will be used as 'data' in the constructor
  const data = {
    registry: "https://someRegistry.com"
  };

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, MaterialModule, FormsModule, HttpClientModule, MatDialogModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ],
      declarations: [CollectionCreationComponent]
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
