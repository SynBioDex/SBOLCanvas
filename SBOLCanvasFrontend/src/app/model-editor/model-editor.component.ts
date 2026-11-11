import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { GlyphInfo } from '../glyphInfo';
import { InteractionInfo, ParticipantSide } from '../interactionInfo';
import { EventInfo } from '../eventInfo';
import { MetadataService } from '../metadata.service';
import { GraphService } from '../graph.service';
import { registerInputSave } from '../input-save.util';
import { SimulationField, SimulationValue, parseSimulationValue } from '../simulation-parameters';
import { isModifierRole } from '../validation/rules';

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

  coefficientValue(side: ParticipantSide): number | undefined {
    const coefficients = side === 'source' ? this.interactionInfo.sourceCoefficient : this.interactionInfo.targetCoefficient;
    return coefficients[this.graphService.getSelectedCellID()]
      ?? this.metadataService.interactionRules[this.interactionInfo.interactionType][side].coefficientDefault;
  }

  isModifierRole(side: ParticipantSide): boolean {
    return isModifierRole(this.metadataService.interactionRules[this.interactionInfo.interactionType],
      this.graphService.selectedParticipantRole(this.interactionInfo, side));
  }

  coefficientChange(side: ParticipantSide, field: SimulationField, raw: unknown) {
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

  targetSpeciesOptions(): { value: string; label: string }[] {
    const targets = this.graphService.getSpeciesTargets();
    const key = JSON.stringify(targets);
    if (this.speciesOptionsCache?.key === key) return this.speciesOptionsCache.options;
    const nameUse = new Map<string, number>();
    for (const target of targets) nameUse.set(target.name, (nameUse.get(target.name) || 0) + 1);
    const options = targets.map(target => ({
      value: target.uri,
      label: nameUse.get(target.name) > 1 ? `${target.name} (${target.displayID})` : target.name
    }));
    this.speciesOptionsCache = { key, options };
    return options;
  }
}
