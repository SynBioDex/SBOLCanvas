import { HttpClientModule } from '@angular/common/http';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatCardModule } from '@angular/material/card';
import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '../material.module';

import { LoadGraphComponent } from './load-graph.component';

describe('LoadGraphComponent', () => {
  let component: LoadGraphComponent;
  let fixture: ComponentFixture<LoadGraphComponent>;

  // This will be used as 'data' in the constructor
  const data = {
    file: null
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [MaterialModule, HttpClientModule],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: data }
      ],
      declarations: [ LoadGraphComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoadGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
