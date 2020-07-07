import { Component, OnInit } from '@angular/core';
import { GlyphInfo } from '../glyphInfo';
import { InteractionInfo } from '../interactionInfo';
import { MetadataService } from '../metadata.service';
import { GraphService } from '../graph.service';
import { FilesService } from '../files.service';
import { MatSelectChange, MatDialog } from '@angular/material';
import { DownloadGraphComponent } from '../download-graph/download-graph.component';
import { ModuleInfo } from '../moduleInfo';


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

  constructor(private graphService: GraphService, private metadataService: MetadataService, private filesService: FilesService, public dialog: MatDialog) { }

  ngOnInit() {
    this.metadataService.selectedGlyphInfo.subscribe(glyphInfo => this.glyphInfoUpdated(glyphInfo));
    this.metadataService.selectedInteractionInfo.subscribe(interactionInfo => this.interactionInfoUpdated(interactionInfo));
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
        }
        break;
      }
      case 'name': {
        this.glyphInfo.name = event.target.value;
        break;
      }
      case 'description': {
        this.glyphInfo.description = event.target.value;
        break;
      }
      case 'version': {
        this.glyphInfo.version = event.target.value;
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
    }
  }

  openDownloadDialog() {
    this.dialog.open(DownloadGraphComponent, {
      data: {
        import: true,
        info: this.glyphInfo
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
  }

  /**
   * Updates both the module info in the form and in the graph.
   */
  moduleInfoUpdated(moduleInfo: ModuleInfo){
    this.moduleInfo = moduleInfo;
  }

  /**
   * Updates both the interaction info in the form and in the graph.
   */
  interactionInfoUpdated(interactionInfo: InteractionInfo) {
    this.interactionInfo = interactionInfo;
  }

  localDesign(): boolean {
    return this.glyphInfo.uriPrefix === GlyphInfo.baseURI;
  }

  synBioHubDesign(): boolean {
    for (let registry of this.registries) {
      if (this.glyphInfo.uriPrefix.startsWith(registry))
        return true;
    }
    return false;
  }

  importedDesign(): boolean {
    return !this.localDesign() && !this.synBioHubDesign();
  }

}
