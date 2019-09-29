import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import { SaveDialogData } from '../toolbar/toolbar.component';

@Component({
  selector: 'app-save-graph',
  templateUrl: './save-graph.component.html',
  styleUrls: ['./save-graph.component.css']
})
export class SaveGraphComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<SaveGraphComponent>,
              @Inject(MAT_DIALOG_DATA) public data: SaveDialogData) { }

  ngOnInit() {
  }

  onCancelClick() {
    this.dialogRef.close();
  }
}
