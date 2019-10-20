import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChild } from '@angular/core';
import { GraphService } from '../graph.service';
import { FilesService } from '../files.service';
import { MatDialog } from '@angular/material';
import { SaveGraphComponent } from '../save-graph/save-graph.component';
import { LoadGraphComponent } from '../load-graph/load-graph.component';
import { UploadGraphComponent } from '../upload-graph/upload-graph.component';
import { LoginComponent } from '../login/login.component';
import { Observable } from 'rxjs';

export interface SaveDialogData {
  filename: string;
}
export interface LoadDialogData {
  file: File;
}
export interface LoginDialogData {
  email: string;
  password: string;
  server: string;
}

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnInit, AfterViewInit {

  @ViewChild('backbone') backbone: ElementRef;

  filename: string;
  user: string;
  server: string;

  constructor(private graphService: GraphService, private filesService: FilesService, public dialog: MatDialog) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    // TODO this is code for making the 'new strand' a dragsource
    // this.graphService.addNewBackbone(this.backbone.nativeElement);
  }

  save(filename: string) {
    this.filesService.saveLocal(filename, this.graphService.getGraphXML());
  }

  load(file: File) {
    this.filesService.loadLocal(file, this.graphService);
  }

  delete() {
    this.graphService.delete();
  }

  undoChange() {
    this.graphService.undo();
  }

  redoChange() {
    this.graphService.redo();
  }

  zoom() {
    this.graphService.zoom();
  }

  unzoom() {
    this.graphService.unzoom();
  }

  flipGlyph() {
    this.graphService.flipSequenceFeatureGlyph();
  }

  toggleScars() {
    this.graphService.toggleScars();
  }

  openLoginDialog(): Observable<string>{
    const loginDialogRef = this.dialog.open(LoginComponent, {
      data: {user: null, server: null}
    });
    this.filesService.getRegistries().subscribe(result => {
      loginDialogRef.componentInstance.servers = result;
    });

    // this is total garbage, but the way observables work I have no choice
    // the outer observable doesn't notify any of it's subscribers, until the user token is set
    return new Observable((observer) =>{
      loginDialogRef.afterClosed().subscribe(result => {
        if(result == null){
          observer.complete();
          return;
        }
        this.server = result.server;
        this.filesService.login(result.email, result.password, result.server).subscribe(result => {
          this.user = result;
          observer.next(this.user);
          observer.complete();
        });
      });
    });
  }

  openUploadDialog(): void {
    if (!this.user) {
      this.openLoginDialog().subscribe(result => {
        if (result != null) {
          this.openUploadDialog();
        }
      });
    } else {
      const uploadDialogRef = this.dialog.open(UploadGraphComponent);
      uploadDialogRef.componentInstance.filesService = this.filesService;
      uploadDialogRef.componentInstance.user = this.user;
      uploadDialogRef.componentInstance.server = this.server;
      uploadDialogRef.afterClosed().subscribe(result => { });
    }
  }

  openSaveDialog(): void {
    const dialogRef = this.dialog.open(SaveGraphComponent, {
      width: '500px',
      data: { filename: this.filename }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result != null) {
        this.save(result);
      }
    });
  }

  openLoadDialog(): void {
    const dialogRef = this.dialog.open(LoadGraphComponent, {
      data: { file: null }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result != null) {
        this.load(result);
      }
    });
  }
}
