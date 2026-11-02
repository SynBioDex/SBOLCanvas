import type { mxCell, mxGraph } from 'src/mxgraph';
import { GlyphInfo } from '../glyphInfo';
import { InteractionInfo } from '../interactionInfo';
import { EventInfo, CELL_REFERENCE_PREFIX, isCellReference } from '../eventInfo';
import { ModuleInfo } from '../moduleInfo';
import { MetadataService, PROMOTER_ROLE } from '../metadata.service';
import type { SimulationField } from '../simulation-parameters';
import {
  CYCLE_COMPONENT_MESSAGE,
  CYCLE_MODULE_MESSAGE,
  Finding,
  DesignDictionaries,
  Issue,
  ReactionParticipant,
  SharedRateSet,
  checkBackbone,
  checkComponent,
  checkConnection,
  checkReaction,
  cyclicDefinitionReferences,
  definitionReferenceEdges,
  isReactionOwner,
  sharedRateConflicts,
  sharedRateValues,
  objectTypesAtUri,
} from './rules';

export function collectDesignFindings(graph: mxGraph, dictionaries: DesignDictionaries, metadata: MetadataService): Finding[] {
  const findings: Finding[] = [];
  const rules = metadata.interactionRules;
  const seenFeatures = new Set<string>();
  const rateSets: { rateSet: SharedRateSet; viewId: string; }[] = [];
  const located = new Map<string, { viewId: string; cellId: string; }>();
  const views = orderedViews(graph);
  for (const view of viewCells(graph)) {
    for (const cell of descendantsOf(view)) {
      if (cell.value && !located.has(cell.value)) located.set(cell.value, { viewId: view.getId(), cellId: cell.getId() });
    }
  }

  for (const view of views) {
    const viewId = view.getId();
    const add = (issue: Issue, cellId: string, enforced: boolean) =>
      findings.push(toFinding(issue, viewId, cellId, enforced));
    const cells = descendantsOf(view);
    for (const issue of backboneIssues(cells, dictionaries, metadata)) add(issue.issue, issue.cellId, false);

    for (const cell of cells) {
      if (cell.isEvent()) {
        if (!view.isModuleView()) {
          add({ code: 'event-owner', severity: 'error', message: 'An Event must belong to a module view.' }, cell.getId(), true);
        }
        const target = dictionaries.events[cell.value]?.simulationData?.['targetSpecies'];
        const species = isCellReference(target) ? graph.getModel().getCell(target.slice(CELL_REFERENCE_PREFIX.length)) : null;
        if (!species || !species.isMolecularSpeciesGlyph()) {
          add({
            code: 'event-target-missing', severity: 'warning', field: 'simulationData.targetSpecies',
            message: 'This Event has no target species, so simulation ignores it.'
          }, cell.getId(), false);
        }
      }
      if (cell.isSequenceFeatureGlyph() && !seenFeatures.has(cell.value) && dictionaries.info[cell.value] instanceof GlyphInfo) {
        seenFeatures.add(cell.value);
        for (const issue of checkComponent(dictionaries.info[cell.value] as GlyphInfo)) add(issue, cell.getId(), false);
      }
      for (const issue of connectionWarnings(graph, cell, dictionaries)) add(issue, cell.getId(), false);
      if (!rules || !cell.isInteraction()) continue;
      const edgeInfo = dictionaries.interactions[cell.value];
      if (edgeInfo && Object.prototype.hasOwnProperty.call(rules, edgeInfo.interactionType)) {
        for (const issue of checkConnection(edgeInfo.interactionType, cell.source, cell.target, rules,
          { source: !!cell.source?.isModule(), target: !!cell.target?.isModule() })) add(issue, cell.getId(), true);
      }
    }

    if (!rules) continue;
    for (const owner of cells.filter(cell => cell.value && isReactionOwner(cell))) {
      const info = dictionaries.interactions[owner.value];
      if (!(info instanceof InteractionInfo)) continue;
      const participants = participantsOf(graph, owner);
      for (const issue of checkReaction(info, participants, rules)) add(issue, owner.getId(), true);
      const rateSet = sharedRateValues(owner.getId(), info, participants, rules, metadata.simulationConfig || {});
      if (rateSet) rateSets.push({ rateSet, viewId });
    }
  }

  const locate = (key: string) => located.get(key) ?? { viewId: viewCells(graph)[0]?.getId() ?? '', cellId: key };
  for (const conflict of sharedRateConflicts(rateSets.map(owner => owner.rateSet))) {
    const viewId = rateSets.find(owner => owner.rateSet.ownerCellId === conflict.ownerCellId).viewId;
    findings.push(toFinding({ code: 'shared-rate-conflict', severity: 'error', field: conflict.field, message: conflict.message },
      viewId, conflict.ownerCellId, true));
  }
  for (const uri of new Set([...Object.keys(dictionaries.info), ...Object.keys(dictionaries.interactions), ...Object.keys(dictionaries.events)])) {
    const types = objectTypesAtUri(dictionaries, uri);
    if (types.length > 1) {
      const at = locate(uri);
      findings.push(toFinding({
        code: 'uri-conflict', severity: 'error',
        message: `The part ${uri} already exists as ${/^[AEIOU]/.test(types[1]) ? 'an' : 'a'} ${types[1]}!`
      }, at.viewId, at.cellId, true));
    }
  }
  for (const reference of cyclicDefinitionReferences(definitionReferenceEdges(graph))) {
    const at = locate(reference.referenced);
    findings.push(toFinding({
      code: 'definition-cycle', severity: 'error',
      message: dictionaries.info[reference.container] instanceof ModuleInfo ? CYCLE_MODULE_MESSAGE : CYCLE_COMPONENT_MESSAGE
    },
      at.viewId, at.cellId, true));
  }
  for (const { uri, issue } of valueRangeIssues(dictionaries, metadata)) {
    const at = locate(uri);
    findings.push(toFinding(issue, at.viewId, at.cellId, true));
  }
  return findings;
}

