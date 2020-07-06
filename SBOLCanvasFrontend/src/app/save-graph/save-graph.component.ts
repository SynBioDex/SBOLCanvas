import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import { SaveDialogData } from '../toolbar/toolbar.component';
import { FilesService } from '../files.service';
import { GraphService } from '../graph.service';

@Component({
  selector: 'app-save-graph',
  templateUrl: './save-graph.component.html',
  styleUrls: ['./save-graph.component.css']
})
export class SaveGraphComponent implements OnInit {

  working: boolean;

  constructor(public dialogRef: MatDialogRef<SaveGraphComponent>,
              @Inject(MAT_DIALOG_DATA) public data: SaveDialogData, private filesService: FilesService, private graphService: GraphService) { }

  ngOnInit() {
    this.working = false;
  }

  onOkClick(){
    this.working = true;
    this.filesService.saveLocal(this.data.filename, this.graphService.getGraphXML()).subscribe(_ => {
      this.working = false;
      this.dialogRef.close();
    });
  }

  onCancelClick() {
    this.dialogRef.close();
  }

  finishCheck(){
    return this.data.filename && this.data.filename.length > 0;
  }
}
