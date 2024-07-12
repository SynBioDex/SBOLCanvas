import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../material.module';

import { ExportImageComponent } from './export-image.component';

describe('ExportImageComponent', () => {
  let component: ExportImageComponent;
  let fixture: ComponentFixture<ExportImageComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [ExportImageComponent],
    imports: [BrowserAnimationsModule, FormsModule, MaterialModule],
    providers: [
        { provide: MatDialogRef, useValue: {} },
        provideHttpClient(withInterceptorsFromDi()),
    ]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportImageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
