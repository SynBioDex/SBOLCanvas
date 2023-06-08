import { Component, OnInit } from '@angular/core';
import { GraphService } from '../graph.service';
import { MatDialogRef } from '@angular/material';

@Component({
  selector: 'app-export',
  templateUrl: './export-image.component.html',
  styleUrls: ['./export-image.component.css']
})
export class ExportImageComponent implements OnInit {

  formats = ["PNG","GIF","JPEG","SVG"];

  filename: string;
  format: string;

  constructor(private graphService: GraphService, public dialogRef: MatDialogRef<ExportImageComponent>) { }

  ngOnInit() {
    this.format="PNG";
  }

  onExportClick(){
    if(this.format === "SVG"){
      this.graphService.exportSVG(this.filename);
    }else{
      this.graphService.exportImage(this.filename, this.format);
    }
    this.dialogRef.close();
  }

  onCancelClick(){
    this.dialogRef.close();
  }

  finishCheck():boolean {
    return this.filename != null && this.filename.length > 0;
    return false;
  }

}
