import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { MaterialModule } from '../material.module';

import { InfoEditorComponent } from './info-editor.component';

describe('InfoEditorComponent', () => {
  let component: InfoEditorComponent;
  let fixture: ComponentFixture<InfoEditorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [InfoEditorComponent],
    imports: [MaterialModule],
    providers: [provideHttpClient(withInterceptorsFromDi())]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InfoEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
