import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { GlyphInfo } from '../glyphInfo';
import { InteractionInfo } from '../interactionInfo';
import { MetadataService } from '../metadata.service';
import { GraphService } from '../graph.service';
import { FilesService } from '../files.service';
import { MatSelectChange, MatDialog } from '@angular/material';
import { DownloadGraphComponent } from '../download-graph/download-graph.component';
import { ModuleInfo } from '../moduleInfo';
import { environment } from 'src/environments/environment';
import { CombinatorialDesignEditorComponent } from '../combinatorial-design-editor/combinatorial-design-editor.component';
import { ThrowStmt } from '@angular/compiler';


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
  interactionTypes: string[];
  filteredInteractionTypes: string[];
  interactionRoles: {};
  interactionSourceRefinements: String[];
  interactionTargetRefinements: String[];

  // TODO get these from the backend
  encodings: string[];

  glyphInfo: GlyphInfo;
  moduleInfo: ModuleInfo;
  interactionInfo: InteractionInfo;

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
  }

  getTypes() {
    this.metadataService.loadTypes().subscribe(types => this.partTypes = types);
  }

  getRoles() {
    this.metadataService.loadRoles().subscribe(roles => this.partRoles = roles);
  }

  getRefinements(role: string) {
    this.metadataService.loadRefinements(role).subscribe(refinements => this.partRefinements = refinements);
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

  inputChange(event: any) {
    const id = event.target.id;

    switch (id) {
      case 'displayID': {
        const replaced = event.target.value.replace(/[\W_]+/g, '_');
        if (this.glyphInfo != null) {
          this.glyphInfo.displayID = replaced;
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
    if (glyphInfo != null) {
      if (glyphInfo.partRole != null) {
        this.getRefinements(glyphInfo.partRole);
      } else {
        this.partRefinements = [];
      }
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
        this.getInteractionSourceRefinements(this.interactionRoles[interactionInfo.interactionType][0]);
        this.getInteractionTargetRefinements(this.interactionRoles[interactionInfo.interactionType][1]);
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
    }

    // this needs to be called because we may have gotten here from an async function
    // an async function doesn't update the view for some reason
    this.changeDetector.detectChanges();
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
    let sourceRole = this.interactionRoles[this.interactionInfo.interactionType][0];
    return sourceRole ? sourceRole : "NA";
  }

  getTargetInteractionRole() {
    let targetRole = this.interactionRoles[this.interactionInfo.interactionType][1];
    return targetRole ? targetRole : "NA";
  }

  hasSourceRefinements(): boolean {
    return this.interactionSourceRefinements && this.interactionSourceRefinements.length > 0;
  }

  hasTargetRefinements(): boolean {
    return this.interactionTargetRefinements && this.interactionTargetRefinements.length > 0;
  }

}
