import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material';

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
  
  parts = new MatTableDataSource([]);


  constructor() {
    this.parts.data = [{type: "something", displayID:"Something", name:"testName", version:"1", description:"Test description"}];
  }

  ngOnInit() {
  }

  setOperator(event: any){

  }

  setStrategy(event: any){

  }

  inputChange(event: any){

  }

  onRowClick(row: any){

  }

  highlightRow(row: any){

  }

  onAddVariantClick(){

  }

  onCancelClick(){

  }

  isRowSelected(){

  }

  onRemoveClick(){

  }

  onSaveClick(){

  }

}
