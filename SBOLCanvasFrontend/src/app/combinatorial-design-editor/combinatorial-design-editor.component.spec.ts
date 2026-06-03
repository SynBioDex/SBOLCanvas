// One-line form-mutation setters omitted: assignment tautologies (lesson 8).
import { BehaviorSubject } from 'rxjs';

import { CombinatorialDesignEditorComponent } from './combinatorial-design-editor.component';
import { CombinatorialInfo } from '../combinatorialInfo';
import { GlyphInfo } from '../glyphInfo';
import { IdentifiedInfo } from '../identifiedInfo';
import { VariableComponentInfo } from '../variableComponentInfo';

describe('CombinatorialDesignEditorComponent', () => {
  let component: CombinatorialDesignEditorComponent;
  let combinatorialSubject: BehaviorSubject<CombinatorialInfo | null>;
  let glyphSubject: BehaviorSubject<GlyphInfo | null>;
  let metadataService: any;
  let graphService: any;
  let dialog: any;
  let dialogRef: any;

  beforeEach(() => {
    combinatorialSubject = new BehaviorSubject<CombinatorialInfo | null>(null);
    glyphSubject = new BehaviorSubject<GlyphInfo | null>(null);

    metadataService = {
      selectedCombinatorialInfo: combinatorialSubject.asObservable(),
      selectedGlyphInfo: glyphSubject.asObservable(),
    };
    graphService = {
      setSelectedCombinatorialInfo: jest.fn(),
      getSelectedCellID: jest.fn().mockReturnValue('cell-1'),
    };
    dialog = { open: jest.fn() };
    dialogRef = { close: jest.fn() };

    component = new CombinatorialDesignEditorComponent(
      graphService,
      metadataService,
      dialog,
      dialogRef,
    );
  });

  it.each([
    ['returns true when the row matches selectedRow by reference', { id: 1 } as any, 'same',  true],
    ['returns false for a different reference with equal content', { id: 1 } as any, 'other', false],
    ['returns false when nothing is selected, regardless of input', null,             'any',   false],
  ])('highlightRow %s', (_label, selected, kind, expected) => {
    component.selectedRow = selected;
    const probe = kind === 'same' ? selected : { id: 1 };
    expect(component.highlightRow(probe)).toBe(expected);
  });

  describe('onRemoveClick', () => {
    function variant(uri: string): IdentifiedInfo {
      const v = new IdentifiedInfo();
      v.uri = uri;
      return v;
    }

    it('removes the selected row from variants and clears selectedRow', () => {
      component.variableComponentInfo = new VariableComponentInfo('cell-1');
      const a = variant('a');
      const b = variant('b');
      const c = variant('c');
      component.variableComponentInfo.variants = [a, b, c];
      component.selectedRow = b;

      component.onRemoveClick();

      expect(component.variableComponentInfo.variants).toEqual([a, c]);
      expect(component.selectedRow).toBeNull();
      expect(component.parts.data).toEqual([a, c]);
    });

    it('is a no-op when selectedRow is not in variants', () => {
      component.variableComponentInfo = new VariableComponentInfo('cell-1');
      const a = variant('a');
      component.variableComponentInfo.variants = [a];
      component.selectedRow = variant('not-present');

      component.onRemoveClick();
      expect(component.variableComponentInfo.variants).toEqual([a]);
    });
  });

  describe('combinatorialInfoUpdated', () => {
    it('seeds strategy with the first option when none is set', () => {
      const info = new CombinatorialInfo();
      info.uriPrefix = 'https://example.org';
      info.strategy = undefined as any;
      component.componentInfo = new GlyphInfo();

      combinatorialSubject.next(info);

      expect(component.combinatorialInfo.strategy).toBe(component.strategies[0]);
    });

    it('preserves an existing strategy', () => {
      const info = new CombinatorialInfo();
      info.uriPrefix = 'https://example.org';
      info.strategy = 'Enumerate';
      component.componentInfo = new GlyphInfo();

      combinatorialSubject.next(info);

      expect(component.combinatorialInfo.strategy).toBe('Enumerate');
    });

    it('captures prevURI from the incoming info via getFullURI', () => {
      const info = new CombinatorialInfo();
      info.uriPrefix = 'https://example.org';
      info.displayID = 'comb-x';
      info.version = '1';
      component.componentInfo = new GlyphInfo();

      combinatorialSubject.next(info);

      expect(component.prevURI).toBe('https://example.org/comb-x/1');
    });
  });

  describe('setupPartsData', () => {
    it('returns early when either componentInfo or combinatorialInfo is missing', () => {
      component.componentInfo = undefined as any;
      component.combinatorialInfo = undefined as any;
      expect(() => component.setupPartsData()).not.toThrow();
    });

    it.each([
      [
        'creates a new VariableComponentInfo seeded with operator "One" when none exists',
        () => new CombinatorialInfo(),
        'cell-1',
        'One',
      ],
      [
        'reuses an existing VariableComponentInfo for the selected cell',
        () => {
          const ci = new CombinatorialInfo();
          const existing = new VariableComponentInfo('cell-1');
          existing.operator = 'Zero Or One';
          ci.addVariableComponentInfo(existing);
          return ci;
        },
        'cell-1',
        'Zero Or One',
      ],
    ])('%s', (_label, makeInfo, cellID, expectedOperator) => {
      component.componentInfo = new GlyphInfo();
      component.combinatorialInfo = makeInfo();
      graphService.getSelectedCellID.mockReturnValue(cellID);

      component.setupPartsData();

      expect(component.variableComponentInfo).toBeInstanceOf(VariableComponentInfo);
      expect(component.variableComponentInfo.cellID).toBe(cellID);
      expect(component.variableComponentInfo.operator).toBe(expectedOperator);
    });
  });

  describe('save / cancel asymmetry', () => {
    it('onSaveClick forwards the working info plus prevURI to graphService and closes the dialog', () => {
      component.combinatorialInfo = new CombinatorialInfo();
      component.prevURI = 'https://prev/uri';

      component.onSaveClick();

      expect(graphService.setSelectedCombinatorialInfo).toHaveBeenCalledWith(
        component.combinatorialInfo,
        'https://prev/uri',
      );
      expect(dialogRef.close).toHaveBeenCalledTimes(1);
    });

    it('onCancelClick closes the dialog without saving', () => {
      component.onCancelClick();
      expect(dialogRef.close).toHaveBeenCalledTimes(1);
      expect(graphService.setSelectedCombinatorialInfo).not.toHaveBeenCalled();
    });
  });
});
