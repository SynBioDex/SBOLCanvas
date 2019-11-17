import {Component, ElementRef, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import { MccColorPickerItem, MccColorPickerService } from 'material-community-components';
import {FormBuilder, FormControl, FormGroup} from '@angular/forms';
import {MetadataService} from '../metadata.service';
import {GraphService} from '../graph.service';
import {SaveGraphComponent} from '../save-graph/save-graph.component';
import {FilesService} from '../files.service';
import {MatDialog} from '@angular/material/dialog';
import {ColorPickerComponent} from '../color-picker/color-picker.component';
import {StyleInfo} from '../style-info';
import {style} from '@angular/animations';

declare var require: any;
const mx = require('mxgraph')({
  mxImageBasePath: 'mxgraph/images',
  mxBasePath: 'mxgraph'
});

export interface ColorPickerStartupData {
  initialColor: string;
}

@Component({
  selector: 'app-color-palette',
  templateUrl: './design-menu.component.html',
  styleUrls: ['./design-menu.component.css']
})
export class DesignMenuComponent implements OnInit {

  // Style options for the selected glyphs
  styleInfo: StyleInfo;

  // Put a reference to the mxGraph namespace in the class so it's accessible to the component's html part
  mx: any = mx;

  constructor(
    private metadataService: MetadataService,
    private graphService: GraphService,
    public dialog: MatDialog
  ) { }

  ngOnInit() {
    // Subscribe to the color metadata; the 'color' variable is made available
    // to the metadata service.
    this.metadataService.style.subscribe((styleInfo) => this.styleInfo = styleInfo);
  }

  setStrokeColorClicked(): void {
    const dialogRef = this.dialog.open(ColorPickerComponent, {
      data: { initialColor: this.styleInfo.currentStrokeColor()}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result != null) {
        this.styleInfo.setStrokeColor(result);
      }
    });
  }

  setFillColorClicked(): void {
    const dialogRef = this.dialog.open(ColorPickerComponent, {
      data: { initialColor: this.styleInfo.currentFillColor()}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result != null) {
        this.styleInfo.setFillColor(result);
      }
    });
  }

  setFontColorClicked(): void {
    const dialogRef = this.dialog.open(ColorPickerComponent, {
      data: { initialColor: this.styleInfo.currentFontColor()}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result != null) {
        this.styleInfo.setFontColor(result);
      }
    });
  }

}
