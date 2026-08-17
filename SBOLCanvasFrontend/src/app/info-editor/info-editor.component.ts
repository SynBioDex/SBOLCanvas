import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef } from '@angular/core';
import { GlyphInfo } from '../glyphInfo';
import { InteractionInfo } from '../interactionInfo';
import { EventInfo } from '../eventInfo';
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
import { registerInputSave } from '../input-save.util';

@Component({
  selector: 'app-info-editor',
  templateUrl: './info-editor.component.html',
  styleUrls: ['./info-editor.component.css']
})

export class InfoEditorComponent implements OnInit, OnDestroy {

  registries: string[] = [];

  // placeholders that get generated from http calls
  partTypes: string[] = [];
  partRoles: string[] = [];
  partRefinements: string[] = []; // these depend on role
  filteredPartRefinements: string[] = [];
  interactionTypes: string[] = [];
  filteredInteractionTypes: string[] = [];
  interactionRoles: Record<string, string[]> = {};
  interactionSourceRefinements: string[] = [];
  interactionTargetRefinements: string[] = [];

  // TODO get these from the backend
  encodings: string[] = [];

  glyphInfo: GlyphInfo | null = null;
  moduleInfo: ModuleInfo | null = null;
  interactionInfo: InteractionInfo | null = null;
  eventInfo: EventInfo | null = null;
  glyphCtrl = new FormControl('', Validators.required);


  private teardownSave: (() => void) | null = null;

  constructor(private graphService: GraphService, private metadataService: MetadataService, private filesService: FilesService, public dialog: MatDialog, private changeDetector: ChangeDetectorRef, private elementRef: ElementRef) { }

  ngOnInit() {
    this.metadataService.selectedGlyphInfo.subscribe(glyphInfo => this.glyphInfoUpdated(glyphInfo));
    this.metadataService.selectedInteractionInfo.subscribe(interactionInfo => this.interactionInfoUpdated(interactionInfo));
    this.metadataService.selectedModuleInfo.subscribe(moduleInfo => this.moduleInfoUpdated(moduleInfo));
    this.metadataService.selectedEventInfo.subscribe(eventInfo => this.eventInfoUpdated(eventInfo));
    this.filesService.getRegistries().subscribe(result => this.registries = result);
    this.getTypes();
    this.getRoles();
    this.getInteractions();
    this.getInteractionRoles();

    this.teardownSave = registerInputSave(this.elementRef);
  }

  ngOnDestroy() {
    if (this.teardownSave) this.teardownSave();
  }

  getTypes() {
    this.metadataService.loadTypes().subscribe((types: string[]) => {
      this.partTypes = types.filter((type: string) => type != "Circular" && type != "Chromosomal");
    });
  }

  getRoles() {
    this.metadataService.loadRoles().subscribe((roles: string[]) => {
      this.partRoles = roles.filter((role: string) => !role.includes("Cir (Circular Backbone Left") && !role.includes("Cir (Circular Backbone Right)"));
    });
  }

  getRefinements(role: string) {
    this.metadataService.loadRefinements(role).subscribe(refinements => {
      this.partRefinements = refinements;
      this.filteredPartRefinements = refinements;
    });
  }

  getInteractions() {
    this.metadataService.loadInteractions().subscribe((interactions: string[]) => this.interactionTypes = interactions);
  }

  getInteractionRoles() {
    this.metadataService.loadInteractionRoles().subscribe((interactionRoles: Record<string, string[]>) => {
      this.interactionRoles = interactionRoles;
    });
  }

  getInteractionSourceRefinements(sourceRole: string) {
    this.metadataService.loadInteractionRoleRefinements(sourceRole).subscribe((sourceRefinements: string[]) => {
      this.interactionSourceRefinements = sourceRefinements;
    });
  }

  getInteractionTargetRefinements(targetRole: string) {
    this.metadataService.loadInteractionRoleRefinements(targetRole).subscribe((targetRefinements: string[]) => {
      this.interactionTargetRefinements = targetRefinements;
    });
  }

  dropDownChange(event: MatSelectChange) {
    this.filteredPartRefinements = this.partRefinements; // Reset filter input when clicking on dropdown again
    const id = event.source.id;
    const glyphInfo = this.glyphInfo;
    const interactionInfo = this.interactionInfo;
    switch (id) {
      case 'partType': {
        if (glyphInfo) {
          glyphInfo.partType = event.value;
        }
        break;
      }
      case 'partRole': {
        if (glyphInfo) {
          glyphInfo.partRole = event.value;
          glyphInfo.partRefine = '';
        if (event.value !== '') {
          this.getRefinements(event.value);
        } else {
          this.partRefinements = [];
        }
        }
        break;
      }
      case 'partRefinement': {
        if (glyphInfo && event.value != 'none') {
          glyphInfo.partRefine = event.value;
        }
        break;
      }
      case 'interactionType': {
        if (interactionInfo) {
          interactionInfo.interactionType = event.value;
        this.getInteractionSourceRefinements(event.value);
        this.getInteractionTargetRefinements(event.value);
        }
        break;
      }
      case 'interactionSourceRefinement': {
        if (interactionInfo) {
          interactionInfo.sourceRefinement[this.graphService.getSelectedCellID()] = event.value;
        }
        break;
      }
      case 'interactionTargetRefinement': {
        if (interactionInfo) {
          interactionInfo.targetRefinement[this.graphService.getSelectedCellID()] = event.value;
        }
        break;
      } default: {
        console.log('Unexpected id encountered in info menu dropdown = ' + id);
        break;
      }
    }

    if (glyphInfo != null) {
      this.graphService.setSelectedCellInfo(glyphInfo);
    } else if (interactionInfo != null) {
      this.graphService.setSelectedCellInfo(interactionInfo);
    }
  }


