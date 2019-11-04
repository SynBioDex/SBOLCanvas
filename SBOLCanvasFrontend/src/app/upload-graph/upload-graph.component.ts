import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material';
import { FilesService } from '../files.service';

@Component({
  selector: 'app-upload-graph',
  templateUrl: './upload-graph.component.html',
  styleUrls: ['./upload-graph.component.css']
})
export class UploadGraphComponent implements OnInit {

  registries: string[];
  registry: string;
  collections: string[];
  collection: string;
  moduleName: string;

  users: {};
  filesService: FilesService;

  constructor(public dialogRef: MatDialogRef<UploadGraphComponent>) { }

  ngOnInit() {
    this.filesService.getRegistries().subscribe(result => {
      this.registries = result;
    });
  }

  loginDisabled(){
    return this.users[this.registry] != null;
  }

  finishCheck(){
    return this.collection != null && this.moduleName != null;
  }

  onCancelClick() {
    this.dialogRef.close();
  }

  onUploadClick(){

  }

}
