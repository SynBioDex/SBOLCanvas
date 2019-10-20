import { Component, OnInit } from '@angular/core';
import {MatDialogRef} from '@angular/material';
import { FilesService } from '../files.service';

@Component({
  selector: 'app-upload-graph',
  templateUrl: './upload-graph.component.html',
  styleUrls: ['./upload-graph.component.css']
})
export class UploadGraphComponent implements OnInit {

  filesService: FilesService;
  user:string;
  server:string;

  constructor(public dialogRef: MatDialogRef<UploadGraphComponent>) { }

ngOnInit() {
}

onCancelClick() {
  this.dialogRef.close();
}

}
