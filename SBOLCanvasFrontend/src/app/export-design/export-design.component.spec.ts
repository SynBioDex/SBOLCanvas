import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../material.module';

import { ExportDesignComponent } from './export-design.component';

describe('ExportDesignComponent', () => {
  let component: ExportDesignComponent;
  let fixture: ComponentFixture<ExportDesignComponent>;

  // This will be used as 'data' in the constructor
  const data = {
    mode: "Export"
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [ExportDesignComponent],
    imports: [BrowserAnimationsModule, FormsModule, MaterialModule],
    providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: data },
        provideHttpClient(withInterceptorsFromDi())
    ]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportDesignComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
