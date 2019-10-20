import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { UploadDialogData } from '../toolbar/toolbar.component';

@Component({
  selector: 'app-upload-graph',
  templateUrl: './upload-graph.component.html',
  styleUrls: ['./upload-graph.component.css']
})
export class UploadGraphComponent implements OnInit {

  collections: string[];

  constructor(@Inject(MAT_DIALOG_DATA) public data: UploadDialogData, public dialogRef: MatDialogRef<UploadGraphComponent>) { }

  ngOnInit() {
  }

  finishCheck(){
    return this.data.collection != null && this.data.filename != null;
  }

  onCancelClick() {
    this.dialogRef.close();
  }

}
