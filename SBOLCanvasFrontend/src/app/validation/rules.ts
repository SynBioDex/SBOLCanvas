import type { mxCell, mxGraph } from 'src/mxgraph';
import {
  InteractionInfo,
  typeFollowsEndpoints,
  processEdgeType,
} from '../interactionInfo';
import { GlyphInfo } from '../glyphInfo';
import { EventInfo } from '../eventInfo';
import { Info } from '../info';
import type { InteractionRules, InteractionRule, InteractionRuleSide, SimulationConfig } from '../simulation-parameters';

export interface Issue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  field?: string;
}

export interface FindingLocation {
  viewId: string;
  cellId: string;
  field?: string;
}

export interface Finding {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  enforced: boolean;
  location: FindingLocation;
}

export interface DesignDictionaries {
  info: Record<string, Info>;
  interactions: Record<string, InteractionInfo>;
  events: Record<string, EventInfo>;
}

const isNode = (cell: mxCell | null): boolean => !!cell && cell.isInteractionNode();

export type Describe = (cell: mxCell | null) => string;

export function describeCell(dictionaries: DesignDictionaries): Describe {
  return cell => {
    if (!cell) return 'nothing';
    const interaction = dictionaries.interactions[cell.value];
    const kind = cell.isMolecularSpeciesGlyph() ? 'Species'
      : cell.isSequenceFeatureGlyph() ? 'Part'
        : cell.isCircuitContainer() || cell.isBackbone?.() ? 'Backbone'
          : cell.isEvent?.() ? 'Event'
            : cell.isModule?.() ? 'Module'
              : cell.isInteractionNode() ? `${interaction?.interactionType ?? 'Interaction'} node`
                : cell.isEdge() ? `${interaction?.interactionType ?? 'Interaction'} edge` : 'Object';
    const name = (dictionaries.info[cell.value] ?? dictionaries.events[cell.value] ?? interaction)?.displayID;
    return name ? `${kind} '${name}'` : kind;
  };
}

const describeKind: Describe = cell => !cell ? 'nothing'
  : cell.isMolecularSpeciesGlyph() ? 'a species' : cell.isSequenceFeatureGlyph() ? 'a part'
    : cell.isInteractionNode() ? 'an interaction node' : cell.isEdge() ? 'an edge' : 'an object';

function acceptsEndpoint(side: InteractionRuleSide, cell: mxCell, moduleEndpoint = false): boolean {
  return (moduleEndpoint && cell.isModule?.()) || !side.endpointTypes || side.endpointTypes.some(endpointType =>
    endpointType === 'species' ? cell.isMolecularSpeciesGlyph()
      : endpointType === 'dna' ? cell.isSequenceFeatureGlyph()
        : cell.isInteractionNode());
}

export function checkConnection(
  interactionType: string,
  source: mxCell | null,
  target: mxCell | null,
  rules: InteractionRules,
  moduleEndpoints: { source?: boolean; target?: boolean; } = {},
  describe: Describe = describeKind,
  subject = `${interactionType} edge`
): Issue[] {
  const issues: Issue[] = [];
  if (!interactionType) {
    return issues;
  }
  const ruleType = interactionType === 'Process' ? processEdgeType(source, target) : interactionType;
  if (!Object.prototype.hasOwnProperty.call(rules, ruleType)) {
    return [{ code: 'interaction-unknown-type', severity: 'error', message: `${subject}: unsupported interaction type '${interactionType}'.` }];
  }
  if ((source && source.isEdge()) || (target && target.isEdge())) {
    issues.push({ code: 'edge-endpoint-edge', severity: 'error', message: `${subject}: cannot connect to another edge.` });
  }
  if (isNode(source) && isNode(target)) {
    issues.push({ code: 'edge-node-node', severity: 'error', message: `${subject}: cannot connect two interaction nodes.` });
  }
  if (source && source.isCircuitContainer()) {
    issues.push({ code: 'edge-container', severity: 'error', message: `${subject}: cannot connect to ${describe(source)}; connect to a part on it.` });
  }
  const rule = rules[ruleType];
  if (source && !source.isEdge() && rule.source && !acceptsEndpoint(rule.source, source, moduleEndpoints.source)) {
    issues.push({ code: 'edge-source-type', severity: 'error', message: `${subject}: cannot connect from ${describe(source)}.` });
  }
  if (target && !target.isEdge() && rule.target && !acceptsEndpoint(rule.target, target, moduleEndpoints.target)) {
    issues.push({ code: 'edge-target-type', severity: 'error', message: `${subject}: cannot connect to ${describe(target)}.` });
  }
  if (typeFollowsEndpoints(interactionType) && source && target
    && !isNode(source) && !isNode(target) && !source.isModule?.() && !target.isModule?.()) {
    const derived = processEdgeType(source, target);
    if (derived !== interactionType) {
      issues.push({
        code: 'edge-type-mismatch',
        severity: 'error',
        message: `${subject}: ${describe(source)} and ${describe(target)} need a ${derived} edge.`,
      });
    }
  }
  return issues;
}