function viewCells(graph: mxGraph): mxCell[] {
  const top = graph.getModel().getCell(1);
  return ((top && top.children) || []).filter(cell => cell.isViewCell());
}

function orderedViews(graph: mxGraph): mxCell[] {
  const views = viewCells(graph);
  const current = graph.getCurrentRoot();
  if (!current || !views.includes(current)) {
    return views;
  }
  return [current, ...views.filter(view => view !== current)];
}

function descendantsOf(view: mxCell): mxCell[] {
  const out: mxCell[] = [];
  const walk = (cell: mxCell): void => {
    for (const child of cell.children || []) {
      out.push(child);
      walk(child);
    }
  };
  walk(view);
  return out;
}

function connectionWarnings(graph: mxGraph, cell: mxCell, dictionaries: DesignDictionaries): Issue[] {
  const info = dictionaries.interactions[cell.value];
  if (!info) return [];
  const type = info.interactionType;
  const nameOf = (end: mxCell | null) => (end && dictionaries.info[end.value]?.getDisplayName()) || 'unknown';
  if (cell.isInteraction() && (!cell.source || (!cell.target && type !== 'Degradation'))) {
    return [{
      code: 'edge-free-end', severity: 'warning',
      message: `${type} edge on '${nameOf(cell.source || cell.target)}': ${!cell.source ? 'no source' : 'no target'}`
    }];
  }
  if (!cell.isInteractionNode() || (type !== 'Biochemical Reaction' && type !== 'Non-Covalent Binding')) return [];
  const edges = graph.getModel().getEdges(cell) || [];
  const incoming = edges.filter(edge => edge.target === cell);
  const outgoing = edges.filter(edge => edge.source === cell);
  const reactants = incoming.filter(edge => edge.source).map(edge => nameOf(edge.source) === 'unknown' ? '?' : nameOf(edge.source)).join(', ') || 'none';
  const issues: Issue[] = [];
  if (outgoing.length === 0 || !outgoing[0].target) {
    issues.push({ code: 'complex-no-product', severity: 'warning', message: `Complex formation (${reactants}): no product connection` });
  }
  for (const edge of incoming.filter(edge => !edge.source)) {
    issues.push({ code: 'complex-loose-reactant', severity: 'warning', message: `Complex formation (${reactants}): disconnected reactant edge` });
  }
  return issues;
}

