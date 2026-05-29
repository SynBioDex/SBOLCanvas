import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { LoginService, RegistryEntry } from './login.service';

describe('LoginService', () => {
  let service: LoginService;
  let http: HttpTestingController;
  let dialog: { open: jest.Mock };

  beforeEach(() => {
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of('result') }) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialog, useValue: dialog },
        LoginService,
      ],
    });
    service = TestBed.inject(LoginService);
    http = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  describe('login', () => {
    it('encodes credentials in the Authorization header and forwards server param', () => {
      service.login('user@example.com', 'pw', 'https://synbiohub.org').subscribe();

      const req = http.expectOne(r => r.url.endsWith('/SynBioHub/login'));
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('user@example.com:pw');
      expect(req.request.params.get('server')).toBe('https://synbiohub.org');
      expect(req.request.responseType).toBe('text');
      req.flush('token-abc');
    });
  });

  describe('logout', () => {
    it('sends the cached user token and removes it on success', async () => {
      service.users['https://synbiohub.org'] = 'token-abc';

      const promise = service.logout('https://synbiohub.org');
      const req = http.expectOne(r => r.url.endsWith('/SynBioHub/logout'));
      expect(req.request.headers.get('Authorization')).toBe('token-abc');
      expect(req.request.params.get('server')).toBe('https://synbiohub.org');
      req.flush({});

      await promise;
      expect(service.users['https://synbiohub.org']).toBeUndefined();
    });
  });

  describe('forceLogout', () => {
    it('removes the cached token without making any HTTP call', () => {
      service.users['https://synbiohub.org'] = 'token-abc';

      service.forceLogout('https://synbiohub.org');
      expect(service.users['https://synbiohub.org']).toBeUndefined();
    });

  });

  describe('openLoginDialog', () => {
    it('opens the dialog with the registry as data and forwards afterClosed', done => {
      service.openLoginDialog('https://synbiohub.org').subscribe(value => {
        expect(value).toBe('result');
        done();
      });

      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { server: 'https://synbiohub.org' } }));
    });
  });

  describe('getRegistryDisplayURL', () => {
    it('returns "" for falsy input', () => {
      expect(service.getRegistryDisplayURL(null as any)).toBe('');
      expect(service.getRegistryDisplayURL(undefined as any)).toBe('');
    });

    it('returns the string itself when given a string', () => {
      expect(service.getRegistryDisplayURL('https://synbiohub.org')).toBe('https://synbiohub.org');
    });

    it('extracts url from a RegistryEntry', () => {
      const entry: RegistryEntry = { url: 'https://synbiohub.org', api: 'a', prefix: 'p' };
      expect(service.getRegistryDisplayURL(entry)).toBe('https://synbiohub.org');
    });
  });

  describe('getRegistryAPI', () => {
    it.each([
      ['null', null as any, null],
      ['empty string', '', ''],
    ])('returns falsy input unchanged: %s', (_desc, input, expected) => {
      expect(service.getRegistryAPI(input)).toBe(expected);
    });

    it('returns the input URL when no in-memory or stored entry matches', () => {
      expect(service.getRegistryAPI('https://unknown.org')).toBe('https://unknown.org');
    });

    it('returns the api field of an in-memory registry entry', () => {
      service.setServerRegistries([
        { url: 'https://synbiohub.org', api: 'https://api.synbiohub.org', prefix: 'sbh' },
      ]);
      expect(service.getRegistryAPI('https://synbiohub.org')).toBe('https://api.synbiohub.org');
    });

    it('falls back to the URL when the in-memory entry has no api', () => {
      service.setServerRegistries([{ url: 'https://synbiohub.org' } as any]);
      expect(service.getRegistryAPI('https://synbiohub.org')).toBe('https://synbiohub.org');
    });

    it('reads from localStorage when no in-memory entry matches', () => {
      localStorage.setItem(
        'registries',
        JSON.stringify([{ url: 'https://stored.org', api: 'https://api.stored.org' }]),
      );
      expect(service.getRegistryAPI('https://stored.org')).toBe('https://api.stored.org');
    });

    it('handles plain-string registry entries in localStorage', () => {
      localStorage.setItem('registries', JSON.stringify(['https://legacy.org']));
      expect(service.getRegistryAPI('https://legacy.org')).toBe('https://legacy.org');
    });

    it('returns the URL when localStorage contents are malformed and logs the swallow', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      localStorage.setItem('registries', 'not-json');
      expect(service.getRegistryAPI('https://broken.org')).toBe('https://broken.org');
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('getRegistryPrefix', () => {
    it('uses the in-memory prefix when present', () => {
      service.setServerRegistries([
        { url: 'https://synbiohub.org', api: 'a', prefix: 'sbh-prefix' },
      ]);
      expect(service.getRegistryPrefix('https://synbiohub.org')).toBe('sbh-prefix');
    });

    it('falls back to the registryPrefixes map in localStorage', () => {
      localStorage.setItem(
        'registryPrefixes',
        JSON.stringify({ 'https://example.org': 'ex-prefix' }),
      );
      expect(service.getRegistryPrefix('https://example.org')).toBe('ex-prefix');
    });

    it('returns the URL itself when no prefix is found', () => {
      expect(service.getRegistryPrefix('https://unknown.org')).toBe('https://unknown.org');
    });

    it.each([
      ['null', null as any, null],
      ['empty string', '', ''],
    ])('passes through falsy input: %s', (_desc, input, expected) => {
      expect(service.getRegistryPrefix(input)).toBe(expected);
    });
  });

  describe('setServerRegistries', () => {
    it('ignores non-array input', () => {
      service.setServerRegistries('garbage' as any);
      expect(service.getRegistryAPI('anything')).toBe('anything');
    });

    it('drops registries without a url', () => {
      service.setServerRegistries([
        { url: '', api: 'a', prefix: 'p' } as any,
        { url: 'https://kept.org', api: 'a', prefix: 'p' },
      ]);
      expect(service.getRegistryAPI('https://kept.org')).toBe('a');
      expect(service.getRegistryAPI('')).toBe('');
    });

    it('normalizes plain-string entries by mirroring the url into api and prefix', () => {
      service.setServerRegistries(['https://plain.org']);
      expect(service.getRegistryAPI('https://plain.org')).toBe('https://plain.org');
      expect(service.getRegistryPrefix('https://plain.org')).toBe('https://plain.org');
    });
  });
});
