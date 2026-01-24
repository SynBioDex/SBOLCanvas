import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { GlyphInfo } from '../glyphInfo';
import { InteractionInfo } from '../interactionInfo';
import { EventInfo } from '../eventInfo';
import { MetadataService } from '../metadata.service';
import { GraphService } from '../graph.service';

/**
 * Type for parameter configuration values (keyed by parameter name, values are numbers)
 */
interface ParameterConfig {
  [paramName: string]: number;
}

/**
 * Type for simulation configuration (keyed by role/interaction type name)
 */
interface SimulationConfig {
  [roleOrType: string]: ParameterConfig;
}

/**
 * Definition for a simulation parameter input field
 */
interface ParamDef {
  name: string;
  label: string;
}

/**
 * The following simulation parameter names and labels are from iBioSim
 */
const PROMOTER_PARAMS: ParamDef[] = [
  { name: 'ng', label: 'Initial promoter count (ng)' },
  { name: 'np', label: 'Stoichiometry of production (np)' },
  { name: 'nr', label: 'Initial RNAP count (nr)' },
  { name: 'ko', label: 'Open complex production rate (ko)' },
  { name: 'kb', label: 'Basal production rate (kb)' },
  { name: 'ka', label: 'Activated production rate (ka)' },
  { name: 'Ko_f', label: 'RNAP binding rate forward (Ko_f)' },
  { name: 'Ko_r', label: 'RNAP binding rate reverse (Ko_r)' },
  { name: 'Kao_f', label: 'Activated RNAP binding rate forward (Kao_f)' },
  { name: 'Kao_r', label: 'Activated RNAP binding rate reverse (Kao_r)' }
];

const INHIBITION_PARAMS: ParamDef[] = [
  { name: 'Kr_f', label: 'Repression binding forward (Kr_f)' },
  { name: 'Kr_r', label: 'Repression binding reverse (Kr_r)' },
  { name: 'nc', label: 'Stoichiometry of binding (nc)' }
];

const STIMULATION_PARAMS: ParamDef[] = [
  { name: 'Ka_f', label: 'Activation binding forward (Ka_f)' },
  { name: 'Ka_r', label: 'Activation binding reverse (Ka_r)' },
  { name: 'nc', label: 'Stoichiometry of binding (nc)' }
];

// params on the arrows to the node (per-reactant)
const COMPLEX_EDGE_PARAMS: ParamDef[] = [
  { name: 'nc', label: 'Stoichiometry of binding (nc)' }
];

// params on the association node (per-reaction)
const COMPLEX_NODE_PARAMS: ParamDef[] = [
  { name: 'Kc_f', label: 'Complex formation forward (Kc_f)' },
  { name: 'Kc_r', label: 'Complex formation reverse (Kc_r)' }
];

@Component({
  selector: 'app-model-editor',
  templateUrl: './model-editor.component.html',
  styleUrls: ['./model-editor.component.css']
})
export class ModelEditorComponent implements OnInit {

  glyphInfo: GlyphInfo;
  interactionInfo: InteractionInfo;
  eventInfo: EventInfo;
  simulationConfig: SimulationConfig = {};

  validationErrors: { [fieldId: string]: string } = {};

  promoterParams = PROMOTER_PARAMS;
  inhibitionParams = INHIBITION_PARAMS;
  stimulationParams = STIMULATION_PARAMS;
  complexNodeParams = COMPLEX_NODE_PARAMS;
  complexEdgeParams = COMPLEX_EDGE_PARAMS;

  constructor(
    private graphService: GraphService,
    private metadataService: MetadataService,
    private changeDetector: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.metadataService.selectedGlyphInfo.subscribe(glyphInfo => this.glyphInfoUpdated(glyphInfo));
    this.metadataService.selectedInteractionInfo.subscribe(interactionInfo => this.interactionInfoUpdated(interactionInfo));
    this.metadataService.selectedEventInfo.subscribe(eventInfo => this.eventInfoUpdated(eventInfo));
    this.getSimulationConfig();
  }

  getSimulationConfig() {
    this.metadataService.loadSimulationConfig().subscribe(config => {
      this.simulationConfig = config;
    });
  }

  getDefaultValue(roleOrType: string, paramName: string): number {
    if (!this.simulationConfig) {
      throw new Error('Simulation config not loaded');
    }
    if (!this.simulationConfig[roleOrType]) {
      throw new Error(`No simulation config for: ${roleOrType}`);
    }
    const value = this.simulationConfig[roleOrType][paramName];
    if (value === undefined) {
      throw new Error(`No default value for param: ${paramName} in ${roleOrType}`);
    }
    return value;
  }