export interface ReactionParticipant {
  cell: mxCell | null;
  incoming: boolean;
  edgeId: string;
  moduleEndpoint?: boolean;
}

export function checkReaction(
  info: InteractionInfo,
  participants: ReactionParticipant[],
  rules: InteractionRules,
  describe: Describe = describeKind
): Issue[] {
  const interactionType = info.interactionType;
  const subject = `${interactionType || 'Interaction'} '${info.displayID}'`;
  if (!interactionType) {
    return [{ code: 'interaction-unknown-type', severity: 'error', message: `${subject}: no interaction type.` }];
  }
  if (!Object.prototype.hasOwnProperty.call(rules, interactionType)) {
    return [{ code: 'interaction-unknown-type', severity: 'error', message: `${subject}: unsupported interaction type.` }];
  }
  const rule = rules[interactionType];
  const issues: Issue[] = [];
  let reactants = 0;
  let products = 0;
  const explicitCoefficients = new Map<string, { value: number; field: string; }>();
  const targetStoichEdgeIds: string[] = [];
  for (const participant of participants) {
    const side = participant.incoming ? rule.source : rule.target;
    const refinements = participant.incoming ? info.sourceRefinement : info.targetRefinement;
    const suppliedRole = refinements[participant.edgeId];
    const role = suppliedRole === undefined ? side.defaultRole : suppliedRole;
    if (!side.roles.includes(role)) {
      issues.push({
        code: 'participant-role-unrepresentable',
        severity: 'error',
        field: (participant.incoming ? 'sourceRefinement.' : 'targetRefinement.') + participant.edgeId,
        message: `${subject}: role '${role}' is not allowed for ${describe(participant.cell)}.`,
      });
    }
    if (participant.cell && (!acceptsEndpoint(side, participant.cell, participant.moduleEndpoint) || (!participant.incoming && rule.targetless))) {
      issues.push({
        code: participant.incoming ? 'edge-source-type' : 'edge-target-type',
        severity: 'error',
        message: `${subject}: cannot connect ${participant.incoming ? 'from' : 'to'} ${describe(participant.cell)}.`,
      });
    }
    const isModifier = isModifierRole(rule, role);
    if (participant.incoming) {
      if (!isModifier) {
        reactants++;
      }
    } else if (!isModifier) {
      products++;
      targetStoichEdgeIds.push(participant.edgeId);
    }
    const participantType = isModifier ? 'modifier' : participant.incoming ? 'reactant' : 'product';
    const coefficients = participant.incoming ? info.sourceCoefficient : info.targetCoefficient;
    const explicit = coefficients[participant.edgeId];
    if (participant.cell && !isModifier && typeof explicit === 'number') {
      const field = `${participant.incoming ? 'sourceCoefficient' : 'targetCoefficient'}.${participant.edgeId}`;
      const key = `${participant.cell.value}:${participantType}`;
      const prior = explicitCoefficients.get(key);
      if (!prior) {
        explicitCoefficients.set(key, { value: explicit, field });
      } else if (prior.value !== explicit) {
        issues.push({
          code: 'reaction-coefficient-conflict',
          severity: 'error',
          field,
          message: `${subject}: conflicting ${participantType} coefficients for ${describe(participant.cell)} (${prior.value} and ${explicit}).`,
        });
      }
    }
  }
  if (rule.target.fixedCoefficient !== undefined) {
    for (const edgeId of targetStoichEdgeIds) {
      const explicit = info.targetCoefficient[edgeId];
      if (typeof explicit === 'number' && explicit !== rule.target.fixedCoefficient) {
        issues.push({
          code: 'reaction-fixed-coefficient',
          severity: 'error',
          field: `targetCoefficient.${edgeId}`,
          message: `${subject}: the product coefficient is fixed at ${rule.target.fixedCoefficient}.`,
        });
      }
    }
  }
  if (rule.maxReactants !== undefined && reactants > rule.maxReactants) {
    issues.push({
      code: 'reaction-reactant-cap',
      severity: 'error',
      message: `${subject}: allows at most ${rule.maxReactants} reactant${rule.maxReactants === 1 ? '' : 's'}.`,
    });
  }
  if (rule.maxProducts !== undefined && products > rule.maxProducts) {
    issues.push({
      code: 'reaction-product-cap',
      severity: 'error',
      message: `${subject}: allows at most ${rule.maxProducts} product${rule.maxProducts === 1 ? '' : 's'}.`,
    });
  }
  return issues;
}

