import { Component, OnInit, Inject } from '@angular/core';
import { MatTableDataSource, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material';
import { CombinatorialInfo } from '../combinatorialInfo';
import { DownloadGraphComponent } from '../download-graph/download-graph.component';
import { GlyphInfo } from '../glyphInfo';
import { MetadataService } from '../metadata.service';

@Component({
  selector: 'app-combinatorial-design-editor',
  templateUrl: './combinatorial-design-editor.component.html',
  styleUrls: ['./combinatorial-design-editor.component.css']
})
export class CombinatorialDesignEditorComponent implements OnInit {

  operators: String[] = ['Zero Or One', 'One', 'Zero Or More', 'One Or More'];
  operator: String = this.operators[1];

  strategies = ['None', 'Enumerate', 'Sample'];
  strategy: String = this.strategies[0];

  combinatorialInfo: CombinatorialInfo;
  componentInfo: GlyphInfo;

  displayedColumns: string[] = ['type', 'displayId', 'name', 'version', 'description'];
  parts = new MatTableDataSource([]);

  selectedRow;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private metadataService: MetadataService, public dialog: MatDialog, public dialogRef: MatDialogRef<CombinatorialDesignEditorComponent>) {
    this.parts.data = [{ type: "something", displayID: "Something", name: "testName", version: "1", description: "Test description" },
    { type: "type2", displayID: "something2", name: "Testname2", version: "1", description: "TestDescription2" },
    { type: "type2", displayID: "something2", name: "Testname3", version: "1", description: "TestDescription2" },
    { type: "type2", displayID: "something2", name: "Testname4", version: "1", description: "TestDescription2" },
    { type: "type2", displayID: "something2", name: "Testname5", version: "1", description: "TestDescription2" }];

    this.metadataService.selectedCombinatorialInfo.subscribe(combinatorialInfo => this.combinatorialInfoUpdated(combinatorialInfo));
    this.metadataService.selectedGlyphInfo.subscribe(componentInfo => this.componentInfoUpdated(componentInfo));
  }

  ngOnInit() {
    if (this.data) {
      this.combinatorialInfo = this.data.combinatorial;
      this.componentInfo = this.data.component;
    }
  }

  setOperator(event: any) {

  }

  setStrategy(event: any) {

  }

  inputChange(event: any) {

  }

  onRowClick(row: any) {
    this.selectedRow = row;
  }

  highlightRow(row: any) {
    if (this.selectedRow)
      return row === this.selectedRow;
    return false;
  }

  onAddVariantClick() {
    this.dialog.open(DownloadGraphComponent, {
      data: {
        moduleMode: false,
        info: this.componentInfo
      }
    });
  }

  onCancelClick() {
    this.dialogRef.close();
  }

  isRowSelected() {
    return this.selectedRow != null;
  }

  onRemoveClick() {
    for (let i = 0; i < this.parts.data.length; i++) {
      if (this.parts.data[i] === this.selectedRow) {
        this.parts.data.splice(i, 1);
        // splice doesn't trigger a change update
        this.parts.data = this.parts.data;
        this.selectedRow = null;
        break;
      }
    }
  }

  onSaveClick() {

  }

  /**
   * Updates both the component info in the form and in the graph.
   */
  componentInfoUpdated(componentInfo: GlyphInfo) {
    this.componentInfo = componentInfo;
  }

  /**
   * Updates both the combinatorial info in the form and in the graph.
   */
  combinatorialInfoUpdated(combinatorialInfo: CombinatorialInfo){
    this.combinatorialInfo = combinatorialInfo;
  }

}
