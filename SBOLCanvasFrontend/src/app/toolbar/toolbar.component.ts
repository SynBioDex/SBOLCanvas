import { Component, OnInit } from '@angular/core';
import {GraphService} from '../graph.service';
import {FilesService} from '../files.service';
import {MatDialog} from '@angular/material';
import {SaveGraphComponent} from '../save-graph/save-graph.component';
import {LoadGraphComponent} from '../load-graph/load-graph.component';

export interface SaveDialogData {
  filename: string;
}

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnInit {

  filename: string;
  filesOnServer: string[];

  lastGraph: string;
  constructor(private graphService: GraphService, private filesService: FilesService, public dialog: MatDialog) {}

  ngOnInit() {
  }

  save(filename: string) {
    // this.filesService.save('filename', this.graphService.graphToString()).subscribe();
    this.lastGraph = this.graphService.graphToString();
  }

  load(filename: string) {
    // this.filesService.load('filename').subscribe(graph => this.graphService.stringToGraph(graph));
    this.graphService.stringToGraph(this.lastGraph);
  }

  delete() {
    this.graphService.delete();
  }

  openSaveDialog(): void {
    const dialogRef = this.dialog.open(SaveGraphComponent, {
      width: '250px',
      data: { filename: this.filename}
    });

    dialogRef.afterClosed().subscribe(result => {
      this.save(result);
    });
  }

  openLoadDialog(): void {
    const dialogRef = this.dialog.open(LoadGraphComponent, {
      width: '250px',
      data: {filesOnServer: this.filesOnServer}
    });

    dialogRef.afterClosed().subscribe(result => {
      this.load(result);
    });
  }
}
