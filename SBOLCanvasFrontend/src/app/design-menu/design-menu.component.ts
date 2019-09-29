import {Component, OnInit} from '@angular/core';
import { MccColorPickerItem, MccColorPickerService } from 'material-community-components';
import {FormBuilder, FormGroup} from '@angular/forms';
import {MetadataService} from '../metadata.service';
import {GraphService} from '../graph.service';
import {SaveGraphComponent} from '../save-graph/save-graph.component';
import {FilesService} from '../files.service';
import {MatDialog} from '@angular/material/dialog';
import {ColorPickerComponent} from '../color-picker/color-picker.component';


export interface ColorPickerStartupData {
  initialColor: string;
}

@Component({
  selector: 'app-color-palette',
  templateUrl: './design-menu.component.html',
  styleUrls: ['./design-menu.component.css']
})
export class DesignMenuComponent implements OnInit {

  selectedColor: string;

  constructor(
    private metadataService: MetadataService,
    private graphService: GraphService,
    public dialog: MatDialog
  ) { }

  ngOnInit() {
    // Subscribe to the color metadata; the 'color' variable is made available
    // to the metadata service.
    this.metadataService.color.subscribe(color => this.newSelection(color));
  }

  setStrokeClicked(): void {
    const dialogRef = this.dialog.open(ColorPickerComponent, {
      data: { initialColor: this.selectedColor}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result != null) {
        this.showColor(result);
      }
    });
  }

  showColor($event) {
    this.graphService.setSelectedCellColor($event);
    console.log($event);
  }

  newSelection(color: string) {
    this.selectedColor = color;
  }

}
