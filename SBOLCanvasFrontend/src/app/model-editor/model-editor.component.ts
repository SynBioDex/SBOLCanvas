import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { GlyphInfo } from '../glyphInfo';
import { InteractionInfo } from '../interactionInfo';
import { CELL_REFERENCE_PREFIX, EventInfo } from '../eventInfo';
import { MetadataService } from '../metadata.service';
import { GraphService } from '../graph.service';
import { registerInputSave } from '../input-save.util';
import { SimulationField, SimulationValue, parseSimulationValue } from '../simulation-parameters';
import { isModifierRole } from '../validation/rules';

type Side = 'source' | 'target';

@Component({
  selector: 'app-model-editor',
  templateUrl: './model-editor.component.html',
  styleUrls: ['./model-editor.component.css']
})
export class ModelEditorComponent implements OnInit, OnDestroy {

  glyphInfo: GlyphInfo | null = null;
  interactionInfo: InteractionInfo | null = null;
  eventInfo: EventInfo | null = null;
  validationErrors: Record<string, string> = {};
  private readonly subscriptions = new Subscription();
  private teardownSave: (() => void) | null = null;
  private speciesOptionsCache: { key: string; options: { value: string; label: string }[] } | null = null;

  constructor(
    public graphService: GraphService,
    public metadataService: MetadataService,
    private changeDetector: ChangeDetectorRef,
    private elementRef: ElementRef
  ) { }

  ngOnInit() {
    this.subscriptions.add(this.metadataService.selectedGlyphInfo.subscribe(info => {
      this.glyphInfo = info;
      this.validationErrors = {};
      this.changeDetector.detectChanges();
    }));
    this.subscriptions.add(this.metadataService.selectedInteractionInfo.subscribe(info => {
      this.interactionInfo = info;
      this.validationErrors = {};
      this.changeDetector.detectChanges();
    }));
    this.subscriptions.add(this.metadataService.selectedEventInfo.subscribe(info => {
      this.eventInfo = info;
      this.validationErrors = {};
      this.changeDetector.detectChanges();
    }));
    this.teardownSave = registerInputSave(this.elementRef);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.teardownSave?.();
  }

  fields(): SimulationField[] {
    const config = this.metadataService.simulationConfig;
    if (this.eventInfo) return config.event;
    if (this.glyphInfo) {
      const fields = this.graphService.isSelectedAMolecularSpecies() ? config.species || [] : [];
      return this.metadataService.isPromoter(this.glyphInfo) ? fields.concat(config.Promoter || []) : fields;
      }
    if (this.interactionInfo) {
      const rule = this.metadataService.interactionRules[this.interactionInfo.interactionType];
      if (rule?.massAction && !this.graphService.isSelectedReactionOwner()) return [];
      return config[this.interactionInfo.interactionType] || [];
    }
    return [];
  }

  fieldValue(field: SimulationField): SimulationValue | undefined {
    const info = this.eventInfo || this.glyphInfo || this.interactionInfo;
    return info?.simulationData?.[field.key] ?? field.default;
  }

  fieldChange(field: SimulationField, raw: unknown) {
    const selected = this.eventInfo || this.glyphInfo || this.interactionInfo;
    if (!selected) return;
    try {
      const value = parseSimulationValue(raw, field);
      const copy = selected.makeCopy();
      if (value === undefined) delete copy.simulationData[field.key];
      else copy.simulationData[field.key] = value;
      delete this.validationErrors[field.key];
      this.graphService.setSelectedCellInfo(copy);
    } catch (error) {
      this.validationErrors[field.key] = error.message;
      this.changeDetector.detectChanges();
    }
  }

  participantSides(): Side[] {
    const edge = this.graphService.graph?.getSelectionCell();
    if (!this.interactionInfo || !edge?.isEdge()) return [];
    const sides: Side[] = [];
    if (!edge.getTerminal(true)?.isInteractionNode()) sides.push('source');
    if (!this.metadataService.interactionRules[this.interactionInfo.interactionType].targetless &&
        !edge.getTerminal(false)?.isInteractionNode()) sides.push('target');
    return sides;
  }

  roleValue(side: Side): string {
    const info = this.interactionInfo;
    const values = side === 'source' ? info.sourceRefinement : info.targetRefinement;
    return values[this.graphService.getSelectedCellID()] || this.metadataService.interactionRules[info.interactionType][side].defaultRole;
  }

  roleChange(side: Side, value: string) {
    const info = this.interactionInfo;
    if (!info) return;
    const rule = this.metadataService.interactionRules[info.interactionType][side];
    if (!rule.roles.includes(value)) return;
    const copy = info.makeCopy();
    const refinements = side === 'source' ? copy.sourceRefinement : copy.targetRefinement;
    const edgeId = this.graphService.getSelectedCellID();
    if (value === rule.defaultRole) delete refinements[edgeId];
    else refinements[edgeId] = value;
    this.graphService.setSelectedCellInfo(copy);
  }

  coefficientValue(side: Side): number | undefined {
    const coefficients = side === 'source' ? this.interactionInfo.sourceCoefficient : this.interactionInfo.targetCoefficient;
    return coefficients[this.graphService.getSelectedCellID()]
      ?? this.metadataService.interactionRules[this.interactionInfo.interactionType][side].coefficientDefault;
  }

  isModifierRole(side: Side): boolean {
    return isModifierRole(this.metadataService.interactionRules[this.interactionInfo.interactionType], this.roleValue(side));
  }

  coefficientChange(side: Side, field: SimulationField, raw: unknown) {
    if (!this.interactionInfo) return;
    const errorKey = side + ':' + field.key;
    try {
      const value = parseSimulationValue(raw, field);
      const copy = this.interactionInfo.makeCopy();
      const coefficients = side === 'source' ? copy.sourceCoefficient : copy.targetCoefficient;
      const edgeId = this.graphService.getSelectedCellID();
      if (value === undefined) delete coefficients[edgeId];
      else coefficients[edgeId] = value as number;
      delete this.validationErrors[errorKey];
      this.graphService.setSelectedCellInfo(copy);
    } catch (error) {
      this.validationErrors[errorKey] = error.message;
      this.changeDetector.detectChanges();
    }
  }

  interactionTypeChange(value: string) {
    if (this.interactionInfo && this.graphService.isInteractionTypeAllowed(value)) {
      const copy = this.interactionInfo.makeCopy();
      copy.interactionType = value;
      this.graphService.setSelectedCellInfo(copy);
    }
  }

  massActionTypes(): string[] {
    const interactionTypes = Object.keys(this.metadataService.interactionRules).filter(interactionType => this.metadataService.interactionRules[interactionType].massAction);
    const selected = this.graphService.graph?.getSelectionCell();
    return selected?.isInteractionNode() ? interactionTypes.filter(interactionType => interactionType !== 'Process') : interactionTypes;
  }

  targetSpeciesOptions(): { value: string; label: string }[] {
    const instances = this.graphService.getSpeciesInstances();
    const key = JSON.stringify(instances.map(instance => [instance.cellId, instance.label]));
    if (this.speciesOptionsCache?.key === key) return this.speciesOptionsCache.options;
    const labelUse = new Map<string, number>();
    for (const instance of instances) labelUse.set(instance.label, (labelUse.get(instance.label) || 0) + 1);
    const options = instances.map(instance => ({
      value: CELL_REFERENCE_PREFIX + instance.cellId,
      label: labelUse.get(instance.label) > 1 ? `${instance.label} (cell:${instance.cellId})` : instance.label
    }));
    this.speciesOptionsCache = { key, options };
    return options;
  }
}
