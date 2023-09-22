import { Component, Inject, OnInit } from '@angular/core';
import { GraphService } from '../graph.service';

import { MatDialogRef } from '@angular/material/dialog';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FilesService } from '../files.service';
import { LoginService } from '../login.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import {FormsModule} from '@angular/forms'
@Component({
  standalone:true,
  selector: 'app-export-design',
  templateUrl: './export-design.component.html',
  styleUrls: ['./export-design.component.css'],
  imports: [MatCardModule, MatFormFieldModule, MatSelectModule, MatInputModule, FormsModule]
})
export class ExportDesignComponent implements OnInit {

  mode: string;

  working: boolean = false;

  exportFormats = ["SBOL2", "SBOL1", "GenBank", "GFF", "Fasta"];
  enumerateFormats = ["SBOL2", "CSV"];
  formats = [];

  filename: string;
  format: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private graphService: GraphService, private loginService: LoginService, private filesService: FilesService, public dialogRef: MatDialogRef<ExportDesignComponent>) { }

  ngOnInit() {
    this.mode = this.data.mode;
    if(this.mode == "Export"){
      this.formats = this.exportFormats;
    }else{
      this.formats = this.enumerateFormats;
    }
    this.format=this.formats[0];
  }

  onFinishClick(){
    this.working = true;
    if(this.mode == "Export"){
      this.filesService.exportDesign(this.loginService.users, this.filename, this.format, this.graphService.getGraphXML()).subscribe(_ => {
        this.working = false;
        this.dialogRef.close();
      });
    }else{
      this.filesService.enumerateDesign(this.loginService.users, this.filename, this.format, this.graphService.getGraphXML()).subscribe(_ => {
        this.working = false;
        this.dialogRef.close();
      });
    }
  }

  onCancelClick(){
    this.dialogRef.close();
  }

  finishCheck():boolean {
    return this.filename != null && this.filename.length > 0;
    return false;
  }

}
