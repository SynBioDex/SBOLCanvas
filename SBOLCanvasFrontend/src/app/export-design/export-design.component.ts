import { Component, OnInit } from '@angular/core';
import { GraphService } from '../graph.service';
import { MatDialogRef } from '@angular/material';
import { FilesService } from '../files.service';

@Component({
  selector: 'app-export-design',
  templateUrl: './export-design.component.html',
  styleUrls: ['./export-design.component.css']
})
export class ExportDesignComponent implements OnInit {

  working: boolean = false;

  formats = ["SBOL2", "SBOL1", "GenBank", "GFF", "Fasta"];

  filename: string;
  format: string;

  constructor(private graphService: GraphService, private filesService: FilesService, public dialogRef: MatDialogRef<ExportDesignComponent>) { }

  ngOnInit() {
    this.format=this.formats[0];
  }

  onExportClick(){
    this.working = true;
    this.filesService.exportDesign(this.filename, this.format, this.graphService.getGraphXML()).subscribe(_ => {
      this.working = false;
      this.dialogRef.close();
    });
  }

  onCancelClick(){
    this.dialogRef.close();
  }

  finishCheck():boolean {
    return this.filename != null && this.filename.length > 0;
    return false;
  }

}