function backboneIssues(cells: mxCell[], dictionaries: DesignDictionaries, metadata: MetadataService): { issue: Issue; cellId: string; }[] {
  const productionEdges = cells.filter(cell => cell.isInteraction()
    && dictionaries.interactions[cell.value]?.interactionType === 'Genetic Production');
  const out: { issue: Issue; cellId: string; }[] = [];
  for (const container of cells.filter(cell => cell.isCircuitContainer())) {
    const glyphs = (container.children || []).filter(child => child.isSequenceFeatureGlyph());
    if (glyphs.length === 0) continue;
    const containerInfo = dictionaries.info[container.value];
    const name = containerInfo && containerInfo.displayID ? String(containerInfo.displayID) : 'unnamed';
    const hasPromoter = glyphs.some(glyph => {
      const info = dictionaries.info[glyph.value];
      return info instanceof GlyphInfo && metadata.isPromoter(info);
    });
    const hasProduction = productionEdges.some(edge => edge.source && glyphs.includes(edge.source) && edge.target);
    for (const issue of checkBackbone(name, hasPromoter, hasProduction)) out.push({ issue, cellId: container.getId() });
  }
  return out;
}

export function participantsOf(graph: mxGraph, owner: mxCell): ReactionParticipant[] {
  const edges = owner.isInteraction() ? [owner, owner] : ((graph.getModel().getEdges(owner) || []) as mxCell[]);
  return edges.map((edge, index) => {
    const incoming = owner.isInteraction() ? index === 0 : edge.target === owner;
    const terminal = incoming ? edge.source : edge.target;
    return { edgeId: edge.getId(), incoming, moduleEndpoint: !!terminal?.isModule(), cell: terminal };
  });
}

function valueRangeIssues(dictionaries: DesignDictionaries, metadata: MetadataService): { uri: string; issue: Issue; }[] {
  const config = metadata.simulationConfig || {};
  const out: { uri: string; issue: Issue; }[] = [];
  const check = (uri: string, value: unknown, field: SimulationField, path: string): void => {
    if (value === undefined) return;
    let message: string | null = null;
    if (field.type === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) message = `${field.label} must be a finite number`;
      else if (field.min !== undefined && value < field.min) message = `${field.label} must be ≥ ${field.min}`;
    } else if (field.type === 'boolean') {
      if (typeof value !== 'boolean') message = `${field.label} must be true or false`;
    } else if (!isCellReference(value)) {
      message = `${field.label} must reference a species instance`;
    }
    if (message) out.push({ uri, issue: { code: 'value-range', severity: 'error', field: path, message } });
  };
  const interactionFields = new Map<string, SimulationField>();
  for (const interactionType of Object.keys(metadata.interactionRules || {})) {
    for (const field of config[interactionType] || []) {
      if (!interactionFields.has(field.key)) interactionFields.set(field.key, field);
    }
  }
  const coefficient = (config.participation || []).find(field => field.key === 'coefficient');
  const records: [string, GlyphInfo | InteractionInfo | EventInfo, SimulationField[]][] = [
    ...Object.entries(dictionaries.info).filter(([, info]) => info instanceof GlyphInfo)
      .map(([uri, info]) => [uri, info as GlyphInfo, [...(config.species || []), ...(config.Promoter || [])]] as [string, GlyphInfo, SimulationField[]]),
    ...Object.entries(dictionaries.interactions)
      .map(([uri, info]) => [uri, info, [...interactionFields.values()]] as [string, InteractionInfo, SimulationField[]]),
    ...Object.entries(dictionaries.events)
      .map(([uri, info]) => [uri, info, config.event || []] as [string, EventInfo, SimulationField[]]),
  ];
  for (const [uri, record, fields] of records) {
    for (const field of fields) check(uri, record.simulationData?.[field.key], field, `simulationData.${field.key}`);
    if (record instanceof InteractionInfo && coefficient) {
      for (const side of ['sourceCoefficient', 'targetCoefficient'] as const) {
        for (const edgeId of Object.keys(record[side])) check(uri, record[side][edgeId], coefficient, `${side}.${edgeId}`);
      }
    }
  }
  return out;
}

function toFinding(issue: Issue, viewId: string, cellId: string, enforced: boolean): Finding {
  return {
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    enforced,
    location: { viewId, cellId, field: issue.field },
  };
}
