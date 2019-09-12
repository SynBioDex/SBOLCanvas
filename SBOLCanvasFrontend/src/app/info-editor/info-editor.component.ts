import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import { GlyphInfo } from '../glyphInfo';
import {FormGroup} from '@angular/forms';
import {MetadataService} from '../metadata.service';
import {GraphService} from '../graph.service';
import { MatSelectChange } from '@angular/material';


@Component({
  selector: 'app-info-editor',
  templateUrl: './info-editor.component.html',
  styleUrls: ['./info-editor.component.css']
})

export class InfoEditorComponent implements OnInit {

  // placeholders that get generated from http calls
  partTypes:string[];
  partRoles:string[];
  partRefinements:string[]; //these depend on role

  //TODO get these from the backend
  encodings:string[];

  glyphInfo: GlyphInfo;

  constructor(private graphService: GraphService, private metadataService: MetadataService) { }

  ngOnInit() {
    this.metadataService.selectedGlyphInfo.subscribe(glyphInfo => this.glyphInfoUpdated(glyphInfo));
    this.getTypes();
    this.getRoles();
  }

  getTypes(){
    this.metadataService.loadTypes().subscribe(types => this.partTypes = types);
  }

  getRoles(){
    this.metadataService.loadRoles().subscribe(roles => this.partRoles = roles);
  }

  getRefinements(role:string){
    this.metadataService.loadRefinements(role).subscribe(refinements => this.partRefinements = refinements);
  }

  dropDownChange(event: MatSelectChange){
    const id = event.source.id;

    switch(id){
      case 'partType':{
        this.glyphInfo.partType = event.value;
        break;
      }
      case 'partRole':{
        this.glyphInfo.partRole = event.value;
        this.glyphInfo.partRefine = "";
        this.getRefinements(event.value);
        break;
      }
      case 'partRefinement':{
        if(event.value != "none"){
          this.glyphInfo.partRefine = event.value;
        }
        break;
      }default:{
        console.log('Unexpected id encountered in info menu dropdown = ' + id);
        break;
      }
    }

    this.graphService.updateSelectedCellInfo(this.glyphInfo);
  }

  inputChange(event: any) {
    const id = event.target.id;

    switch (id) {
      case 'displayID':{
        this.glyphInfo.displayID = event.target.value;
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
      case 'version':{
        this.glyphInfo.version = event.target.value;
        break;
      }
      default: {
        console.log('Unexpected id encountered in info menu input = ' + id);
        break;
      }
    }

    this.graphService.updateSelectedCellInfo(this.glyphInfo);
  }

  /**
   * Updates both the glyph info in the form and in the graph.
   * @param glyphInfo
   */
  glyphInfoUpdated(glyphInfo: GlyphInfo) {
    this.glyphInfo = glyphInfo;
  }

}
