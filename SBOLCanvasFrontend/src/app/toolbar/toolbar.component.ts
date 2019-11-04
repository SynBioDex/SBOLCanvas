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
  users: {};

  constructor(public graphService: GraphService, private filesService: FilesService, public dialog: MatDialog) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }

  save(filename: string) {
    this.filesService.saveLocal(filename, this.graphService.getGraphXML());
  }

  load(file: File) {
    this.filesService.loadLocal(file, this.graphService);
  }

  openLoginDialog(): Observable<string> {
    const loginDialogRef = this.dialog.open(LoginComponent, {
      data: { user: null, server: null }
    });
    this.filesService.getRegistries().subscribe(result => {
      loginDialogRef.componentInstance.servers = result;
    });

    // this is total garbage, but the way observables work I have no choice
    // the outer observable doesn't notify any of it's subscribers, until the user token is set
    return new Observable((observer) => {
      loginDialogRef.afterClosed().subscribe(result => {
        if (result == null) {
          observer.complete();
          return;
        }
        let server = result.server;
        this.filesService.login(result.email, result.password, result.server).subscribe(result => {
          this.users[server] = result;
          observer.next(result);
          observer.complete();
        });
      });
    });
  }

  openUploadDialog(): void {
      const uploadDialogRef = this.dialog.open(UploadGraphComponent, {
        data: { server: null, collection: null, filename: null }
      });
      uploadDialogRef.componentInstance.filesService = this.filesService;
  }

  openSaveDialog(): void {
    const dialogRef = this.dialog.open(SaveGraphComponent, {
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

  testReplace(): void {
    this.graphService.setSelectedToXML("<root><mxCell id=\"4\" value=\"\" style=\"sequenceFeatureGlyphPro (Promoter)\" vertex=\"1\" parent=\"2\" collapsed=\"1\"><mxGeometry width=\"50\" height=\"100\" as=\"geometry\"/><GlyphInfo partType=\"DNA region\" partRole=\"Pro (Promoter)\" displayID=\"id1\" as=\"data\"/></mxCell><mxCell id=\"5\" value=\"\" style=\"circuitContainer\" vertex=\"1\" connectable=\"0\" parent=\"4\"><mxGeometry width=\"150\" height=\"100\" as=\"geometry\"/></mxCell><mxCell id=\"6\" value=\"\" style=\"backbone\" vertex=\"1\" connectable=\"0\" parent=\"5\"><mxGeometry y=\"50\" width=\"150\" height=\"1\" as=\"geometry\"/></mxCell><mxCell id=\"7\" value=\"\" style=\"sequenceFeatureGlyphAPT (Aptamer)\" vertex=\"1\" parent=\"5\" collapsed=\"1\"><mxGeometry width=\"50\" height=\"100\" as=\"geometry\"/><GlyphInfo partType=\"DNA region\" partRole=\"APT (Aptamer)\" displayID=\"id3\" as=\"data\"/></mxCell><mxCell id=\"8\" value=\"\" style=\"circuitContainer\" vertex=\"1\" connectable=\"0\" parent=\"7\"><mxGeometry width=\"50\" height=\"100\" as=\"geometry\"/></mxCell><mxCell id=\"9\" value=\"\" style=\"backbone\" vertex=\"1\" connectable=\"0\" parent=\"8\"><mxGeometry y=\"50\" width=\"50\" height=\"1\" as=\"geometry\"/></mxCell><mxCell id=\"10\" value=\"\" style=\"sequenceFeatureGlyphBS (Base)\" vertex=\"1\" parent=\"5\" collapsed=\"1\"><mxGeometry x=\"50\" width=\"50\" height=\"100\" as=\"geometry\"/><GlyphInfo partType=\"DNA region\" partRole=\"BS (Base)\" displayID=\"id5\" as=\"data\"/></mxCell><mxCell id=\"11\" value=\"\" style=\"circuitContainer\" vertex=\"1\" connectable=\"0\" parent=\"10\"><mxGeometry width=\"50\" height=\"100\" as=\"geometry\"/></mxCell><mxCell id=\"12\" value=\"\" style=\"backbone\" vertex=\"1\" connectable=\"0\" parent=\"11\"><mxGeometry y=\"50\" width=\"50\" height=\"1\" as=\"geometry\"/></mxCell><mxCell id=\"13\" value=\"\" style=\"sequenceFeatureGlyphBind (Binding Site)\" vertex=\"1\" parent=\"5\" collapsed=\"1\"><mxGeometry x=\"100\" width=\"50\" height=\"100\" as=\"geometry\"/><GlyphInfo partType=\"DNA region\" partRole=\"Bind (Binding Site)\" displayID=\"id7\" as=\"data\"/></mxCell><mxCell id=\"14\" value=\"\" style=\"circuitContainer\" vertex=\"1\" connectable=\"0\" parent=\"13\"><mxGeometry width=\"50\" height=\"100\" as=\"geometry\"/></mxCell><mxCell id=\"15\" value=\"\" style=\"backbone\" vertex=\"1\" connectable=\"0\" parent=\"14\"><mxGeometry y=\"50\" width=\"50\" height=\"1\" as=\"geometry\"/></mxCell></root>");
  }
}
