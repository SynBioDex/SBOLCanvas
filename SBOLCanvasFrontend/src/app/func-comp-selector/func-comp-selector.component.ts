import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatTableDataSource, MatDialogRef } from '@angular/material';

@Component({
  selector: 'app-func-comp-selector',
  templateUrl: './func-comp-selector.component.html',
  styleUrls: ['./func-comp-selector.component.css']
})
export class FuncCompSelectorComponent implements OnInit {

  options = new MatTableDataSource([]);
  displayedColumns: string[] = ['displayID', 'name'];
  from: string = "";
  selection: any;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<FuncCompSelectorComponent>) { }

  ngOnInit() {
    if(this.data){
      this.from = this.data.from;
      this.options.data = this.data.options;
    }
  }

  onCancelClick(){
    this.dialogRef.close(null);
  }

  onOkClick(){
    this.dialogRef.close(this.selection);
  } 
  
  finishCheck(): boolean{
    return this.selection;
  }

  onRowClick(row: any){
    this.selection = row;
  }


  highlightRow(row: any){
    if(this.selection)
      return this.selection === row;
    return false;
  }

  onRowDoubleClick(row: any){

  }

}
