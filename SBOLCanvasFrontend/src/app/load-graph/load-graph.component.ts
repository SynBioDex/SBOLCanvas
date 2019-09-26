import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {LoadDialogData} from '../toolbar/toolbar.component';

@Component({
  selector: 'app-load-graph',
  templateUrl: './load-graph.component.html',
  styleUrls: ['./load-graph.component.css']
})
export class LoadGraphComponent implements OnInit {

  file:any;
  filename:any;

  constructor(public dialogRef: MatDialogRef<LoadGraphComponent>, @Inject(MAT_DIALOG_DATA) public data: LoadDialogData) { }

  onFileSelected(){
    const fileInput: any = document.querySelector('#file');
    this.filename = fileInput.files[0].name;
    this.data.file = fileInput.files[0];
  }

  ngOnInit() {
  }

  onCancelClick() {
    this.dialogRef.close();
  }

}
