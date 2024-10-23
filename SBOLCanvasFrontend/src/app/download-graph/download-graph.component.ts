import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { LoginService } from '../login.service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { FilesService } from '../files.service';
import { GraphService } from '../graph.service';
import { MetadataService } from '../metadata.service';
import { forkJoin, Subscription } from 'rxjs';
// import { ThrowStmt } from '@angular/compiler';
import { IdentifiedInfo } from '../identifiedInfo';
import { FuncCompSelectorComponent } from '../func-comp-selector/func-comp-selector.component';
import { SelectionModel } from '@angular/cdk/collections';
import { AddRegistryComponent } from '../add-registry-component/add-registry.component';
import { DeleteRegistryComponent } from '../delete-registry/delete-registry.component';
import { ErrorComponent } from '../error/error.component';

@Component({
  selector: 'app-download-graph',
  templateUrl: './download-graph.component.html',
  styleUrls: ['./download-graph.component.css']
})
export class DownloadGraphComponent implements OnInit {

  // modes
  static readonly DOWNLOAD_MODE = 1;
  static readonly IMPORT_MODE = 2;
  static readonly SELECT_MODE = 3;
  mode;

  // types
  static readonly MODULE_AND_COMPONENT_TYPE = 1;
  static readonly MODULE_TYPE = 2;
  static readonly COMPONENT_TYPE = 3;
  static readonly LAYOUT_TYPE = 4;
  static readonly COMBINATORIAL_TYPE = 5;
  type;

  static collectionType = "collection";
  static moduleType = "module definition";
  static componentType = "component definition";

  // This is so we can use static variables in the html checks
  classRef = DownloadGraphComponent;

  registries: string[];
  registry: string;
  defaultRegistries: string[];
  partTypes: string[];
  history: any[];
  partRoles: string[];
  roleRefinements: string[];

  collection: string;
  partType: string;
  partRole: string;
  partRefine: string;

  partRequest: Subscription;

  parts = new MatTableDataSource([]);
  selection = new SelectionModel(false, []);

  displayedColumns: string[] = ['type', 'displayId', 'name', 'version', 'description'];
  @ViewChild(MatSort) sort: MatSort;

