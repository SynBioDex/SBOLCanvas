import { Component, OnInit, Inject, ChangeDetectorRef } from '@angular/core';
import { MatTableDataSource, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material';
import { CombinatorialInfo } from '../combinatorialInfo';
import { DownloadGraphComponent } from '../download-graph/download-graph.component';
import { GlyphInfo } from '../glyphInfo';
import { MetadataService } from '../metadata.service';
import { VariableComponentInfo } from '../variableComponentInfo';

@Component({
  selector: 'app-combinatorial-design-editor',
  templateUrl: './combinatorial-design-editor.component.html',
  styleUrls: ['./combinatorial-design-editor.component.css']
})
export class CombinatorialDesignEditorComponent implements OnInit {

  operators: string[] = ['Zero Or One', 'One', 'Zero Or More', 'One Or More'];

  strategies = ['None', 'Enumerate', 'Sample'];

  combinatorialInfo: CombinatorialInfo;
  variableComponentInfo: VariableComponentInfo;
  componentInfo: GlyphInfo;

  displayedColumns: string[] = ['displayId', 'name', 'version', 'description'];
  parts = new MatTableDataSource([]);

  selectedRow;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private metadataService: MetadataService, public dialog: MatDialog, public dialogRef: MatDialogRef<CombinatorialDesignEditorComponent>) {
    this.parts.data = [];

    this.metadataService.selectedCombinatorialInfo.subscribe(combinatorialInfo => this.combinatorialInfoUpdated(combinatorialInfo));
    this.metadataService.selectedGlyphInfo.subscribe(componentInfo => this.componentInfoUpdated(componentInfo));
  }

  ngOnInit() {
  }

  setOperator(event: any) {
    this.variableComponentInfo.operator = event.value;
  }

  setStrategy(event: any) {
    this.combinatorialInfo.strategy = event.value;
  }

  setDisplayID(event: any){
    // TODO: scan through the combinatorial info's to check for a duplicate
    this.combinatorialInfo.displayID = event.target.value;
  }

  setName(event: any){
    this.combinatorialInfo.name = event.target.value;
  }

  setDescription(event: any){
    this.combinatorialInfo.description = event.target.value;
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
        mode: DownloadGraphComponent.SELECT_MODE,
        type: DownloadGraphComponent.COMPONENT_TYPE,
        info: this.componentInfo
      }
    }).afterClosed().subscribe(result => {
      if(!result)
        return;
      // load the result into a GlyphInfo so it can be decoded by the backend easily
      let info = new GlyphInfo();
      info.displayID = result.displayId;
      info.version = result.version;
      info.description = result.description;
      info.name = result.name;
      info.uriPrefix = result.uri.substring(0,result.uri.indexOf("/"+result.displayId))
      this.variableComponentInfo.addVariant(info);
      // The table doesn't update without this
      this.parts.data = this.variableComponentInfo.variants;
    });
  }

  onCancelClick() {
    this.dialogRef.close();
  }

  isRowSelected() {
    return this.selectedRow != null;
  }

  onRemoveClick() {
    for (let i = 0; i < this.variableComponentInfo.variants.length; i++) {
      if (this.variableComponentInfo.variants[i] === this.selectedRow) {
        this.variableComponentInfo.variants.splice(i, 1);
        this.selectedRow = null;
        break;
      }
    }
    this.parts.data = this.variableComponentInfo.variants;
  }

  onSaveClick() {

  }

  /**
   * Updates both the component info in the form and in the graph.
   */
  componentInfoUpdated(componentInfo: GlyphInfo) {
    this.componentInfo = componentInfo;
    this.setupPartsData();
  }

  /**
   * Updates both the combinatorial info in the form and in the graph.
   */
  combinatorialInfoUpdated(combinatorialInfo: CombinatorialInfo){
    this.combinatorialInfo = combinatorialInfo;
    if(!this.combinatorialInfo.strategy){
      this.combinatorialInfo.strategy = this.strategies[0];
    }
    this.setupPartsData();
  }

  setupPartsData(){
    // make sure we have both the componentInfo and combinatorialInfo before doing this
    if(!this.componentInfo || !this.combinatorialInfo)
      return;
    this.variableComponentInfo = this.combinatorialInfo.getVariableComponentInfo(this.componentInfo.getFullURI());
    if(!this.variableComponentInfo){
      this.variableComponentInfo = new VariableComponentInfo(this.componentInfo.getFullURI());
      this.variableComponentInfo.operator = this.operators[1];
      this.combinatorialInfo.addVariableComponentInfo(this.variableComponentInfo);
    }
    this.parts.data = this.variableComponentInfo.variants;
  }

}
