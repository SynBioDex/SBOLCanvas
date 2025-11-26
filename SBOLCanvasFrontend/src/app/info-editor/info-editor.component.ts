import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { GlyphInfo } from '../glyphInfo';
import { InteractionInfo } from '../interactionInfo';
import { MetadataService } from '../metadata.service';
import { GraphService } from '../graph.service';
import { FilesService } from '../files.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { DownloadGraphComponent } from '../download-graph/download-graph.component';
import { ModuleInfo } from '../moduleInfo';
import { environment } from 'src/environments/environment';
import { CombinatorialDesignEditorComponent } from '../combinatorial-design-editor/combinatorial-design-editor.component';
// import { ThrowStmt } from '@angular/compiler';

import { FormControl, Validators } from '@angular/forms';

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
  selector: 'app-info-editor',
  templateUrl: './info-editor.component.html',
  styleUrls: ['./info-editor.component.css']
})

export class InfoEditorComponent implements OnInit {

  registries: string[];

  // placeholders that get generated from http calls
  partTypes: string[];
  partRoles: string[];
  partRefinements: string[]; // these depend on role
  filteredPartRefinements: string[];
  interactionTypes: string[];
  filteredInteractionTypes: string[];
  interactionRoles: {};
  interactionSourceRefinements: String[];
  interactionTargetRefinements: String[];
  simulationConfig: SimulationConfig = {};

  // Parameter definitions
  promoterParams = PROMOTER_PARAMS;
  inhibitionParams = INHIBITION_PARAMS;
  stimulationParams = STIMULATION_PARAMS;
  complexNodeParams = COMPLEX_NODE_PARAMS;
  complexEdgeParams = COMPLEX_EDGE_PARAMS;

  // TODO get these from the backend
  encodings: string[];

  glyphInfo: GlyphInfo;
  moduleInfo: ModuleInfo;
  interactionInfo: InteractionInfo;
  glyphCtrl: FormControl;


  constructor(private graphService: GraphService, private metadataService: MetadataService, private filesService: FilesService, public dialog: MatDialog, private changeDetector: ChangeDetectorRef) { }

