import { Component, OnInit, ViewChild } from '@angular/core';
import { LoginService } from '../login.service';
import { MatDialogRef, MatSort, MatTableDataSource } from '@angular/material';
import { FilesService } from '../files.service';
import { GraphService } from '../graph.service';
import { MetadataService } from '../metadata.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-download-graph',
  templateUrl: './download-graph.component.html',
  styleUrls: ['./download-graph.component.css']
})
export class DownloadGraphComponent implements OnInit {

  static collectionType = "collection";
  static moduleType = "module definition";
  static componentType = "component definition";

  registries: string[];
  registry: string;
  partTypes: string[];
  history: any[];
  partRoles: string[];
  roleRefinements: string[];

  collection: string;
  partType: string;
  partRole: string;
  partRefine: string;

  parts = new MatTableDataSource([]);
  partRow: any;

  displayedColumns: string[] = ['type', 'displayId', 'name', 'version', 'description'];
  @ViewChild(MatSort) sort: MatSort;

  working: boolean;

  constructor(private metadataService: MetadataService, private graphService: GraphService, private filesService: FilesService, private loginService: LoginService, public dialogRef: MatDialogRef<DownloadGraphComponent>) { }

  ngOnInit() {
    this.working = true;
    let registryQuery = true;
    let typesQuery = true;
    let rolesQuery = true;

    this.filesService.getRegistries().subscribe(registries => {
      this.registries = registries;
      registryQuery = false;
      this.working = registryQuery || typesQuery || rolesQuery;
    });
    this.metadataService.loadTypes().subscribe(partTypes => {
      this.partTypes = partTypes;
      typesQuery = false;
      this.working = registryQuery || typesQuery || rolesQuery;
    });
    this.metadataService.loadRoles().subscribe(partRoles => {
      this.partRoles = partRoles;
      rolesQuery = false;
      this.working = registryQuery || typesQuery || rolesQuery;
    });
    this.updateParts();
    this.parts.sort = this.sort;
    this.history = [];
    this.collection = "";
  }

  loginDisabled(): boolean{
    return this.loginService.users[this.registry] != null || this.registry == null;
  }

  finishCheck(): boolean{
    return this.partRow != null;
  }

  applyFilter(filterValue: string){
    this.parts.filter = filterValue.trim().toLowerCase();
  }

  setRegistry(registry: string){
    this.registry = registry;
    this.updateParts();
  }

  setPartType(partType: string){
    this.partType = partType;
    this.updateParts();
  }

  setPartRole(partRole: string){
    this.partRole = partRole;
    this.partRefine = null;
    this.updateRefinements();
    this.updateParts();
  }

  setPartRefinement(partRefine: string){
    this.partRefine = partRefine;
    this.updateParts();
  }

  onLoginClick(){
    this.loginService.openLoginDialog(this.registry).subscribe(result => {
      if(result){
        this.updateParts();
      }
    });
  }

  onCancelClick(){
    this.dialogRef.close();
  }

  onDownloadClick(){
    if(this.partRow.type === DownloadGraphComponent.moduleType){
      this.downloadModule();
    }else if(this.partRow.type === DownloadGraphComponent.componentType){
      this.downloadComponent();
    }
  }

  updateRefinements(){
    this.working = true;
    this.metadataService.loadRefinements(this.partRole).subscribe(refinements => {
      this.roleRefinements = refinements;
      this.working = false;
    });
  }

  highlightRow(row: any){
    if(this.partRow)
      return row === this.partRow;
    if(this.collection)
      return row.uri === this.collection;
    return false;
  }

  onRowClick(row: any){
    if(row.type === DownloadGraphComponent.componentType){
      this.partRow = null;
      this.collection = row.uri;
    }
    if(row.type === DownloadGraphComponent.componentType || row.type === DownloadGraphComponent.moduleType){
      this.partRow = row;
    }
  }

  onRowDoubleClick(row: any){
    if(row.type === DownloadGraphComponent.componentType){
      this.history.push(row);
      this.collection = row.uri;
      this.updateParts();
    }else if(row.type === DownloadGraphComponent.componentType){
      this.downloadComponent();
    }else if(row.type === DownloadGraphComponent.moduleType){
      this.downloadModule();
    }
  }

  downloadComponent(){
    this.working = true;
    this.filesService.getPart(this.loginService.users[this.registry], this.registry, this.partRow.uri).subscribe(xml =>{
      this.graphService.setSelectedToXML(xml);
      this.working = false;
      this.dialogRef.close();
    });
  }

  downloadModule(){
    this.working = true;
    this.filesService.getPart(this.loginService.users[this.registry], this.registry, this.partRow.uri).subscribe(xml =>{
      this.graphService.setGraphToXML(xml);
      this.working = false;
      this.dialogRef.close();
    });
  }

  changeCollection(collection: string){
    this.partRow = null;
    let found = false;
    for(let i = 0; i < this.history.length; i++){
      if(this.history[i].uri === collection){
        this.history.length = i+1;
        found = true;
        break;
      }
    }
    if(!found)
      this.history.length = 0;
    this.collection = collection;

    this.updateParts();
  }

  updateParts(){
    if(this.registry != null){
      this.working = true;
      let roleOrRefine = this.partRefine != null && this.partRefine.length > 0 ? this.partRefine : this.partRole;
      this.parts.data = [];
      forkJoin(
        this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, this.partType, roleOrRefine, "collections"),
        this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, this.partType, roleOrRefine, "modules"),
        this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, this.partType, roleOrRefine, "components")
      ).subscribe(parts => {
        let partCache = [];
        parts[0].forEach(part => {
          part.type = DownloadGraphComponent.componentType;
          partCache.push(part);
        });
        parts[1].forEach(part => {
          part.type = DownloadGraphComponent.moduleType;
          partCache.push(part);
        });
        parts[2].forEach(part => {
          part.type = DownloadGraphComponent.componentType;
          partCache.push(part);
        });
        this.parts.data = partCache;
        this.working = false;
      });
    }else{
      this.parts.data = [];
    }
  }

}
