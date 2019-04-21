import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {LoadDialogData} from '../toolbar/toolbar.component';

@Component({
  selector: 'app-load-graph',
  templateUrl: './load-graph.component.html',
  styleUrls: ['./load-graph.component.css']
})
export class LoadGraphComponent implements OnInit {

  constructor(public dialogRef: MatDialogRef<LoadGraphComponent>,
              @Inject(MAT_DIALOG_DATA) public data: LoadDialogData) { }

  ngOnInit() {
  }

  onCancelClick() {
    this.dialogRef.close();
  }

}
