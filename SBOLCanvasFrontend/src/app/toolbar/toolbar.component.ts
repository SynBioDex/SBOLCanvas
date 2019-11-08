import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChild } from '@angular/core';
import { GraphService } from '../graph.service';
import { FilesService } from '../files.service';
import { MatDialog } from '@angular/material';
import { SaveGraphComponent } from '../save-graph/save-graph.component';
import { LoadGraphComponent } from '../load-graph/load-graph.component';
import { UploadGraphComponent } from '../upload-graph/upload-graph.component';
import { DownloadGraphComponent } from '../download-graph/download-graph.component';

export interface SaveDialogData {
  filename: string;
}
export interface LoadDialogData {
  file: File;
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

  openUploadDialog(): void {
    this.dialog.open(UploadGraphComponent, {});
  }

  openDownloadDialog(): void{
    this.dialog.open(DownloadGraphComponent, {});
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
}
