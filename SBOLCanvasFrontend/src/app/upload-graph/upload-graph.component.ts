import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { MatDialogRef, MatTableDataSource, MatSort, MAT_DIALOG_DATA, MatDialog } from '@angular/material';
import { FilesService } from '../files.service';
import { LoginService } from '../login.service';
import { GraphService } from '../graph.service';
import { CollectionCreationComponent } from '../collection-creation/collection-creation.component';

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
  componentMode: boolean;

  importMode: boolean;
  filename: string;
  file: File;

  displayedColumns: string[] = ['displayId', 'name', 'version', 'description'];
  @ViewChild(MatSort) sort: MatSort;

  working: boolean;

  constructor(private graphService: GraphService, private filesService: FilesService, private loginService: LoginService, public dialogRef: MatDialogRef<UploadGraphComponent>, public dialog: MatDialog, @Inject(MAT_DIALOG_DATA) public data: any) {
    if(data){
      this.componentMode = data.componentMode;
      this.importMode = data.importMode;
    }else{
      this.componentMode = false;
      this.importMode = false;
    }
    this.filename = "No file selected";
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
    if(!this.importMode){
      return this.collection != null && this.collection.length > 0;
    }else{
      return this.collection != null && this.collection.length > 0 && this.filename !== "No file selected";
    }
  }

  createCollectionCheck(){
    return this.loginService.users[this.registry] != null;
  }

  onCancelClick() {
    this.dialogRef.close();
  }

  onUploadClick() {
    this.working = true;
    this.filesService.uploadSBOL(this.graphService.getGraphXML(), this.registry, this.collection, this.loginService.users).subscribe(result => {
      this.working = false;
      this.dialogRef.close();
    });
  }

  onImportClick(){
    this.working = true;
    this.filesService.importSBOL(this.file, this.registry, this.collection, this.loginService.users[this.registry]).subscribe(result =>{
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

  async onLogoutClick() {
    this.working = true;
    await this.loginService.logout(this.registry);
    this.working = false;
    this.updateCollections();
  }

  onCreateCollectionClick() {
    this.dialog.open(CollectionCreationComponent, {data: {registry: this.registry}}).afterClosed().subscribe(result => {
      if(result)
        this.updateCollections();
    });
  }

  onFileSelected(){
    const fileInput: any = document.querySelector('#file');
    this.filename = fileInput.files[0].name;
    this.file = fileInput.files[0];
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