export interface SharedRateSet {
  ownerCellId: string;
  ownerLabel: string;
  sharedSpeciesLabel: string;
  bindingProductUri: string | null;
  degradedSpeciesUri: string | null;
  settings: Record<string, number | boolean | string>;
  coefficients: Record<string, { value: number; field: string; }>;
}

export function sharedRateValues(
  ownerCellId: string,
  info: InteractionInfo,
  participants: ReactionParticipant[],
  rules: InteractionRules,
  config: SimulationConfig,
  describe: Describe = describeKind
): SharedRateSet | null {
  const interactionType = info.interactionType;
  if (!interactionType || !Object.prototype.hasOwnProperty.call(rules, interactionType)) {
    return null;
  }
  const rule = rules[interactionType];
  const isBinding = interactionType === 'Non-Covalent Binding';
  let bindingProductUri: string | null = null;
  let degradedSpeciesUri: string | null = null;
  let sharedSpeciesLabel = '';
  const coefficients: Record<string, { value: number; field: string; }> = {};
  for (const participant of participants) {
    if (!participant.cell) continue;
    const side = participant.incoming ? rule.source : rule.target;
    const refinements = participant.incoming ? info.sourceRefinement : info.targetRefinement;
    const suppliedRole = refinements[participant.edgeId];
    const role = suppliedRole === undefined ? side.defaultRole : suppliedRole;
    if (isModifierRole(rule, role)) continue;
    if (participant.incoming) {
      if (interactionType === 'Degradation' && degradedSpeciesUri === null) {
        degradedSpeciesUri = participant.cell.value;
        sharedSpeciesLabel = describe(participant.cell);
      }
      if (isBinding) {
        const explicit = info.sourceCoefficient[participant.edgeId];
        if (typeof explicit === 'number') {
          coefficients[participant.cell.value] = { value: explicit, field: `sourceCoefficient.${participant.edgeId}` };
        }
      }
    } else if (isBinding && bindingProductUri === null) {
      bindingProductUri = participant.cell.value;
      sharedSpeciesLabel = describe(participant.cell);
    }
  }
  const fields = isBinding || interactionType === 'Degradation' ? config[interactionType] || [] : [];
  const settings: Record<string, number | boolean | string> = {};
  for (const field of fields) {
    const value = field.type === 'boolean' ? info.simulationData[field.key] ?? field.default : info.simulationData[field.key];
    if (value !== undefined) {
      settings[field.key] = value;
    }
  }
  if (!bindingProductUri && !degradedSpeciesUri) {
    return null;
  }
  return { ownerCellId, ownerLabel: `${interactionType} '${info.displayID}'`, sharedSpeciesLabel, bindingProductUri, degradedSpeciesUri, settings, coefficients };
}

export interface SharedRateConflict {
  ownerCellId: string;
  field: string;
  message: string;
}

