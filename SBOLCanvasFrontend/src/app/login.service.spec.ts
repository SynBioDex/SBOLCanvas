import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material';

import { LoginService } from './login.service';

describe('LoginService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [MatDialogModule],
    providers: [provideHttpClient(withInterceptorsFromDi())]
}));

  it('should be created', () => {
    const service: LoginService = TestBed.get(LoginService);
    expect(service).toBeTruthy();
  });
});
