// mxGraph is initialized for mxConstants only; synthetic cells stub the predicates StyleInfo inspects, so the rendering/lifecycle stack is not exercised.
import * as mxgraph from 'mxgraph';
import { StyleInfo } from './style-info';

const mx = (mxgraph as any).default({
  mxImageBasePath: 'mxgraph/images',
  mxBasePath: 'mxgraph',
});

type CellPredicates = Partial<{
  isCircuitContainer: () => boolean;
  isSequenceFeatureGlyph: () => boolean;
  isMolecularSpeciesGlyph: () => boolean;
  isInteraction: () => boolean;
  isBackbone: () => boolean;
}>;

function cell(predicates: CellPredicates): any {
  return {
    isCircuitContainer: () => false,
    isSequenceFeatureGlyph: () => false,
    isMolecularSpeciesGlyph: () => false,
    isInteraction: () => false,
    isBackbone: () => false,
    ...predicates,
    getBackbone: () => cell({ isBackbone: () => true }),
  };
}

const sequenceFeature = () => cell({ isSequenceFeatureGlyph: () => true });
const molecularSpecies = () => cell({ isMolecularSpeciesGlyph: () => true });
const interaction = () => cell({ isInteraction: () => true });
const backbone = () => cell({ isBackbone: () => true });
const circuitContainer = () => cell({ isCircuitContainer: () => true });
const textbox = () => cell({}); // no predicate matches -> TEXT_BOX bucket

const stubGraph = { getCellStyle: () => ({}) } as any;

describe('StyleInfo', () => {
  it.each([
    ['empty selection',                              [],                       0],
    ['sequence-feature',                             [sequenceFeature()],      1],
    ['textbox fallthrough (no predicate matches)',   [textbox()],              1],
    ['circuit container becomes a backbone',         [circuitContainer()],     1],
    ['mixed sequence-feature + interaction',         [sequenceFeature(), interaction()], 2],
  ])('classifies %s into %d element types', (_label, selection, expected) => {
    const info = new StyleInfo(selection, stubGraph);
    expect(info.selectionTypes.size).toBe(expected);
  });

  it('does not mutate the caller-owned selection array (defensive copy)', () => {
    const cc = circuitContainer();
    const original = [cc];
    new StyleInfo(original, stubGraph);
    expect(original[0]).toBe(cc);
  });

  describe('capability gates', () => {
    it('hasStrokeColor / hasStrokeOpacity require any selection (universal gate)', () => {
      expect(new StyleInfo([]).hasStrokeColor()).toBe(false);
      expect(new StyleInfo([sequenceFeature()], stubGraph).hasStrokeColor()).toBe(true);
    });

    it.each([
      ['sequence-feature excluded',  [sequenceFeature()],   false],
      ['molecular-species excluded', [molecularSpecies()],  false],
      ['interaction allowed',        [interaction()],       true],
      ['textbox allowed',            [textbox()],           true],
    ])('hasStrokeWidth: %s', (_label, selection, expected) => {
      expect(new StyleInfo(selection, stubGraph).hasStrokeWidth()).toBe(expected);
    });

    it('hasFillColor / hasFillOpacity exclude interaction-only selections', () => {
      expect(new StyleInfo([interaction()], stubGraph).hasFillColor()).toBe(false);
      expect(new StyleInfo([sequenceFeature()], stubGraph).hasFillColor()).toBe(true);
    });

    it.each([
      ['backbone excluded',    [backbone()],         false],
      ['interaction excluded', [interaction()],      false],
      ['sequence-feature OK',  [sequenceFeature()],  true],
    ])('hasFontColor / hasFontOpacity / hasFontSize: %s', (_label, selection, expected) => {
      const info = new StyleInfo(selection, stubGraph);
      expect(info.hasFontColor()).toBe(expected);
      expect(info.hasFontOpacity()).toBe(expected);
      expect(info.hasFontSize()).toBe(expected);
    });

    it.each([
      'hasBendStyle',
      'hasEndSize',
      'hasEdgeStyle',
      'hasSourceSpacing',
      'hasTargetSpacing',
    ])('%s requires a homogeneous interaction-only selection', gate => {
      expect((new StyleInfo([interaction()], stubGraph) as any)[gate]()).toBe(true);
      expect((new StyleInfo([interaction(), sequenceFeature()], stubGraph) as any)[gate]()).toBe(false);
      expect((new StyleInfo([sequenceFeature()], stubGraph) as any)[gate]()).toBe(false);
    });
  });

  describe('bend-style', () => {
    it.each([
      ['sharp',    0, 0],
      ['rounded',  1, 0],
      ['curved',   0, 1],
    ])('setBendStyle("%s") writes rounded=%d, curved=%d', (input, rounded, curved) => {
      const info = new StyleInfo([]);
      info.setBendStyle(input);
      expect(info.styles[mx.mxConstants.STYLE_ROUNDED]).toBe(rounded);
      expect(info.styles[mx.mxConstants.STYLE_CURVED]).toBe(curved);
    });

    it('currentBendStyle treats curved as the dominant signal when both flags are set', () => {
      const info = new StyleInfo([]);
      info.styles[mx.mxConstants.STYLE_ROUNDED] = 1;
      info.styles[mx.mxConstants.STYLE_CURVED] = 1;
      expect(info.currentBendStyle()).toBe('curved');
    });
  });
});
