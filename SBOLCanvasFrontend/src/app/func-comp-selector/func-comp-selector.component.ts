import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatTableDataSource, MatDialogRef } from '@angular/material';

@Component({
  selector: 'app-func-comp-selector',
  templateUrl: './func-comp-selector.component.html',
  styleUrls: ['./func-comp-selector.component.css']
})
export class FuncCompSelectorComponent implements OnInit {

  public static readonly FUNCTIONAL_COMPONENT_MODE = 1;
  public static readonly COMBINATORIAL_MODE = 2;

  // This is so we can use static variables in the html checks
  classRef = FuncCompSelectorComponent;

  mode;
  options = new MatTableDataSource([]);
  displayedColumns: string[] = ['displayId', 'name'];
  from: string = "";
  selection: any;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<FuncCompSelectorComponent>) { }

  ngOnInit() {
    if(this.data){
      if(this.data.mode){
        this.mode = this.data.mode;
      }else{
        this.mode = FuncCompSelectorComponent.FUNCTIONAL_COMPONENT_MODE;
      }

      if(this.mode == FuncCompSelectorComponent.COMBINATORIAL_MODE){
        this.displayedColumns = ['displayId', 'name', 'version', 'description'];
      }else{
        this.from = this.data.from;
      }
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
