import { Component, OnInit } from '@angular/core';
import { MatTableDataSource, MatDialogRef, MatDialog } from '@angular/material';
import { CombinatorialInfo } from '../combinatorialInfo';
import { DownloadGraphComponent } from '../download-graph/download-graph.component';
import { GlyphInfo } from '../glyphInfo';
import { GraphService } from '../graph.service';
import { IdentifiedInfo } from '../identifiedInfo';
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

  working: boolean = false;

  prevURI: string; // have to store the previous uri, as there is no way to know what it used to be in the graphHelpers
  combinatorialInfo: CombinatorialInfo;
  variableComponentInfo: VariableComponentInfo;
  componentInfo: GlyphInfo;

  displayedColumns: string[] = ['type', 'displayId', 'name', 'version', 'description'];
  parts = new MatTableDataSource([]);

  selectedRow;

  constructor(private graphService: GraphService, private metadataService: MetadataService, public dialog: MatDialog, public dialogRef: MatDialogRef<CombinatorialDesignEditorComponent>) {
    this.parts.data = [];

    this.metadataService.selectedCombinatorialInfo.subscribe(combinatorialInfo => this.combinatorialInfoUpdated(combinatorialInfo));
    this.metadataService.selectedGlyphInfo.subscribe(componentInfo => this.componentInfoUpdated(componentInfo));
  }

  ngOnInit() {
  }

  setOperator(value: any) {
    this.variableComponentInfo.operator = value;
  }

  setStrategy(value: any) {
    this.combinatorialInfo.strategy = value;
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
    }).afterClosed().subscribe(results => {
      if(!results)
        return;
      // for some reason if we don't load it into a IdentifiedInfo it is considered 'Object'
      for(let result of results){
        let identifiedInfo = new IdentifiedInfo();
        identifiedInfo.description = result.description;
        identifiedInfo.displayId = result.displayID;
        identifiedInfo.name = result.name;
        identifiedInfo.type = result.type;
        identifiedInfo.uri = result.uri;
        identifiedInfo.version = result.version;
        this.variableComponentInfo.addVariant(identifiedInfo);
        // The table doesn't update without this
      }
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
    this.graphService.setSelectedCombinatorialInfo(this.combinatorialInfo, this.prevURI);
    this.dialogRef.close();
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
    this.prevURI = this.combinatorialInfo.getFullURI();
    this.setupPartsData();
  }

  setupPartsData(){
    // make sure we have both the componentInfo and combinatorialInfo before doing this
    if(!this.componentInfo || !this.combinatorialInfo)
      return;
    this.variableComponentInfo = this.combinatorialInfo.getVariableComponentInfo(this.graphService.getSelectedCellID());
    if(!this.variableComponentInfo){
      this.variableComponentInfo = new VariableComponentInfo(this.graphService.getSelectedCellID());
      this.variableComponentInfo.operator = this.operators[1];
      this.combinatorialInfo.addVariableComponentInfo(this.variableComponentInfo);
    }
    this.parts.data = this.variableComponentInfo.variants;
  }

}