  glyphInfoUpdated(glyphInfo: GlyphInfo) {
    this.glyphInfo = glyphInfo;
    this.validationErrors = {};
    if (glyphInfo != null) {
      if (!this.glyphInfo.simulationData) this.glyphInfo.simulationData = {};
    }
    this.changeDetector.detectChanges();
  }

  interactionInfoUpdated(interactionInfo: InteractionInfo) {
    this.interactionInfo = interactionInfo;
    this.validationErrors = {};
    if (interactionInfo != null) {
      if (!this.interactionInfo.simulationData) this.interactionInfo.simulationData = {};
    }
    this.changeDetector.detectChanges();
  }

  eventInfoUpdated(eventInfo: EventInfo) {
    this.eventInfo = eventInfo;
    this.validationErrors = {};
    this.changeDetector.detectChanges();
  }

  /**
   * Each reactant's interaction arrow in Complex Formation has its own parameter values.
   * Example: "nc_<sourceURI>" for the nc parameter on the interaction arrow.
   * Returns the reactant's parameter key, or the parameter name if it is not a reactant.
   */
  private getReactantParamKey(paramName: string): string {
    if (paramName === 'nc') {
      const selectedCell = this.graphService.graph.getSelectionCell();
      if (selectedCell && selectedCell.isEdge && selectedCell.isEdge()) {
        const target = selectedCell.getTerminal(false);
        if (target && target.isInteractionNode && target.isInteractionNode()) {
          const source = selectedCell.getTerminal(true);
          if (source && source.value) {
            return paramName + '_' + source.value;
          }
        }
      }
    }
    return paramName;
  }

  /**
   * Gets an interaction simulation parameter value.
   */
  getInteractionParamValue(paramName: string, roleOrType: string): number {
    const defaultValue = this.getDefaultValue(roleOrType, paramName);
    if (!this.interactionInfo?.simulationData) {
      return defaultValue;
    }
    const paramKey = this.getReactantParamKey(paramName);
    const value = this.interactionInfo.simulationData[paramKey];
    return value !== undefined ? value : defaultValue;
  }

  inputChange(event: any, paramName?: string) {
    const id = paramName || event.target.id;
    let value: any;

    // Parse value based on field type
    if (id === 'boundaryCondition') {
      value = event.checked;
    } else if (['name', 'targetSpecies'].includes(id)) {
      value = event.target.value;
    } else {
      value = parseFloat(event.target.value);
      const error = this.validateNumericParam(id, value);
      if (error) {
        this.validationErrors[id] = error;
        this.changeDetector.detectChanges();
        return;
      }
    }

    delete this.validationErrors[id];

    if (this.eventInfo) {
      // Direct properties (Events)
      switch (id) {
        case 'name': this.eventInfo.name = value; break;
        case 'delay': this.eventInfo.delay = value; break;
        case 'targetSpecies': this.eventInfo.targetSpecies = value; break;
        case 'assignmentValue': this.eventInfo.assignmentValue = value; break;
      }
      this.graphService.setSelectedCellInfo(this.eventInfo);
    } else if (this.glyphInfo) {
      // Simulation data properties (glyphs)
      if (!this.glyphInfo.simulationData) this.glyphInfo.simulationData = {};
      this.glyphInfo.simulationData[id] = value;
      this.graphService.setSelectedCellInfo(this.glyphInfo);
    } else if (this.interactionInfo) {
      // Simulation data properties (interaction lines)
      if (!this.interactionInfo.simulationData) this.interactionInfo.simulationData = {};
      const paramKey = this.getReactantParamKey(id);
      this.interactionInfo.simulationData[paramKey] = value;
      this.graphService.setSelectedCellInfo(this.interactionInfo);
    }
  }

  private validateNumericParam(paramName: string, value: number): string | null {
    if (isNaN(value)) {
      return 'Must be a valid number';
    }
    return null;
  }

  isMolecularSpecies(): boolean {
    return this.graphService.isSelectedAMolecularSpecies();
  }

  isComplexFormation(): boolean {
    return this.interactionInfo?.interactionType === 'Biochemical Reaction'
      || this.interactionInfo?.interactionType === 'Non-Covalent Binding';
  }

  isInteractionNode(): boolean {
    return this.graphService.isSelectedAnInteractionNode();
  }
}
