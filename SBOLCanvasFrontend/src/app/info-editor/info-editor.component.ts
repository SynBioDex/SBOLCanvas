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
        } else if (this.moduleInfo){
          this.moduleInfo.displayID = replaced;
        }
        break;
      }
      case 'name': {
        if(this.glyphInfo)
          this.glyphInfo.name = event.target.value;
        else if(this.moduleInfo)
          this.moduleInfo.name = event.target.value;
        break;
      }
      case 'description': {
        if(this.glyphInfo)
          this.glyphInfo.description = event.target.value;
        else if(this.moduleInfo)
          this.moduleInfo.description = event.target.value;
        break;
      }
      case 'version': {
        if(this.glyphInfo)
          this.glyphInfo.version = event.target.value;
        else if(this.moduleInfo)
          this.moduleInfo.version = event.target.value;
        break;
      }
      case 'sequence': {
        this.glyphInfo.sequence = event.target.value;
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
    } else if (this.moduleInfo != null){
      this.graphService.setSelectedCellInfo(this.moduleInfo);
    }
  }

  openDownloadDialog(moduleMode: boolean = false) {
    this.dialog.open(DownloadGraphComponent, {
      data: {
        import: true,
        moduleMode: moduleMode,
        info: moduleMode ? null : this.glyphInfo
      }
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
  moduleInfoUpdated(moduleInfo: ModuleInfo){
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
    // this needs to be called because we may have gotten here from an async function
    // an async function doesn't update the view for some reason
    this.changeDetector.detectChanges();
  }

  localDesign(): boolean {
    if(this.glyphInfo)
      return this.glyphInfo.uriPrefix === environment.baseURI;
    else if(this.moduleInfo)
      return this.moduleInfo.uriPrefix === environment.baseURI;
    return true;
  }

  synBioHubDesign(): boolean {
    for (let registry of this.registries) {
      if(this.glyphInfo && this.glyphInfo.uriPrefix && this.glyphInfo.uriPrefix.startsWith(registry))
        return true;
      if(this.moduleInfo && this.moduleInfo.uriPrefix && this.moduleInfo.uriPrefix.startsWith(registry))
        return true;
    }
    return false;
  }

  importedDesign(): boolean {
    return !this.localDesign() && !this.synBioHubDesign();
  }

}
