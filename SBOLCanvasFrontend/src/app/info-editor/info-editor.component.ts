import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import { GlyphInfo } from '../glyphInfo';
import {FormGroup} from '@angular/forms';
import {MetadataService} from '../metadata.service';
import {GraphService} from '../graph.service';
import { MatSelectChange } from '@angular/material';
import {DataService} from '../data.service';


@Component({
  selector: 'app-info-editor',
  templateUrl: './info-editor.component.html',
  styleUrls: ['./info-editor.component.css']
})

export class InfoEditorComponent implements OnInit {

partTypes:[string, string][];

//TODO get these from the backend (will depend on type) will also determine rendered glyph
partRoles:[string, string][] =[
  ["Pro (promoter)","1"],
  ["Ter (terminator)", "2"]
];

//TODO get these from the backend (will depend on role)
partRefinements:[string, string][] = [

];

//TODO get these from the backend
encodings:[string, string][] = [

];

  glyphInfo: GlyphInfo;

  constructor(private graphService: GraphService, private metadataService: MetadataService, private dataService: DataService) { }

  ngOnInit() {
    this.metadataService.selectedGlyphInfo.subscribe(glyphInfo => this.glyphInfoUpdated(glyphInfo));
    this.getTypes();
  }

  getTypes(){
    console.log("start");
    this.dataService.getTypes().subscribe(types => this.partTypes = types);
    console.log("end");
  }

  getRoles(){
    
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
        break;
      }
      case 'partRefinement':{
        if(event.value != "none"){
          this.glyphInfo.partRole = event.value;
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
        this.glyphInfo.displayID;
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
