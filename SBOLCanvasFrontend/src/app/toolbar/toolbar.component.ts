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

  constructor(private graphService: GraphService, private filesService: FilesService, public dialog: MatDialog) {}

  ngOnInit() {
  }

  ngAfterViewInit() {
    // TODO this is code for making the 'new strand' a dragsource
    // this.graphService.addNewBackbone(this.backbone.nativeElement);
  }

  save(filename: string) {
    this.filesService.saveLocal(filename, this.graphService.getTopLevelXML());
  }

  load(filename: string) {
    this.filesService.load(filename).subscribe(graph => this.graphService.setModelWithXML(graph));
  }

  delete() {
    this.graphService.delete();
  }

  undoChange(){
    this.graphService.undo();
  }

  redoChange(){
    this.graphService.redo();
  }

  zoom(){
    this.graphService.zoom();
  }

  unzoom(){
    this.graphService.unzoom();
  }

  addStrand() {
    this.graphService.addNewBackbone();
  }

  addTextBox() {
    this.graphService.addTextBox();
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