  ngOnInit() {
    this.metadataService.selectedGlyphInfo.subscribe(glyphInfo => this.glyphInfoUpdated(glyphInfo));
    this.metadataService.selectedInteractionInfo.subscribe(interactionInfo => this.interactionInfoUpdated(interactionInfo));
    this.metadataService.selectedModuleInfo.subscribe(moduleInfo => this.moduleInfoUpdated(moduleInfo));
    this.filesService.getRegistries().subscribe(result => this.registries = result);
    this.getTypes();
    this.getRoles();
    this.getInteractions();
    this.getInteractionRoles();
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

  getTypes() {
    this.metadataService.loadTypes().subscribe(types => this.partTypes = types.filter(type => type != "Circular" && type != "Chromosomal"));
  }

  getRoles() {
    this.metadataService.loadRoles().subscribe(roles => {
      this.partRoles = roles.filter(role => !role.includes("Cir (Circular Backbone Left") && !role.includes("Cir (Circular Backbone Right)"));
    });
  }

  getRefinements(role: string) {
    this.metadataService.loadRefinements(role).subscribe(refinements => {
      this.partRefinements = refinements
      this.filteredPartRefinements = refinements
    });
  }

  getInteractions() {
    this.metadataService.loadInteractions().subscribe(interactions => this.interactionTypes = interactions);
  }

  getInteractionRoles() {
    this.metadataService.loadInteractionRoles().subscribe(interactionRoles => this.interactionRoles = interactionRoles);
  }

  getInteractionSourceRefinements(sourceRole: string) {
    this.metadataService.loadInteractionRoleRefinements(sourceRole).subscribe(sourceRefinements => this.interactionSourceRefinements = sourceRefinements);
  }

  getInteractionTargetRefinements(targetRole: string) {
    this.metadataService.loadInteractionRoleRefinements(targetRole).subscribe(targetRefinements => this.interactionTargetRefinements = targetRefinements);
  }

  dropDownChange(event: MatSelectChange) {
    this.filteredPartRefinements = this.partRefinements // Reset filter input when clicking on dropdown again
    const id = event.source.id;
    switch (id) {
      case 'partType': {
        this.glyphInfo.partType = event.value;
        break;
      }
      case 'partRole': {
        this.glyphInfo.partRole = event.value;
        this.glyphInfo.partRefine = '';
        if (event.value !== '') {
          this.getRefinements(event.value);
        } else {
          this.partRefinements = [];
        }
        break;
      }
      case 'partRefinement': {
        if (event.value != 'none') {
          this.glyphInfo.partRefine = event.value;
        }
        break;
      }
      case 'interactionType': {
        this.interactionInfo.interactionType = event.value;
        this.getInteractionSourceRefinements(event.value);
        this.getInteractionTargetRefinements(event.value);
        break;
      }
      case 'interactionSourceRefinement': {
        this.interactionInfo.sourceRefinement[this.graphService.getSelectedCellID()] = event.value;
        break;
      }
      case 'interactionTargetRefinement': {
        this.interactionInfo.targetRefinement[this.graphService.getSelectedCellID()] = event.value;
        break;
      } default: {
        console.log('Unexpected id encountered in info menu dropdown = ' + id);
        break;
      }
    }

    if (this.glyphInfo != null) {
      this.graphService.setSelectedCellInfo(this.glyphInfo);
    } else if (this.interactionInfo != null) {
      this.graphService.setSelectedCellInfo(this.interactionInfo);
    }
  }


  inputChange(event: any, componentId?: string) {
    // Material Checkboxes do not have an event.target, use componentId 
    const id = componentId ? componentId : (event.target ? event.target.id : event.source.id);
   
    switch (id) {
      case 'displayID': {
        const replaced = event.target.value.replace(/[\W_]+/g, '_');
        if (this.glyphInfo != null) {
          if(replaced !== ''){
            //this.promptDisplayID();  
            this.glyphInfo.displayID = replaced;
          }
        } else if (this.interactionInfo != null) {
          this.interactionInfo.displayID = replaced;
        } else if (this.moduleInfo) {
          this.moduleInfo.displayID = replaced;
        }
        break;
      }
      case 'name': {
        if (this.glyphInfo)
          this.glyphInfo.name = event.target.value;
        else if (this.moduleInfo)
          this.moduleInfo.name = event.target.value;
        break;
      }
      case 'description': {
        if (this.glyphInfo)
          this.glyphInfo.description = event.target.value;
        else if (this.moduleInfo)
          this.moduleInfo.description = event.target.value;
        break;
      }
      case 'version': {
        if (this.glyphInfo)
          this.glyphInfo.version = event.target.value;
        else if (this.moduleInfo)
          this.moduleInfo.version = event.target.value;
        break;
      }
      case 'sequence': {
        this.glyphInfo.sequence = event.target.value;
        break;
      }
      default: {
        console.log('Unexpected id encountered in info menu input = ' + id);
        break;
      }
    }

    if (this.glyphInfo != null) {
      this.graphService.setSelectedCellInfo(this.glyphInfo);
    } else if (this.interactionInfo != null) {
      this.graphService.setSelectedCellInfo(this.interactionInfo);
    } else if (this.moduleInfo != null) {
      this.graphService.setSelectedCellInfo(this.moduleInfo);
    }
  }

  openDownloadDialog(moduleMode: boolean = false) {
    this.dialog.open(DownloadGraphComponent, {
      data: {
        mode: DownloadGraphComponent.IMPORT_MODE,
        type: moduleMode ? DownloadGraphComponent.MODULE_TYPE : DownloadGraphComponent.COMPONENT_TYPE,
        info: moduleMode ? null : this.glyphInfo
      }
    });
  }

  isCombinatorialPossible(): boolean {
    // TODO remove the check that root is a component when enumeration makes sense in module designs
    return this.graphService.isSelectedAGlyph() && this.graphService.isRootAComponentView();
  }

  openCombinatorialDialog() {
    this.dialog.open(CombinatorialDesignEditorComponent).afterClosed().subscribe(_ => {
      this.graphService.repaint();
    });
  }

  /**
   * Updates both the glyph info in the form and in the graph.
   * @param glyphInfo
   */
  glyphInfoUpdated(glyphInfo: GlyphInfo) {
    this.glyphInfo = glyphInfo;
    
    this.glyphCtrl = new FormControl( `${this.glyphInfo?.displayID}`, Validators.required);
    if (glyphInfo != null) {
      if (glyphInfo.partRole != null) {
        if(this.glyphInfo.partRole.includes("Cir (Circular Backbone")) {
          // fixes the part role name so it will show up in the info-editor
          this.glyphInfo.partRole = "Cir (Circular Backbone)";

          // for some reason part refinements are not gotten for circular backbones correctly
          if(this.glyphInfo.partRefine !== undefined && !this.partRefinements.includes(this.glyphInfo.partRefine)) {
            // if partRefine is not undefined the part refinement list needs to be manually set
            this.partRefinements = [this.glyphInfo.partRefine];
          }
        }

        if(this.glyphInfo.partRefine == undefined) this.getRefinements(this.glyphInfo.partRole);
      } else {
        this.partRefinements = [];
      }
      if (!this.glyphInfo.simulationData) this.glyphInfo.simulationData = {};
    }

    // this needs to be called because we may have gotten here from an async function
    // an async function doesn't update the view for some reason
    this.changeDetector.detectChanges();
  }

  /**
   * Updates both the module info in the form and in the graph.
   */
  moduleInfoUpdated(moduleInfo: ModuleInfo) {
    this.moduleInfo = moduleInfo;
    // this needs to be called because we may have gotten here from an async function
    // an async function doesn't update the view for some reason
    this.changeDetector.detectChanges();
  }

  /**
   * Updates both the interaction info in the form and in the graph.
   */
  interactionInfoUpdated(interactionInfo: InteractionInfo) {
    this.interactionInfo = interactionInfo;
    if (interactionInfo != null) {
      if (interactionInfo.interactionType != null) {
        this.getInteractionSourceRefinements(this.getSourceInteractionRole());
        this.getInteractionTargetRefinements(this.getTargetInteractionRole());
      } else {
        this.interactionSourceRefinements = [];
        this.interactionTargetRefinements = [];
      }

      // filter valid interaction types
      this.filteredInteractionTypes = [];
      for (let type of this.interactionTypes) {
        if (this.graphService.isInteractionTypeAllowed(type)) {
          this.filteredInteractionTypes.push(type);
        }
      }
      if (!this.interactionInfo.simulationData) this.interactionInfo.simulationData = {};
    }

    // this needs to be called because we may have gotten here from an async function
    // an async function doesn't update the view for some reason
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

  simulationDataChange(event: any, paramName: string) {
    let value: any;

    // Parse value based on parameter name
    if (paramName === 'boundaryCondition') {
      value = event.checked;
    } else {
      value = parseFloat(event.target.value);
    }

    if (this.glyphInfo != null) {
      if (!this.glyphInfo.simulationData) this.glyphInfo.simulationData = {};
      this.glyphInfo.simulationData[paramName] = value;
      this.graphService.setSelectedCellInfo(this.glyphInfo);
    } else if (this.interactionInfo != null) {
      if (!this.interactionInfo.simulationData) this.interactionInfo.simulationData = {};

      // Use keyed parameter name for per-reactant values on association node edges
      const paramKey = this.getReactantParamKey(paramName);
      this.interactionInfo.simulationData[paramKey] = value;
      this.graphService.setSelectedCellInfo(this.interactionInfo);
    }
  }

  localDesign(): boolean {
    if (this.glyphInfo)
      return this.glyphInfo.uriPrefix === environment.baseURI;
    else if (this.moduleInfo)
      return this.moduleInfo.uriPrefix === environment.baseURI;
    return true;
  }

  synBioHubDesign(): boolean {
    for (let registry of this.registries) {
      if (this.glyphInfo && this.glyphInfo.uriPrefix && this.glyphInfo.uriPrefix.startsWith(registry))
        return true;
      if (this.moduleInfo && this.moduleInfo.uriPrefix && this.moduleInfo.uriPrefix.startsWith(registry))
        return true;
    }
    return false;
  }

  importedDesign(): boolean {
    return !this.localDesign() && !this.synBioHubDesign();
  }

  getSourceInteractionRole() {
    const interactionRole = this.interactionRoles[this.interactionInfo.interactionType]
    const NA = "NA"
    return interactionRole ? interactionRole[0] || NA : NA;
  }

  getTargetInteractionRole() {
    const interactionRole = this.interactionRoles[this.interactionInfo.interactionType]
    const NA = "NA"
    return interactionRole ? interactionRole[1] || NA : NA;
  }

  hasSourceRefinements(): boolean {
    return this.interactionSourceRefinements && this.interactionSourceRefinements.length > 0;
  }

  hasTargetRefinements(): boolean {
    return this.interactionTargetRefinements && this.interactionTargetRefinements.length > 0;
  }

  applyFilter(filterValue: string){
    this.filteredPartRefinements = this.partRefinements.filter(refinements => 
      refinements.toLowerCase().includes(filterValue.toLowerCase()))
  }

  isMolecularSpecies(): boolean {
    return this.graphService.isSelectedAMolecularSpecies();
  }

  isInteractionNode(): boolean {
    return this.graphService.isSelectedAnInteractionNode();
  }
}
