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

  constructor(private graphService: GraphService, private metadataService: MetadataService) { }

  ngOnInit() {
    this.metadataService.selectedGlyphInfo.subscribe(glyphInfo => this.glyphInfoUpdated(glyphInfo));
  }

  /**
   * This gets called when a user changes anything in the info menu.
   * @param event
   */
  onChange(event: any) {
    const id = event.target.id;

    switch (id) {
      case 'name': {
        this.glyphInfo.name = event.target.value;
        break;
      }
      case 'description': {
        this.glyphInfo.description = event.target.value;
        break;
      }
      default: {
        console.log('Unexpected id encountered in info menu = ' + id);
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
