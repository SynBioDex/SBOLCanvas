import {AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChild} from '@angular/core';
import {GraphService} from '../graph.service';
import {FilesService} from '../files.service';
import {MatDialog} from '@angular/material';
import {SaveGraphComponent} from '../save-graph/save-graph.component';
import {LoadGraphComponent} from '../load-graph/load-graph.component';

export interface SaveDialogData {
  filename: string;
}
export interface LoadDialogData {
  filesOnServer: string[];
}

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnInit, AfterViewInit {

  @ViewChild('backbone') backbone: ElementRef;

  filename: string;

  lastGraph: string;

  filesOnServer: string[] = [
    'serverFile0.xml',
    'serverFile1.xml',
    'serverFile2.xml',
    'serverFile3.xml',
    'serverFile4.xml',
    'serverFile5.xml',
    'serverFile6.xml',
    'serverFile7.xml',
    'serverFile8.xml',
    'serverFile9.xml',
    'serverFile10.xml',
    'serverFile11.xml',
    'serverFile12.xml',
    'serverFile13.xml',
    'serverFile14.xml',
    'serverFile15.xml',
    'serverFile16.xml'
  ]

  //@ViewChild('textDragSource') textDragSource: ElementRef;

  constructor(private graphService: GraphService, private filesService: FilesService, public dialog: MatDialog) {}

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.graphService.addNewDNABackBone(this.backbone.nativeElement);
  }

  save(filename: string) {
    this.filesService.save(filename, this.graphService.graphToString()).subscribe();
    // this.lastGraph = this.graphService.graphToString();
  }

  load(filename: string) {
    this.filesService.load(filename).subscribe(graph => this.graphService.stringToGraph(graph));
    // this.graphService.stringToGraph(this.lastGraph);
  }

  delete() {
    this.graphService.delete();
  }

  addTextBox() {
    this.graphService.addTextBox();
  }

  addNewDNABackBone() {
    this.graphService.addNewDNABackBone(1)
  }

  openSaveDialog(): void {
    const dialogRef = this.dialog.open(SaveGraphComponent, {
      width: '250px',
      data: { filename: this.filename}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result != null) {
        this.save(result);
        // console.log(result);
      }
    });
  }

  openLoadDialog(): void {
    /*const dialogRef = this.dialog.open(LoadGraphComponent, {
      width: '250px',
      // TODO use the file.service to get the filenames and delete the array hardcoded for this.filesOnServer
      data: {filesOnServer: this.filesOnServer}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result != null) {
        this.load(result);
        // console.log(result);
      }
    });*/

    this.filesService.list().subscribe(list => {
      const dialogRef = this.dialog.open(LoadGraphComponent, {
        width: '250px',
        data: {filesOnServer: list}
      });
      dialogRef.afterClosed().subscribe(result => {
        if(result != null) {
          this.load(result);
        }
      });
    });
  }
}
