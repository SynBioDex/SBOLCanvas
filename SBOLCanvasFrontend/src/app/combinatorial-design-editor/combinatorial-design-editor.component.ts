import { Component, OnInit, Inject } from '@angular/core';
import { MatTableDataSource, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-combinatorial-design-editor',
  templateUrl: './combinatorial-design-editor.component.html',
  styleUrls: ['./combinatorial-design-editor.component.css']
})
export class CombinatorialDesignEditorComponent implements OnInit {

  operators: String[] = ['Zero Or One','One','Zero Or More','One Or More'];
  operator: String = this.operators[1];

  strategies = ['None', 'Enumerate', 'Sample'];
  strategy: String = this.strategies[0];
  
  combinatorialInfo = {displayID: "testID", name: "testName", description: "testDescription"};
  
  displayedColumns: string[] = ['type', 'displayId', 'name', 'version', 'description'];
  parts = new MatTableDataSource([]);

  componentURI: string;
  parentURI: string;

  selectedRow;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, public dialogRef: MatDialogRef<CombinatorialDesignEditorComponent>) {
    this.parts.data = [{type: "something", displayID:"Something", name:"testName", version:"1", description:"Test description"},
     {type: "type2", displayID:"something2", name:"Testname2", version:"1", description:"TestDescription2"},
     {type: "type2", displayID:"something2", name:"Testname3", version:"1", description:"TestDescription2"},
     {type: "type2", displayID:"something2", name:"Testname4", version:"1", description:"TestDescription2"},
     {type: "type2", displayID:"something2", name:"Testname5", version:"1", description:"TestDescription2"}];
  }

  ngOnInit() {
    if(this.data){

    }
  }

  setOperator(event: any){

  }

  setStrategy(event: any){

  }

  inputChange(event: any){

  }

  onRowClick(row: any){
    this.selectedRow = row;
  }

  highlightRow(row: any){
    if (this.selectedRow)
      return row === this.selectedRow;
    return false;
  }

  onAddVariantClick(){

  }

  onCancelClick(){
    this.dialogRef.close();
  }

  isRowSelected(){
    return this.selectedRow != null;
  }

  onRemoveClick(){
    for (let i = 0; i < this.parts.data.length; i++){
      if(this.parts.data[i] === this.selectedRow){
        this.parts.data.splice(i, 1);
        // splice doesn't trigger a change update
        this.parts.data = this.parts.data;
        this.selectedRow = null;
        break;
      }
    }
  }

  onSaveClick(){

  }

}