export function sharedRateConflicts(owners: SharedRateSet[]): SharedRateConflict[] {
  const groups = new Map<string, SharedRateSet[]>();
  for (const owner of owners) {
    const key = owner.bindingProductUri
      ? `binding:${owner.bindingProductUri}`
      : owner.degradedSpeciesUri ? `degradation:${owner.degradedSpeciesUri}` : null;
    if (!key) continue;
    const members = groups.get(key);
    if (members) members.push(owner);
    else groups.set(key, [owner]);
  }
  const conflicts: SharedRateConflict[] = [];
  for (const members of groups.values()) {
    if (members.length < 2) continue;
    const fields = new Set(members.flatMap(member => Object.keys(member.settings)));
    for (const field of fields) {
      let explicit = members.filter(member => member.settings[field] !== undefined);
      if (field === 'Kc_r') {
        explicit = explicit.filter(member => member.settings['reversible'] !== false);
      }
      const distinct = new Set(explicit.map(member => member.settings[field]));
      if (distinct.size < 2) continue;
      const values = [...distinct].sort().join(' and ');
      for (const member of explicit) {
        conflicts.push({
          ownerCellId: member.ownerCellId,
          field: `simulationData.${field}`,
          message: `${member.ownerLabel}: ${field} is ${member.settings[field]}, but other reactions on ${member.sharedSpeciesLabel} use ${values}.`,
        });
      }
    }
    const coefficientKeys = new Set(members.flatMap(member => Object.keys(member.coefficients)));
    for (const key of coefficientKeys) {
      const explicit = members.filter(member => member.coefficients[key] !== undefined);
      const distinct = new Set(explicit.map(member => member.coefficients[key].value));
      if (distinct.size < 2) continue;
      const values = [...distinct].sort().join(' and ');
      for (const member of explicit) {
        conflicts.push({
          ownerCellId: member.ownerCellId,
          field: member.coefficients[key].field,
          message: `${member.ownerLabel}: reactant coefficient is ${member.coefficients[key].value}, but other reactions on ${member.sharedSpeciesLabel} use ${values}.`,
        });
      }
    }
  }
  return conflicts;
}

export function isModifierRole(rule: InteractionRule, role: string): boolean {
  return rule.source.roles.includes(role) && rule.target.roles.includes(role);
}

export function isReactionOwner(cell: mxCell): boolean {
  if (cell.isInteractionNode()) return true;
  return cell.isInteraction() && !cell.source?.isInteractionNode() && !cell.target?.isInteractionNode();
}

const DNA_ALPHABET = /^[ACGTRYSWKMBDHVN.-]*$/;
const RNA_ALPHABET = /^[ACGURYSWKMBDHVN.-]*$/;
const PROTEIN_ALPHABET = /^[A-Z]*$/;

function sequenceAlphabetFor(info: GlyphInfo): { pattern: RegExp | null; label: string; } {
  if (info.partType === 'DNA region' || info.partType === 'DNA molecule') {
    return { pattern: DNA_ALPHABET, label: 'DNA' };
  }
  if (info.partType === 'RNA region' || info.partType === 'RNA molecule') {
    return { pattern: RNA_ALPHABET, label: 'RNA' };
  }
  if (info.partType === 'Protein') {
    return { pattern: PROTEIN_ALPHABET, label: 'protein' };
  }
  return { pattern: null, label: '' };
}

const VERSION_PATTERN = /^[0-9]+[\p{L}0-9_.-]*$/u;

export function checkComponent(info: GlyphInfo): Issue[] {
  const issues: Issue[] = [];
  const displayID = info.displayID ? String(info.displayID) : '';
  const roleLabel = info.partRole || 'Component';

  if (!displayID) {
    issues.push({
      code: 'component-missing-display-id',
      severity: 'error',
      field: 'displayID',
      message: `${roleLabel}: missing an ID.`,
    });
  }

  const alphabet = sequenceAlphabetFor(info);
  if (alphabet.pattern) {
    const sequence = (info.sequence || '').toUpperCase();
    if (!sequence) {
      issues.push({
        code: 'component-no-sequence',
        severity: 'warning',
        field: 'sequence',
        message: `Component '${displayID}': no sequence.`,
      });
    } else if (!alphabet.pattern.test(sequence)) {
      issues.push({
        code: 'component-illegal-sequence',
        severity: 'error',
        field: 'sequence',
        message: `Component '${displayID}': illegal ${alphabet.label} sequence (${sequence.substring(0, 10)}...).`,
      });
    }
  }

  if (!info.version) {
    issues.push({
      code: 'component-missing-version',
      severity: 'warning',
      field: 'version',
      message: `Component '${displayID}': no version.`,
    });
  } else if (!VERSION_PATTERN.test(info.version)) {
    issues.push({
      code: 'component-incompliant-version',
      severity: 'warning',
      field: 'version',
      message: `Component '${displayID}': version '${info.version}' is not compliant.`,
    });
  }
  return issues;
}

