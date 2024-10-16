import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { FilesService } from './files.service';

describe('FilesService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [],
    providers: [provideHttpClient(withInterceptorsFromDi())]
}));

  it('should be created', () => {
    const service: FilesService = TestBed.get(FilesService);
    expect(service).toBeTruthy();
  });
});
