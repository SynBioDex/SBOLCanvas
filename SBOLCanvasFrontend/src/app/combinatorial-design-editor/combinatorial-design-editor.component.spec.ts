import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MaterialModule } from '../material.module';

import { CombinatorialDesignEditorComponent } from './combinatorial-design-editor.component';

describe('CombinatorialDesignEditorComponent', () => {
  let component: CombinatorialDesignEditorComponent;
  let fixture: ComponentFixture<CombinatorialDesignEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [CombinatorialDesignEditorComponent],
    imports: [MaterialModule],
    providers: [
        { provide: MatDialogRef, useValue: {} },
        provideHttpClient(withInterceptorsFromDi()),
    ]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CombinatorialDesignEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // This object should only be constructed when a default CombinatorialInfo can be created
  // for this test to work, you need to go to the graph service, create a sequence feature and select it
  // it('should create', () => {
  //   expect(component).toBeTruthy();
  // });
});