  working: boolean;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private dialog: MatDialog, private metadataService: MetadataService, private graphService: GraphService, private filesService: FilesService, private loginService: LoginService, public dialogRef: MatDialogRef<DownloadGraphComponent>) { }

  ngOnInit() {

    if (this.metadataService.getSavedRegistry() !== undefined) this.registry = this.metadataService.getSavedRegistry()
      if (this.metadataService.getSavedCollection() !== undefined) {
          this.collection = this.metadataService.getSavedCollection().collection
          this.history = this.metadataService.getSavedCollection().history
      } else {
          this.collection = ""
          this.history = []
      }

    this.working = true;
    if (this.data != null) {
      if (this.data.mode != null) {
        this.mode = this.data.mode;
        if(this.mode == DownloadGraphComponent.SELECT_MODE){
          this.selection = new SelectionModel(true, []);
        }
      } else {
        this.mode = DownloadGraphComponent.DOWNLOAD_MODE;
      }
      if (this.data.type != null) {
        this.type = this.data.type;
      } else {
        this.type = DownloadGraphComponent.MODULE_AND_COMPONENT_TYPE;
      }
      if (this.data.info != null) {
        this.partType = this.data.info.partType;
        this.partRole = this.data.info.partRole ? this.data.info.partRole : "";
        this.partRefine = this.data.info.partRefine;

        forkJoin(
          this.filesService.getRegistries(),
          this.metadataService.loadTypes(),
          this.metadataService.loadRoles(),
          this.metadataService.loadRefinements(this.partRole)
        ).subscribe(results => {
          this.registries = results[0];
          this.defaultRegistries = [...this.registries]
          this.updateRegistries()
          this.partTypes = results[1];
          this.partRoles = results[2];
          this.roleRefinements = results[3];
          this.working = false;
        });
      } else {
        this.filesService.getRegistries().subscribe(registries => {
          this.registries = registries;
          this.defaultRegistries = [...this.registries]
          this.updateRegistries()
          this.working = false;
        });
      }
    } else {
      this.mode = DownloadGraphComponent.DOWNLOAD_MODE;
      this.filesService.getRegistries().subscribe(registries => {
        this.registries = registries;
        this.defaultRegistries = [...registries]
        this.updateRegistries()
        this.working = false;
      });
    }
    this.updateParts();
    this.parts.sort = this.sort;
    // this.history = [];
    // this.collection = "";
  }

  loginDisabled(): boolean {
    return this.loginService.users[this.registry] != null || this.registry == null;
  }

  finishCheck(): boolean {
    return !this.selection.isEmpty() && this.noCollectionsSelected();
  }

  applyFilter(filterValue: string) {
    this.parts.filter = filterValue.trim().toLowerCase();
  }

  setRegistry(registry: string) {
    this.registry = registry;
    localStorage.setItem('1registry', this.registry)
    this.reset()
    this.updateParts();
  }

  setPartType(partType: string) {
    this.partType = partType;
    this.updateParts();
  }

  setPartRole(partRole: string) {
    this.partRole = partRole;
    this.partRefine = null;
    if (this.partRole != null && this.partRole.length > 0)
      this.updateRefinements();
    this.updateParts();
  }

  setPartRefinement(partRefine: string) {
    this.partRefine = partRefine;
    this.updateParts();
  }

  onLoginClick() {
    this.loginService.openLoginDialog(this.registry).subscribe(result => {
      if (result) {
        this.updateParts();
      }
    });
  }

  async onLogoutClick() {
    this.working = true;
    await this.loginService.logout(this.registry);
    this.working = false;
    this.updateParts();
  }

  onCancelClick() {
    this.dialogRef.close();
  }

  onEnterCollectionClick(){
    // only allowed to get here when there is one item selected, and it's a collection
    let row = this.selection.selected[0];
    this.history.push(row);
  
    this.selection.clear();
    this.updateParts();
  }

  enterCollectionEnabled(): boolean {
    return this.selection.selected.length == 1 && this.selection.selected[0].type == DownloadGraphComponent.collectionType;
  }

  onDownloadClick() {
    if(this.selection.selected[0].type == DownloadGraphComponent.moduleType){
      this.downloadModule();
    } else if (this.selection.selected[0].type == DownloadGraphComponent.componentType) {
      this.downloadComponent();
    }
  }

  onSelectClick(){
    this.dialogRef.close(this.selection.selected);
  }

  selectCheck(){
    return !this.selection.isEmpty() && this.onlyComponentsAndCollectionsSelected();
  }

  updateRefinements() {
    this.working = true;
    this.metadataService.loadRefinements(this.partRole).subscribe(refinements => {
      this.roleRefinements = refinements;
      this.working = false;
    });
  }

  highlightRow(row: any) {
    return this.selection.isSelected(row);
  }

  onRowClick(row: any) {
    if (row.type === DownloadGraphComponent.collectionType) {
      this.collection = row.uri;
    }
    this.selection.toggle(row);
  }

  onRowDoubleClick(row: any) {
    // double clicks still cause onRowClick for single clicks, so we need to make sure the double clicked row is still selected
    this.selection.select(row);

    if (row.type === DownloadGraphComponent.collectionType) {
      this.history.push(row);
      this.collection = row.uri;
      localStorage.setItem('3collection', this.collection);
      localStorage.setItem('3collection_history', JSON.stringify(this.history));
      
      this.selection.clear();
      this.updateParts();
    } else if (row.type === DownloadGraphComponent.componentType) {
      if(this.mode == DownloadGraphComponent.SELECT_MODE){
        this.onSelectClick();
      }else{
        this.downloadComponent();
      }
    } else if (row.type === DownloadGraphComponent.moduleType) {
      if(this.mode == DownloadGraphComponent.SELECT_MODE){
        this.onSelectClick();
      }else{
        this.downloadModule();
      }
    }
  }

  async downloadComponent() {
    this.working = true;
    if (this.mode == DownloadGraphComponent.IMPORT_MODE) {
      this.filesService.importPart(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri).subscribe(xml => {
        this.graphService.setSelectedToXML(xml);
        this.working = false;
        this.dialogRef.close();
      });
    } else {
      // check for combinatorials
      let combResult = await this.filesService.listCombinatorials(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri).toPromise();
      let combinatorial;
      if(combResult.length > 0){
        combinatorial = await this.dialog.open(FuncCompSelectorComponent, {
          data: {
            mode: FuncCompSelectorComponent.COMBINATORIAL_MODE,
            options: combResult
          }
        }).afterClosed().toPromise();
      }

      // get xml
      let xml;
      if(combinatorial){
        xml = await this.filesService.getPart(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri, combinatorial.uri).toPromise();
      }else{
        xml = await this.filesService.getPart(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri).toPromise();
      }

      // set xml;
      this.graphService.setGraphToXML(xml);
      
      // close dialog
      this.working = false;
      this.dialogRef.close();
    }
  }

  downloadModule() {
    this.working = true;
    if (this.mode == DownloadGraphComponent.IMPORT_MODE) {
      this.filesService.importPart(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri).subscribe(xml => {
        this.graphService.setSelectedToXML(xml);
        this.working = false;
        this.dialogRef.close();
      })
    } else {
      this.filesService.getPart(this.loginService.users[this.registry], this.registry, this.selection.selected[0].uri).subscribe(xml => {
        this.graphService.setGraphToXML(xml);
        this.working = false;
        this.dialogRef.close();
      });
    }
  }

  changeCollection(collection: string) {
    
    
    if(collection === ""){
      this.collection = "";
      localStorage.setItem("3collection", this.collection);
    }
    
    this.selection.clear();

    let found = false;
    let index;
    for (let i = 0; i < this.history.length; i++) {
      if (this.history[i].uri === collection) {
        this.history.length = i + 1;
        found = true;
        index = i;
        break;
      }
    }
    if(found){
      this.history = this.history.filter((_, i)=> i <= index);
      this.collection = this.history[index].uri;
      localStorage.setItem('3collection', this.collection);
      localStorage.setItem('3collection_history', JSON.stringify(this.history));
    }
    
   
    if (!found)
      this.history.length = 0;
      this.collection = collection;

    this.updateParts();
  }

  checkForDuplicateCollection(){
    
    let seen = [];
    let namesArray = [];

    for(let i = 0; i < this.history.length; i++){
      namesArray.push(this.history[i].name);
    }

    for(let i = 0;  i < namesArray.length; i++){
      let value = namesArray[i];
      let index = 0;
      if(seen.indexOf(value) !== -1){

        index = seen.indexOf(value);
        this.history = this.history.filter((_, x)=> x >= i);
        this.collection = this.history[index].uri;
        localStorage.setItem('3collection', this.collection);
        localStorage.setItem('3collection_history', JSON.stringify(this.history));

      }
      seen.push(value);
    }
    
  }

  reset(){
    // Clear collection history, this will also be called when users switch Registries
    localStorage.removeItem("3collection_history")
    localStorage.removeItem("3collection")
    this.collection= ''
    this.registry = ''
    this.history = []
}


  updateParts() {
    if(localStorage.getItem('1registry') != null && localStorage.getItem('1registry').length > 0)
      this.registry = localStorage.getItem('1registry')

    if(localStorage.getItem('3collection_history') != null && localStorage.getItem('3collection_history').length > 0)
    {
        let collection_history = localStorage.getItem('3collection_history')
        let historyArray = JSON.parse(collection_history);
        this.history = historyArray;
    }
    if(localStorage.getItem('3collection') != null && localStorage.getItem('3collection').length > 0)
      this.collection = localStorage.getItem('3collection')


    this.checkForDuplicateCollection();
    
    if (this.partRequest && !this.partRequest.closed) {
      this.partRequest.unsubscribe();
    }

    if (this.registry != null) {
      this.working = true;
      this.parts.data = [];
      if (this.type == DownloadGraphComponent.COMPONENT_TYPE) {
        // collection and components
        let roleOrRefine = this.partRefine != null && this.partRefine.length > 0 ? this.partRefine : this.partRole;
        this.partRequest = forkJoin([
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "collections"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, this.partType, roleOrRefine, "components")]
        ).subscribe(parts => {
          let partCache = [];
       
          parts[0].forEach(part => {
            part.type = DownloadGraphComponent.collectionType;
            //console.log("parts.............", part);
            partCache.push(part);
          });
          parts[1].forEach(part => {
            part.type = DownloadGraphComponent.componentType;
            partCache.push(part);
          });
          this.parts.data = partCache;
          this.working = false;
        })
      } else if(this.type == DownloadGraphComponent.MODULE_TYPE){
        // collections and modules
        this.partRequest = forkJoin([
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "collections"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "modules")]
        ).subscribe(parts =>{
          let partCache = [];
          parts[0].forEach(part => {
            part.type = DownloadGraphComponent.collectionType;
            partCache.push(part);
          });
          parts[1].forEach(part => {
            part.type = DownloadGraphComponent.moduleType;
            partCache.push(part);
          });
          this.parts.data = partCache;
          this.working = false;
        });
      }else{
        // collection, modules, and components
        this.partRequest = forkJoin([
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "collections"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "modules"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "components")]
        ).subscribe({
          next:(parts) => {
          let partCache = [];
          parts[0].forEach(part => {
            part.type = DownloadGraphComponent.collectionType;
            partCache.push(part);
          });
          parts[1].forEach(part => {
            part.type = DownloadGraphComponent.moduleType;
            partCache.push(part);
          });
          parts[2].forEach(part => {
            part.type = DownloadGraphComponent.componentType;
            partCache.push(part);
          })
          this.parts.data = partCache;
          this.working = false;
        },
        error:(error) =>{
          this.working = false

          // Unauthorized
          if(error.status == 401){
            this.dialog.open(ErrorComponent, {data: "Cannot access collections. Try logging in"})  
          }
          else{
            this.dialog.open(ErrorComponent, {data: `Cannot access ${this.registry}`})  
          }
        }
      });
      }
    } else {
      this.parts.data = [];
    }
  }

  protected noCollectionsSelected(){
    for(let row of this.selection.selected){
      if(row.type == DownloadGraphComponent.collectionType){
        return false;
      }
    }
    return true;
  }

  protected onlyComponentsAndCollectionsSelected(){
    for(let row of this.selection.selected){
      if(row.type != DownloadGraphComponent.componentType && row.type != DownloadGraphComponent.collectionType){
        return false;
      }
    }
    return true;
  }

  updateRegistries(){
    if(localStorage.getItem("registries")){
      // Add Registries on localStorage
      const additionalRegistries = JSON.parse(localStorage.getItem("registries"))
      this.registries = [...this.defaultRegistries, ...additionalRegistries]
    }
  }

  onAddRegistryClick(){
    const dialogRef = this.dialog.open(AddRegistryComponent)
    dialogRef.afterClosed().subscribe(() =>{
      const lastAddedRegistry = JSON.parse(localStorage.getItem("registries")).pop() 
      this.partRequest = this.filesService.listParts(this.loginService.users[lastAddedRegistry], lastAddedRegistry, this.collection, null, null, "collections")
      .subscribe({
      error:(error) =>{
        this.working = false

        // Simply cannot access the URL, so don't add it to the registry
        if(error.status !== 401){
          this.dialog.open(ErrorComponent, {data: `Cannot access ${lastAddedRegistry} and will not be added.`})  
          const registries = JSON.parse(localStorage.getItem("registries"))
          registries.pop()
          localStorage.setItem("registries", JSON.stringify(registries))
        }
        // Unauthorized but still add it to the registry, users just need to log in
        else{
          this.updateRegistries()
        }
      },
      complete: () =>{
        // If adding a registry was successful and had no errors
        this.updateRegistries()
      }
    });
    })

  }
  
  onDeleteRegistryClick(){
    const dialogRef = this.dialog.open(DeleteRegistryComponent)
    dialogRef.afterClosed().subscribe(() =>{
      this.updateRegistries()
    })
  }
}
