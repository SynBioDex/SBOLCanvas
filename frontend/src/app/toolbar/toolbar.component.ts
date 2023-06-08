import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChild } from '@angular/core';
import { GraphService } from '../graph.service';
import { FilesService } from '../files.service';
import { MatDialog } from '@angular/material';
import { UploadGraphComponent } from '../upload-graph/upload-graph.component';
import { DownloadGraphComponent } from '../download-graph/download-graph.component';
import { ExportImageComponent } from '../export-image/export-image.component';
import { ExportDesignComponent } from '../export-design/export-design.component';
import { ConfirmComponent } from '../confirm/confirm.component';
import { LoadGraphComponent } from '../load-graph/load-graph.component';
import { EmbeddedService } from '../embedded.service';

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
  popupOpen: boolean;
  users: {};

  constructor(public graphService: GraphService, private filesService: FilesService,
              public dialog: MatDialog, public embeddedService: EmbeddedService) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
  }

  openUploadDialog(): void {
    this.dialog.open(UploadGraphComponent, {
      data: {componentMode: this.graphService.isRootAComponentView()}
    });
  }

  openDownloadDialog(): void{
    this.dialog.open(DownloadGraphComponent);
  }

  openImportDialog(): void {
    this.dialog.open(UploadGraphComponent, {
      data: {componentMode: this.graphService.isRootAComponentView(), importMode: true }
    });
  }

  openExportImageDialog(): void {
    this.dialog.open(ExportImageComponent, {});
  }

  openExportDialog(): void {
    this.dialog.open(ExportDesignComponent, {
      data: {mode: "Export"}
    });
  }

  openEnumerateDialog(): void {
    this.dialog.open(ExportDesignComponent, {
      data: {mode: "Enumerate"}
    });
  }

  zoomChanged($event) {
    let number = parseInt($event.target.value);
    if (!isNaN(number)) {
      const percent = number / 100;
      this.graphService.setZoom(percent);
    }

    // if they entered nonsense the zoom doesn't change, which
    // means angular won't refresh the input box on its own
    $event.target.value = this.getZoomDisplayValue();
  }

  openLoadDialog(): void {
    const dialogRef = this.dialog.open(LoadGraphComponent, {
      data: { file: null }
    });
    this.popupOpen = true;
    dialogRef.afterClosed().subscribe(result => {
      this.popupOpen = false;
    });
  }

  getZoomDisplayValue() {
    let percent = this.graphService.getZoom() * 100;
    let string = percent.toFixed(0);
    return string.toString() + '%';
  }

  async newModuleDesign(){
    const confirmRef = this.dialog.open(ConfirmComponent, { data: { message: "Are you sure you want a new module design? You will lose all your current changes.", options: ["Yes", "Cancel"] } });
    let result = await confirmRef.afterClosed().toPromise();
    if(result === "Yes"){
      this.graphService.resetGraph(true);
    }
  }

  async newComponentDesign(){
    const confirmRef = this.dialog.open(ConfirmComponent, { data: { message: "Are you sure you want a new component design? You will lose all your current changes.", options: ["Yes", "Cancel"] } });
    let result = await confirmRef.afterClosed().toPromise();
    if(result === "Yes"){
      this.graphService.resetGraph(false);
    }
  }

  enumerateAvailable(){
    return this.graphService.isRootAComponentView();
  }

  // make sure to comment out the button in the html when preparing to make a merge request
  testMethod(){
    this.graphService.addMolecularSpecies("replacement-glyph");
    this.graphService.addInteractionNode("replacement-glyph");
  }
}
