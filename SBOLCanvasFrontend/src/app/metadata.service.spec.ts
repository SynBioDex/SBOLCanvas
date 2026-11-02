import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';

import { MetadataService } from './metadata.service';

describe('MetadataService', () => {
  let service: MetadataService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MetadataService,
      ],
    });
    service = TestBed.inject(MetadataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it.each([
    ['loadTypes',             '/data/types'],
    ['loadRoles',             '/data/roles'],
    ['loadInteractions',      '/data/interactions'],
  ])('%s issues a GET to %s', (method, path) => {
    (service as any)[method]().subscribe();
    const req = http.expectOne(r => r.url.endsWith(path));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('loadRefinements forwards parent as a query param', () => {
    service.loadRefinements('SO:0000167').subscribe();
    const req = http.expectOne(r => r.url.endsWith('/data/refine'));
    expect(req.request.params.get('parent')).toBe('SO:0000167');
    req.flush({});
  });

  it('lets startup finish when the backend cannot be reached', async () => {
    const started = service.initialize();
    http.match(() => true)[0].error(new ProgressEvent('error'), { status: 0 });
    await expect(started).resolves.toBeUndefined();
    expect(service.interactionRules).toBeUndefined();
    expect(service.hasLoadError).toBe(true);
  });
});
