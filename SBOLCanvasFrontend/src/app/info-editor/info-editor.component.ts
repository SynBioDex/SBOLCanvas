import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import { GlyphInfo } from '../glyphInfo';
import {FormGroup} from '@angular/forms';
import {MetadataService} from '../metadata.service';
import {GraphService} from '../graph.service';


@Component({
  selector: 'app-info-editor',
  templateUrl: './info-editor.component.html',
  styleUrls: ['./info-editor.component.css']
})

export class InfoEditorComponent implements OnInit {

  glyphInfo: GlyphInfo;
  // @Output() glyphInfoChange = new EventEmitter();

  /*public glyphInfo: GlyphInfo = {
    name: 'the selectedGlyphInfo',
    description: 'the description'
  };*/

  constructor(private graphService: GraphService, private metadataService: MetadataService) { }

  ngOnInit() {
    this.metadataService.selectedGlyphInfo.subscribe(glyphInfo => this.glyphInfoUpdated(glyphInfo));
  }

  onChange(event: any) {
    const id = event.target.id;

    switch (id) {
      case 'displayID': {
        break;
      }
      case 'name': {
        this.glyphInfo.name = event.target.value;
        break;
      }
      case 'description': {
        break;
      }
      default: {
        console.log('Unexpected id encountered in info menu = ' + id);
        break;
      }
    }
    // this.glyphInfoChange.emit(this.glyphInfo);

    this.metadataService.setSelectedGlyphInfo(this.glyphInfo);
  }

  /**
   * Updates both the glyph info in the form and in the graph.
   * @param glyphInfo
   */
  glyphInfoUpdated(glyphInfo: GlyphInfo) {
    this.glyphInfo = glyphInfo;
    console.log('updating info in graph to : ');
    //console.log(glyphInfo);
    this.graphService.updateSelectedCellInfo(glyphInfo);
  }

}
