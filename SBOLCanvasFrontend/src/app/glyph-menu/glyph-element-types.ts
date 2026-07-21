/**
 * Canonical SBOL glyph element-type names, written onto each tile's `elementType` attribute
 * and read back at registration to pick the matching GraphService.make*Dragsource.
 */
export const ELEMENT_TYPES = {
  BACKBONE: 'Backbone',
  TEXT_BOX: 'Text box',
  MODULE: 'Module',
  EVENT: 'Event',
  SEQUENCE_FEATURE: 'Sequence Feature',
  MOLECULAR_SPECIES: 'Molecular Species',
  INTERACTION: 'Interaction',
  INTERACTION_NODE: 'Interaction Node',
} as const;

export type ElementType = (typeof ELEMENT_TYPES)[keyof typeof ELEMENT_TYPES];