  inputChange(event: any) {
    const id = event.target.id;
    const glyphInfo = this.glyphInfo;
    const moduleInfo = this.moduleInfo;
    const interactionInfo = this.interactionInfo;
    const eventInfo = this.eventInfo;

    switch (id) {
      case 'displayID': {
        const replaced = event.target.value.replace(/[\W_]+/g, '_');
        if (glyphInfo != null) {
          if (replaced !== '') {
            //this.promptDisplayID();  
            glyphInfo.displayID = replaced;
          }
        } else if (interactionInfo != null) {
          interactionInfo.displayID = replaced;
        } else if (moduleInfo != null) {
          moduleInfo.displayID = replaced;
        } else if (eventInfo != null) {
          eventInfo.displayID = replaced;
        }
        break;
      }
      case 'name': {
        if (glyphInfo)
          glyphInfo.name = event.target.value;
        else if (moduleInfo)
          moduleInfo.name = event.target.value;
        else if (eventInfo)
          eventInfo.name = event.target.value;
        break;
      }
      case 'description': {
        if (glyphInfo)
          glyphInfo.description = event.target.value;
        else if (moduleInfo)
          moduleInfo.description = event.target.value;
        else if (eventInfo)
          eventInfo.description = event.target.value;
        break;
      }
      case 'version': {
        if (glyphInfo)
          glyphInfo.version = event.target.value;
        else if (moduleInfo)
          moduleInfo.version = event.target.value;
        break;
      }
      case 'sequence': {
        if (glyphInfo) {
          glyphInfo.sequence = event.target.value;
        }
        break;
      }
      default: {
        console.log('Unexpected id encountered in info menu input = ' + id);
        break;
      }
    }

    if (glyphInfo != null) {
      this.graphService.setSelectedCellInfo(glyphInfo);
    } else if (interactionInfo != null) {
      this.graphService.setSelectedCellInfo(interactionInfo);
    } else if (moduleInfo != null) {
      this.graphService.setSelectedCellInfo(moduleInfo);
    } else if (eventInfo != null) {
      this.graphService.setSelectedCellInfo(eventInfo);
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
    return (this.graphService.isSelectedAGlyph() || this.graphService.isSelectedBackbone()) && this.graphService.isRootAComponentView();
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
  glyphInfoUpdated(glyphInfo: GlyphInfo | null) {
    const updatedGlyphInfo = glyphInfo;
    this.glyphInfo = updatedGlyphInfo;

    this.glyphCtrl = new FormControl(`${updatedGlyphInfo?.displayID ?? ''}`, Validators.required);
    if (updatedGlyphInfo != null) {
      if (updatedGlyphInfo.partRole != null) {
        if (updatedGlyphInfo.partRole.includes("Cir (Circular Backbone")) {
          // fixes the part role name so it will show up in the info-editor
          updatedGlyphInfo.partRole = "Cir (Circular Backbone)";

          // for some reason part refinements are not gotten for circular backbones correctly
          if (updatedGlyphInfo.partRefine !== undefined && !this.partRefinements.includes(updatedGlyphInfo.partRefine)) {
            // if partRefine is not undefined the part refinement list needs to be manually set
            this.partRefinements = [updatedGlyphInfo.partRefine];
          }
        }

        if (updatedGlyphInfo.partRefine == undefined) this.getRefinements(updatedGlyphInfo.partRole);
      } else {
        this.partRefinements = [];
      }
    }

    // nudge change detection: the subscription may fire outside Angular's pass
    this.changeDetector.detectChanges();
  }

  /**
   * Updates both the module info in the form and in the graph.
   */
  moduleInfoUpdated(moduleInfo: ModuleInfo | null) {
    this.moduleInfo = moduleInfo;
    // nudge change detection: the subscription may fire outside Angular's pass
    this.changeDetector.detectChanges();
  }

  /**
   * Updates the event info shown in the form.
   */
  eventInfoUpdated(eventInfo: EventInfo | null) {
    this.eventInfo = eventInfo;
    // nudge change detection: the subscription may fire outside Angular's pass
    this.changeDetector.detectChanges();
  }

  /**
   * Updates both the interaction info in the form and in the graph.
   */
  interactionInfoUpdated(interactionInfo: InteractionInfo | null) {
    const updatedInteractionInfo = interactionInfo;
    this.interactionInfo = updatedInteractionInfo;
    if (updatedInteractionInfo != null) {
      if (updatedInteractionInfo.interactionType != null) {
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
    }

    // nudge change detection: the subscription may fire outside Angular's pass
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
    const interactionType = this.interactionInfo?.interactionType;
    const NA = "NA";
    if (!interactionType) {
      return NA;
    }
    const interactionRole = this.interactionRoles[interactionType];
    return interactionRole ? interactionRole[0] || NA : NA;
  }

  getTargetInteractionRole() {
    const interactionType = this.interactionInfo?.interactionType;
    const NA = "NA";
    if (!interactionType) {
      return NA;
    }
    const interactionRole = this.interactionRoles[interactionType];
    return interactionRole ? interactionRole[1] || NA : NA;
  }

  hasSourceRefinements(): boolean {
    return this.interactionSourceRefinements && this.interactionSourceRefinements.length > 0;
  }

  hasTargetRefinements(): boolean {
    return this.interactionTargetRefinements && this.interactionTargetRefinements.length > 0;
  }

  applyFilter(filterValue: string) {
    this.filteredPartRefinements = this.partRefinements.filter(refinements =>
      refinements.toLowerCase().includes(filterValue.toLowerCase()));
  }
}