export function checkBackbone(name: string, hasPromoter: boolean, hasProductionTarget: boolean): Issue[] {
  if (!hasPromoter) {
    return [{
      code: 'backbone-no-promoter',
      severity: 'warning',
      message: `Backbone '${name}': no promoter (skipped in SBML).`,
    }];
  }
  if (!hasProductionTarget) {
    return [{
      code: 'backbone-no-production-target',
      severity: 'warning',
      message: `Backbone '${name}': no production target (placeholder mRNA in SBML).`,
    }];
  }
  return [];
}

export const CYCLE_COMPONENT_MESSAGE = 'ComponentInstance objects MUST NOT form circular reference chains via their definition properties and parent ComponentDefinition objects.';
export const CYCLE_MODULE_MESSAGE = 'ModuleInstance objects MUST NOT form circular reference chains via their definition properties and parent ModuleDefinition objects.';

export interface DefinitionReferenceEdge {
  container: string;
  referenced: string;
}

export function definitionReferenceEdges(graph: mxGraph): DefinitionReferenceEdge[] {
  const edges: DefinitionReferenceEdge[] = [];
  const model = graph.getModel();
  const cells = (model.cells || {}) as Record<string, mxCell>;
  for (const key of Object.keys(cells)) {
    const cell = cells[key];
    if (!cell) {
      continue;
    }
    if (cell.isViewCell()) {
      const moduleUri = String(cell.getId());
      for (const viewChild of cell.children || []) {
        if (viewChild.isModule() && viewChild.value) {
          edges.push({ container: moduleUri, referenced: viewChild.value });
        } else if (viewChild.isCircuitContainer()) {
          pushFeatureEdges(edges, String(viewChild.value || moduleUri), viewChild);
        }
      }
    } else if (cell.isCircuitContainer() && cell.value) {
      const parent = cell.parent;
      const underView = !!parent && parent.isViewCell();
      if (!underView) {
        pushFeatureEdges(edges, cell.value, cell);
      }
    }
  }
  return edges;
}

function pushFeatureEdges(edges: DefinitionReferenceEdge[], containerUri: string, container: mxCell): void {
  for (const feature of container.children || []) {
    if (feature.isSequenceFeatureGlyph() && feature.value) {
      edges.push({ container: containerUri, referenced: feature.value });
    }
  }
}

export function cyclicDefinitionReferences(edges: DefinitionReferenceEdge[]): DefinitionReferenceEdge[] {
  const adjacency = new Map<string, string[]>();
  for (const { container, referenced } of edges) {
    const known = adjacency.get(container);
    if (known) {
      known.push(referenced);
    } else {
      adjacency.set(container, [referenced]);
    }
  }
  const component = new Map<string, number>();
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  let counter = 0;
  const visit = (uri: string): void => {
    index.set(uri, counter);
    low.set(uri, counter++);
    stack.push(uri);
    onStack.add(uri);
    for (const next of adjacency.get(uri) || []) {
      if (!index.has(next)) {
        visit(next);
        low.set(uri, Math.min(low.get(uri), low.get(next)));
      } else if (onStack.has(next)) {
        low.set(uri, Math.min(low.get(uri), index.get(next)));
      }
    }
    if (low.get(uri) === index.get(uri)) {
      let member: string;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.set(member, index.get(uri));
      } while (member !== uri);
    }
  };
  for (const uri of adjacency.keys()) {
    if (!index.has(uri)) visit(uri);
  }
  return edges.filter(({ container, referenced }) =>
    container === referenced || component.get(container) === component.get(referenced));
}

export function objectTypesAtUri(dictionaries: DesignDictionaries, uri: string): string[] {
  const types: string[] = [];
  const identified = dictionaries.info[uri];
  if (identified) {
    types.push('partRole' in identified ? 'ComponentDefinition' : 'ModuleDefinition');
  }
  if (dictionaries.interactions[uri]) {
    types.push('Interaction');
  }
  if (dictionaries.events[uri]) {
    types.push('Event');
  }
  return types;
}
