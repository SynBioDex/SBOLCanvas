import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MaterialModule } from '../material.module';

import { DesignMenuComponent } from './design-menu.component';

describe('DesignMenuComponent', () => {
  let component: DesignMenuComponent;
  let fixture: ComponentFixture<DesignMenuComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
    declarations: [DesignMenuComponent],
    imports: [MaterialModule],
    providers: [provideHttpClient(withInterceptorsFromDi())]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DesignMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
