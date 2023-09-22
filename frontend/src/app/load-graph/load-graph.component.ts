import {Component, Inject, OnInit} from '@angular/core';

import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { LoadDialogData } from '../toolbar/toolbar.component';
import { FilesService } from '../files.service';
import { GraphService } from '../graph.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';


@Component({
  standalone: true,
  selector: 'app-load-graph',
  templateUrl: './load-graph.component.html',
  styleUrls: ['./load-graph.component.css'],
  imports: [MatFormFieldModule, MatCardModule]
})
export class LoadGraphComponent implements OnInit {

  file:any;
  filename:any;

  working:boolean;

  constructor(public dialogRef: MatDialogRef<LoadGraphComponent>, @Inject(MAT_DIALOG_DATA) public data: LoadDialogData, private filesService: FilesService, private graphService: GraphService) { }

  onFileSelected(){
    const fileInput: any = document.querySelector('#file');
    this.filename = fileInput.files[0].name;
    this.data.file = fileInput.files[0];
  }

  ngOnInit() {
    this.working = false;
  }

  onOkClick(){
    this.working = true;
    this.filesService.loadLocal(this.data.file, this.graphService).subscribe(_ => {
      this.working = false;
      this.dialogRef.close();
    });
  }

  onCancelClick() {
    this.dialogRef.close();
  }

  finishCheck(){
    return this.filename && this.filename.length > 0;
  }

}