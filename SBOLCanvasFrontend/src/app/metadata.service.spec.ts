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
    ['loadInteractionRoles',  '/data/interactionRoles'],
    ['loadSimulationConfig',  '/data/simulationConfig'],
  ])('%s issues a GET to %s', (method, path) => {
    (service as any)[method]().subscribe();
    const req = http.expectOne(r => r.url.endsWith(path));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it.each([
    ['loadRefinements',                '/data/refine'],
    ['loadInteractionRoleRefinements', '/data/interactionRoleRefine'],
  ])('%s forwards parent as a query param', (method, path) => {
    (service as any)[method]('SO:0000167').subscribe();
    const req = http.expectOne(r => r.url.endsWith(path));
    expect(req.request.params.get('parent')).toBe('SO:0000167');
    req.flush({});
  });
});
