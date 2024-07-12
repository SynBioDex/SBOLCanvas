import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from '../material.module';

import { DownloadGraphComponent } from './download-graph.component';

describe('DownloadGraphComponent', () => {
  let component: DownloadGraphComponent;
  let fixture: ComponentFixture<DownloadGraphComponent>;

  // This will be used as 'data' in the constructor
  const data = null;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [DownloadGraphComponent],
    imports: [BrowserAnimationsModule, MaterialModule],
    providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: data },
        provideHttpClient(withInterceptorsFromDi())
    ]
})
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DownloadGraphComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
