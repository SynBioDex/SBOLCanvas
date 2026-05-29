import { TestBed } from '@angular/core/testing';

import {
  ComponentCanDeactivate,
  PendingChangesGuard,
} from './pending-changes.guard';
import { EmbeddedService } from './embedded.service';

describe('PendingChangesGuard', () => {
  let guard: PendingChangesGuard;
  let embedded: { isAppEmbedded: jest.Mock };
  let confirmSpy: jest.SpyInstance;

  beforeEach(() => {
    embedded = { isAppEmbedded: jest.fn().mockReturnValue(false) };

    TestBed.configureTestingModule({
      providers: [
        PendingChangesGuard,
        { provide: EmbeddedService, useValue: embedded },
      ],
    });

    guard = TestBed.inject(PendingChangesGuard);
    confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => confirmSpy.mockRestore());

  function asComponent(canDeactivate: () => boolean): ComponentCanDeactivate {
    return { canDeactivate };
  }

  it('allows deactivation without prompting when the component reports no pending changes', () => {
    const result = guard.canDeactivate(asComponent(() => true));
    expect(result).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('allows deactivation without prompting when the app is embedded, regardless of component state', () => {
    embedded.isAppEmbedded.mockReturnValue(true);
    const result = guard.canDeactivate(asComponent(() => false));
    expect(result).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it.each([
    ['true',  true],
    ['false', false],
  ])('returns %s when there are pending changes and confirm() returns the same', (_label, value) => {
    confirmSpy.mockReturnValue(value);
    const result = guard.canDeactivate(asComponent(() => false));
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(result).toBe(value);
  });
});
