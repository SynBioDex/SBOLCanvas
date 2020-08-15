import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { LoginService } from '../login.service';
import { MatDialogRef, MatSort, MatTableDataSource, MAT_DIALOG_DATA } from '@angular/material';
import { FilesService } from '../files.service';
import { GraphService } from '../graph.service';
import { MetadataService } from '../metadata.service';
import { forkJoin, Observable, Subscription } from 'rxjs';
import { GlyphInfo } from '../glyphInfo';

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

  import: boolean;
  moduleMode: boolean;

  partRequest: Subscription;

  parts = new MatTableDataSource([]);
  partRow: any;

  displayedColumns: string[] = ['type', 'displayId', 'name', 'version', 'description'];
  @ViewChild(MatSort) sort: MatSort;

  working: boolean;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private metadataService: MetadataService, private graphService: GraphService, private filesService: FilesService, private loginService: LoginService, public dialogRef: MatDialogRef<DownloadGraphComponent>) { }

  ngOnInit() {
    this.working = true;
    if (this.data != null) {
      if (this.data.import != null) {
        this.import = this.data.import;
      } else {
        this.import = false;
      }
      if (this.data.moduleMode != null) {
        this.moduleMode = this.data.moduleMode;
      } else {
        this.moduleMode = false;
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
          this.partTypes = results[1];
          this.partRoles = results[2];
          this.roleRefinements = results[3];
          this.working = false;
        });
      } else {
        this.filesService.getRegistries().subscribe(registries => {
          this.registries = registries;
          this.working = false;
        });
      }
    } else {
      this.import = false;
      this.filesService.getRegistries().subscribe(registries => {
        this.registries = registries;
        this.working = false;
      });
    }
    this.updateParts();
    this.parts.sort = this.sort;
    this.history = [];
    this.collection = "";
  }

  loginDisabled(): boolean {
    return this.loginService.users[this.registry] != null || this.registry == null;
  }

  finishCheck(): boolean {
    return this.partRow != null;
  }

  applyFilter(filterValue: string) {
    this.parts.filter = filterValue.trim().toLowerCase();
  }

  setRegistry(registry: string) {
    this.registry = registry;
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

  onCancelClick() {
    this.dialogRef.close();
  }

  onDownloadClick() {
    if (this.partRow.type === DownloadGraphComponent.moduleType) {
      this.downloadModule();
    } else if (this.partRow.type === DownloadGraphComponent.componentType) {
      this.downloadComponent();
    }
  }

  updateRefinements() {
    this.working = true;
    this.metadataService.loadRefinements(this.partRole).subscribe(refinements => {
      this.roleRefinements = refinements;
      this.working = false;
    });
  }

  highlightRow(row: any) {
    if (this.partRow)
      return row === this.partRow;
    if (this.collection)
      return row.uri === this.collection;
    return false;
  }

  onRowClick(row: any) {
    if (row.type === DownloadGraphComponent.collectionType) {
      this.partRow = null;
      this.collection = row.uri;
    }
    if (row.type === DownloadGraphComponent.componentType || row.type === DownloadGraphComponent.moduleType) {
      this.partRow = row;
    }
  }

  onRowDoubleClick(row: any) {
    if (row.type === DownloadGraphComponent.collectionType) {
      this.history.push(row);
      this.collection = row.uri;
      this.updateParts();
    } else if (row.type === DownloadGraphComponent.componentType) {
      this.downloadComponent();
    } else if (row.type === DownloadGraphComponent.moduleType) {
      this.downloadModule();
    }
  }

  downloadComponent() {
    this.working = true;
    if (this.import) {
      this.filesService.importPart(this.loginService.users[this.registry], this.registry, this.partRow.uri).subscribe(xml => {
        this.graphService.setSelectedToXML(xml);
        this.working = false;
        this.dialogRef.close();
      });
    } else {
      this.filesService.getPart(this.loginService.users[this.registry], this.registry, this.partRow.uri).subscribe(xml => {
        this.graphService.setGraphToXML(xml);
        this.working = false;
        this.dialogRef.close();
      });
    }
  }

  downloadModule() {
    this.working = true;
    if (this.import) {
      this.filesService.importPart(this.loginService.users[this.registry], this.registry, this.partRow.uri).subscribe(xml => {
        this.graphService.setSelectedToXML(xml);
        this.working = false;
        this.dialogRef.close();
      })
    } else {
      this.filesService.getPart(this.loginService.users[this.registry], this.registry, this.partRow.uri).subscribe(xml => {
        this.graphService.setGraphToXML(xml);
        this.working = false;
        this.dialogRef.close();
      });
    }
  }

  changeCollection(collection: string) {
    this.partRow = null;
    let found = false;
    for (let i = 0; i < this.history.length; i++) {
      if (this.history[i].uri === collection) {
        this.history.length = i + 1;
        found = true;
        break;
      }
    }
    if (!found)
      this.history.length = 0;
    this.collection = collection;

    this.updateParts();
  }

  updateParts() {
    if (this.partRequest && !this.partRequest.closed) {
      this.partRequest.unsubscribe();
    }

    if (this.registry != null) {
      this.working = true;
      this.parts.data = [];
      if (this.import && !this.moduleMode) {
        // collection and components
        let roleOrRefine = this.partRefine != null && this.partRefine.length > 0 ? this.partRefine : this.partRole;
        this.partRequest = forkJoin(
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "collections"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, this.partType, roleOrRefine, "components")
        ).subscribe(parts => {
          let partCache = [];
          parts[0].forEach(part => {
            part.type = DownloadGraphComponent.collectionType;
            partCache.push(part);
          });
          parts[1].forEach(part => {
            part.type = DownloadGraphComponent.componentType;
            partCache.push(part);
          });
          this.parts.data = partCache;
          this.working = false;
        })
      } else if(this.import && this.moduleMode){
        // collections and modules
        this.partRequest = forkJoin(
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "collections"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "modules")
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
      }else {
        // collection, modules, and components
        this.partRequest = forkJoin(
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "collections"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "modules"),
          this.filesService.listParts(this.loginService.users[this.registry], this.registry, this.collection, null, null, "components")
        ).subscribe(parts => {
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
        });
      }
    } else {
      this.parts.data = [];
    }
  }

}
