// ngOnInit (subscriptions + global mousedown) is intentionally not exercised.
import { BehaviorSubject, of } from 'rxjs';

import { InfoEditorComponent } from './info-editor.component';
import { GlyphInfo } from '../glyphInfo';
import { InteractionInfo } from '../interactionInfo';
import { ModuleInfo } from '../moduleInfo';

describe('InfoEditorComponent', () => {
  let component: InfoEditorComponent;
  let glyphSubject: BehaviorSubject<GlyphInfo | null>;
  let interactionSubject: BehaviorSubject<InteractionInfo | null>;
  let moduleSubject: BehaviorSubject<ModuleInfo | null>;
  let metadataService: any;
  let graphService: any;
  let filesService: any;
  let dialog: any;
  let changeDetector: any;
  let elementRef: any;

  beforeEach(() => {
    glyphSubject = new BehaviorSubject<GlyphInfo | null>(null);
    interactionSubject = new BehaviorSubject<InteractionInfo | null>(null);
    moduleSubject = new BehaviorSubject<ModuleInfo | null>(null);

    metadataService = {
      selectedGlyphInfo: glyphSubject.asObservable(),
      selectedInteractionInfo: interactionSubject.asObservable(),
      selectedModuleInfo: moduleSubject.asObservable(),
      loadTypes: jest.fn().mockReturnValue(of([])),
      loadRoles: jest.fn().mockReturnValue(of([])),
      loadRefinements: jest.fn().mockReturnValue(of([])),
      loadInteractions: jest.fn().mockReturnValue(of([])),
      loadInteractionRoles: jest.fn().mockReturnValue(of({})),
      loadInteractionRoleRefinements: jest.fn().mockReturnValue(of([])),
    };
    graphService = {
      setSelectedCellInfo: jest.fn(),
      getSelectedCellID: jest.fn().mockReturnValue('cell-1'),
      isInteractionTypeAllowed: jest.fn().mockReturnValue(true),
      isSelectedAGlyph: jest.fn().mockReturnValue(false),
      isSelectedBackbone: jest.fn().mockReturnValue(false),
      isRootAComponentView: jest.fn().mockReturnValue(false),
      repaint: jest.fn(),
    };
    filesService = { getRegistries: jest.fn() };
    dialog = { open: jest.fn() };
    changeDetector = { detectChanges: jest.fn() };
    elementRef = { nativeElement: document.createElement('div') };

    component = new InfoEditorComponent(
      graphService,
      metadataService,
      filesService,
      dialog,
      changeDetector,
      elementRef,
    );
  });

  describe('reference data filters', () => {
    it('getTypes drops "Circular" and "Chromosomal"', () => {
      metadataService.loadTypes.mockReturnValue(of(['DNA', 'Circular', 'Chromosomal', 'RNA']));
      component.getTypes();
      expect(component.partTypes).toEqual(['DNA', 'RNA']);
    });

    it('getRoles drops the two Circular Backbone variants but keeps other roles', () => {
      metadataService.loadRoles.mockReturnValue(
        of(['Promoter', 'Cir (Circular Backbone Left)', 'Cir (Circular Backbone Right)', 'CDS']),
      );
      component.getRoles();
      expect(component.partRoles).toEqual(['Promoter', 'CDS']);
    });
  });

  describe('inputChange', () => {
    function event(id: string, value: string) {
      return { target: { id, value } };
    }

    it('sanitizes displayID by replacing non-word runs with underscores', () => {
      component.glyphInfo = new GlyphInfo();
      component.inputChange(event('displayID', 'my display ID!'));
      expect(component.glyphInfo.displayID).toBe('my_display_ID_');
      expect(graphService.setSelectedCellInfo).toHaveBeenCalledWith(component.glyphInfo);
    });

    it('does not overwrite displayID when the input is empty', () => {
      component.glyphInfo = new GlyphInfo();
      component.glyphInfo.displayID = 'kept';
      component.inputChange(event('displayID', ''));
      expect(component.glyphInfo.displayID).toBe('kept');
    });

    it('routes name/description writes to whichever info object is currently set', () => {
      component.glyphInfo = new GlyphInfo();
      component.inputChange(event('name', 'new-name'));
      expect(component.glyphInfo.name).toBe('new-name');

      component.glyphInfo = null;
      component.moduleInfo = new ModuleInfo();
      component.inputChange(event('description', 'desc'));
      expect(component.moduleInfo.description).toBe('desc');
    });

    it('routes sequence writes only to glyphInfo (other info types do not have a sequence field)', () => {
      component.glyphInfo = new GlyphInfo();
      component.inputChange(event('sequence', 'ACGT'));
      expect(component.glyphInfo.sequence).toBe('ACGT');
    });
  });

  describe('design-origin classification', () => {
    it.each([
      ['local baseURI prefix -> localDesign true',           'https://sbolcanvas.org',   true,  false, false],
      ['SynBioHub registry prefix -> synBioHubDesign true',  'https://synbiohub.org/x',  false, true,  false],
      ['unknown URI prefix -> importedDesign true',          'https://imported.example', false, false, true],
    ])('%s', (_label, uriPrefix, expectedLocal, expectedSynBio, expectedImported) => {
      component.registries = ['https://synbiohub.org'];
      component.glyphInfo = new GlyphInfo();
      component.glyphInfo.uriPrefix = uriPrefix;

      expect(component.localDesign()).toBe(expectedLocal);
      expect(component.synBioHubDesign()).toBe(expectedSynBio);
      expect(component.importedDesign()).toBe(expectedImported);
    });

    it('localDesign defaults to true when neither glyphInfo nor moduleInfo is set', () => {
      component.glyphInfo = null;
      component.moduleInfo = null;
      expect(component.localDesign()).toBe(true);
    });
  });

  describe('interaction role lookups', () => {
    it.each([
      ['no interactionInfo set',                   null,                                    'NA',        'NA'],
      ['known interactionType returns role pair',  { type: 'Inhibition', map: { Inhibition: ['Inhibitor', 'Inhibited'] } }, 'Inhibitor', 'Inhibited'],
      ['unknown interactionType falls back to NA', { type: 'Unknown',    map: {} },         'NA',        'NA'],
    ])('%s', (_label, setup, expectedSource, expectedTarget) => {
      if (setup) {
        component.interactionInfo = new InteractionInfo();
        component.interactionInfo.interactionType = (setup as any).type;
        component.interactionRoles = (setup as any).map;
      } else {
        component.interactionInfo = null;
      }

      expect(component.getSourceInteractionRole()).toBe(expectedSource);
      expect(component.getTargetInteractionRole()).toBe(expectedTarget);
    });
  });

  it('applyFilter filters partRefinements case-insensitively', () => {
    component.partRefinements = ['Promoter', 'CDS', 'Operator'];
    component.applyFilter('OP');
    expect(component.filteredPartRefinements).toEqual(['Operator']);

    component.applyFilter('');
    expect(component.filteredPartRefinements).toEqual(['Promoter', 'CDS', 'Operator']);
  });

  describe('glyphInfoUpdated', () => {
    it('rewrites a "Cir (Circular Backbone..." partRole to the canonical "Cir (Circular Backbone)"', () => {
      const info = new GlyphInfo();
      info.partRole = 'Cir (Circular Backbone Left)';
      component.glyphInfoUpdated(info);
      expect(component.glyphInfo!.partRole).toBe('Cir (Circular Backbone)');
    });

    it('seeds partRefinements with the current partRefine when missing from the list', () => {
      const info = new GlyphInfo();
      info.partRole = 'Cir (Circular Backbone Right)';
      info.partRefine = 'CustomRefine';
      component.partRefinements = []; // does not include CustomRefine
      component.glyphInfoUpdated(info);
      expect(component.partRefinements).toEqual(['CustomRefine']);
    });

    it('does not mutate partRole on a non-circular role', () => {
      const info = new GlyphInfo();
      info.partRole = 'Promoter';
      component.glyphInfoUpdated(info);
      expect(component.glyphInfo!.partRole).toBe('Promoter');
    });
  });

  describe('interactionInfoUpdated', () => {
    it('clears refinement lists when interactionType is null', () => {
      component.interactionSourceRefinements = ['stale'];
      component.interactionTargetRefinements = ['stale'];
      const info = new InteractionInfo();
      info.interactionType = null as any;
      component.interactionInfoUpdated(info);
      expect(component.interactionSourceRefinements).toEqual([]);
      expect(component.interactionTargetRefinements).toEqual([]);
    });

    it('filters interactionTypes via graphService.isInteractionTypeAllowed', () => {
      component.interactionTypes = ['Inhibition', 'Stimulation', 'Forbidden'];
      graphService.isInteractionTypeAllowed.mockImplementation((type: string) => type !== 'Forbidden');

      const info = new InteractionInfo();
      info.interactionType = null as any;
      component.interactionInfoUpdated(info);

      expect(component.filteredInteractionTypes).toEqual(['Inhibition', 'Stimulation']);
    });
  });

  it.each([
    ['glyph selected + component-view root',     true,  false, true,  true],
    ['backbone selected + component-view root',  false, true,  true,  true],
    ['nothing selected -> false',                 false, false, true,  false],
    ['glyph selected but module-view root -> false', true,  false, false, false],
  ])('isCombinatorialPossible: %s', (_label, isGlyph, isBackbone, isComponentRoot, expected) => {
    graphService.isSelectedAGlyph.mockReturnValue(isGlyph);
    graphService.isSelectedBackbone.mockReturnValue(isBackbone);
    graphService.isRootAComponentView.mockReturnValue(isComponentRoot);
    expect(component.isCombinatorialPossible()).toBe(expected);
  });
});
