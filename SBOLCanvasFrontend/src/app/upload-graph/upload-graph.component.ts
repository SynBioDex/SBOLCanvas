import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { MatDialogRef, MatTableDataSource, MatSort, MAT_DIALOG_DATA } from '@angular/material';
import { FilesService } from '../files.service';
import { LoginService } from '../login.service';
import { GraphService } from '../graph.service';

@Component({
  selector: 'app-upload-graph',
  templateUrl: './upload-graph.component.html',
  styleUrls: ['./upload-graph.component.css']
})
export class UploadGraphComponent implements OnInit {

  registries: string[];
  registry: string;
  collections = new MatTableDataSource([]);
  collection: string;
  moduleName: string;
  componentMode: boolean;

  displayedColumns: string[] = ['displayId', 'name', 'version', 'description'];
  @ViewChild(MatSort) sort: MatSort;

  working: boolean;

  constructor(private graphService: GraphService, private filesService: FilesService, private loginService: LoginService, public dialogRef: MatDialogRef<UploadGraphComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    if(data){
      this.componentMode = data.componentMode;
    }else{
      this.componentMode = false;
    }
  }

  ngOnInit() {
    this.working = true;
    this.filesService.getRegistries().subscribe(result => {
      this.registries = result;
      this.working = false;
    });
    this.collections.sort = this.sort;
  }

  setRegistry(registry: string) {
    this.registry = registry;
    this.collection = "";
    this.collections.data = [];
    this.updateCollections();
  }

  applyFilter(filterValue: string) {
    this.collections.filter = filterValue.trim().toLowerCase();
  }

  loginDisabled() {
    return this.loginService.users[this.registry] != null || this.registry == null;
  }

  finishCheck() {
    return this.collection != null && this.collection.length > 0 && (this.componentMode || (this.moduleName != null && this.moduleName.length > 0));
  }

  onCancelClick() {
    this.dialogRef.close();
  }

  onUploadClick() {
    this.working = true;
    this.filesService.uploadSBOL(this.graphService.getGraphXML(), this.registry, this.collection, this.loginService.users[this.registry], this.moduleName).subscribe(result => {
      this.working = false;
      this.dialogRef.close();
    });
  }

  onLoginClick() {
    this.loginService.openLoginDialog(this.registry).subscribe(result => {
      if (result) {
        this.updateCollections();
      }
    });
  }

  updateCollections() {
    if (this.loginService.users[this.registry] != null) {
      this.working = true;
      this.filesService.listMyCollections(this.loginService.users[this.registry], this.registry).subscribe(collections => {
        this.collections.data = collections;
        this.working = false;
      });
    } else {
      this.collections.data = [];
    }
  }

}
