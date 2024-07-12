import {Component, ElementRef, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {MetadataService} from '../metadata.service';
import {GraphService} from '../graph.service';
import {MatDialog} from '@angular/material/dialog';
import {ColorPickerComponent} from '../color-picker/color-picker.component';
import {StyleInfo} from '../style-info';
import { MatSelectChange } from '@angular/material';

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
        this.graphService.setSelectedCellStyle(this.styleInfo);
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
        this.graphService.setSelectedCellStyle(this.styleInfo);
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
        this.graphService.setSelectedCellStyle(this.styleInfo);
      }
    });
  }

  inputChange(event: any){
    const id = event.target.id;

    switch(id){
      case 'strokeOpacity': {
        this.styleInfo.setStrokeOpacity(event.target.value);
        break;
      }
      case 'strokeWidth': {
        this.styleInfo.setStrokeWidth(event.target.value);
        break;
      }
      case 'fillOpacity': {
        this.styleInfo.setFillOpacity(event.target.value);
        break;
      }
      case 'endSize' : {
        this.styleInfo.setEndSize(event.target.value);
        break;
      }
      case 'sourceSpacing' : {
        this.styleInfo.setSourceSpacing(event.target.value);
        break;
      }
      case 'targetSpacing' : {
        this.styleInfo.setTargetSpacing(event.target.value);
        break;
      }
      case 'fontOpacity' : {
        this.styleInfo.setFontOpacity(event.target.value);
        break;
      }
      case 'fontSize' : {
        this.styleInfo.setFontSize(event.target.value);
        break;
      }
    }

    this.graphService.setSelectedCellStyle(this.styleInfo);
  }

  dropDownChange(event: MatSelectChange){
    const id = event.source.id;

    switch(id){
      case 'edgeStyle' : {
        this.styleInfo.setEdgeStyle(event.value);
        break;
      }
      case 'bendStyle' : {
        this.styleInfo.setBendStyle(event.value);
        break;
      }

    }

    this.graphService.setSelectedCellStyle(this.styleInfo);
  }

}
