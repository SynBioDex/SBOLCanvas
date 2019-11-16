import * as mxGraph from 'mxgraph';
import * as mxCell from 'mxgraph';

declare var require: any;
const mx = require('mxgraph')({
  mxImageBasePath: 'mxgraph/images',
  mxBasePath: 'mxgraph'
});

// object used as an enum to identify glyph types
const elementTypes = {
  CIRCUIT_CONTAINER: "0",
  TEXT_BOX: "1",
  SEQUENCE_FEATURE: "2",
  MOLECULAR_SPECIES: "3",
  INTERACTION: "4",
}

/**
 * A class for relaying style information between the graph and the design menu
 */
export class StyleInfo {

  // a reference to the graph
  graph: any;

  // An array of all the cells this style info represents
  selection: any[];

  // A set identifying which types of cells are present in this.selection
  selectionTypes: Set<string>;

  constructor(selection: any[], graph?: any) {
    this.selection = selection;
    this.graph = graph ? graph : null;
    this.selectionTypes = new Set<string>();

    for (const cell of selection) {
      if (cell.isSequenceFeatureGlyph()) {
        this.selectionTypes.add(elementTypes.SEQUENCE_FEATURE);
      } else if (cell.isMolecularSpeciesGlyph()) {
        this.selectionTypes.add(elementTypes.MOLECULAR_SPECIES);
      } else if (cell.isInteraction()) {
        this.selectionTypes.add(elementTypes.INTERACTION);
      } else if (cell.isCircuitContainer()) {
        this.selectionTypes.add(elementTypes.CIRCUIT_CONTAINER);
      } else if (cell.isBackbone()) {
        console.error("Error: backbone was selected (detected in StyleInfo constructor)");
      }
      else {
        // otherwise assume textbox
        this.selectionTypes.add(elementTypes.TEXT_BOX);
      }
    }
  }

  hasStrokeColor() : boolean {
    // all cell types have a strokeColor
    return this.selection.length > 0;
  }
  currentStrokeColor() : string {
    const cell = this.selection[0];
    // strokeColor goes to circuitContainers' backbones
    if (cell.isCircuitContainer()) {
      return this.graph.getCellStyle(cell.getBackbone())[mx.mxConstants.STYLE_STROKECOLOR];
    } else {
      return this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_STROKECOLOR];
    }
  }
  setStrokeColor(newValue: string) : void {
    this.graph.getModel().beginUpdate();
    try {
      for (const cell of this.selection) {
        // strokeColor goes to circuitContainers' backbones
        if (cell.isCircuitContainer()) {
          this.graph.setCellStyles(mx.mxConstants.STYLE_STROKECOLOR, newValue, [cell.getBackbone()]);
        } else {
          this.graph.setCellStyles(mx.mxConstants.STYLE_STROKECOLOR, newValue, [cell]);
        }
      }
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasStrokeOpacity() : boolean {
    return this.selection.length > 0;
  }
  currentStrokeOpacity() : number {
    const cell = this.selection[0];
    let val;
    if (cell.isCircuitContainer()) {
      val = this.graph.getCellStyle(cell.getBackbone())[mx.mxConstants.STYLE_STROKE_OPACITY];
    } else {
      val = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_STROKE_OPACITY];
    }
    return (typeof val === 'undefined') ? 100 : val;
  }
  setStrokeOpacity(newValue: number) : void {
    this.graph.getModel().beginUpdate();
    try {
      for (const cell of this.selection) {
        if (cell.isCircuitContainer()) {
          this.graph.setCellStyles(mx.mxConstants.STYLE_STROKE_OPACITY, newValue, [cell.getBackbone()]);
        } else {
          this.graph.setCellStyles(mx.mxConstants.STYLE_STROKE_OPACITY, newValue, [cell]);
        }
      }
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasStrokeWidth() : boolean {
    return this.selection.length > 0
      && !this.selectionTypes.has(elementTypes.SEQUENCE_FEATURE)
      && !this.selectionTypes.has(elementTypes.MOLECULAR_SPECIES);
  }
  currentStrokeWidth() : number {
    const cell = this.selection[0];
    let val;
    if (cell.isCircuitContainer()) {
      val = this.graph.getCellStyle(cell.getBackbone())[mx.mxConstants.STYLE_STROKEWIDTH];
    } else {
      val = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_STROKEWIDTH];
    }
    return (typeof val === 'undefined') ? 1 : val;
  }
  setStrokeWidth(newValue: number) : void {
    this.graph.getModel().beginUpdate();
    try {
      for (const cell of this.selection) {
        if (cell.isCircuitContainer()) {
          this.graph.setCellStyles(mx.mxConstants.STYLE_STROKEWIDTH, newValue, [cell.getBackbone()]);
        } else {
          this.graph.setCellStyles(mx.mxConstants.STYLE_STROKEWIDTH, newValue, [cell]);
        }
      }
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasFillColor() : boolean {
    // no interactions allowed
    // (even ones that look filled should use the same color as their stroke)
    return this.selection.length > 0 && !this.selectionTypes.has(elementTypes.INTERACTION);
  }
  currentFillColor() : string {
    const cell = this.selection[0];
    return this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_FILLCOLOR];
  }
  setFillColor(newValue: string) : void {
    this.graph.getModel().beginUpdate();
    try {
      this.graph.setCellStyles(mx.mxConstants.STYLE_FILLCOLOR, newValue, this.selection);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasFillOpacity() : boolean {
    return this.selection.length > 0 && !this.selectionTypes.has(elementTypes.INTERACTION);
  }
  currentFillOpacity() : number {
    const cell = this.selection[0];
    let val = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_FILL_OPACITY];
    return (typeof val === 'undefined') ? 100 : val;
  }
  setFillOpacity(newValue: number) : void {
    this.graph.getModel().beginUpdate();
    try {
      this.graph.setCellStyles(mx.mxConstants.STYLE_FILL_OPACITY, newValue, this.selection);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasBendStyle() : boolean {
    // must only have interactions
    return this.selectionTypes.has(elementTypes.INTERACTION) && this.selectionTypes.size === 1;
  }
  currentBendStyle() : string {
    const cell = this.selection[0];
    let rounded = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_ROUNDED];
    let curved = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_CURVED];

    if (curved) {
      return "curved";
    } else {
      return rounded ? "rounded" : "sharp";
    }
  }
  setBendStyle(newValue: string) : void {
    this.graph.getModel().beginUpdate();
    try {
      switch (newValue) {
        case "sharp":
          this.graph.setCellStyles(mx.mxConstants.STYLE_ROUNDED, 0, this.selection);
          this.graph.setCellStyles(mx.mxConstants.STYLE_CURVED, 0, this.selection);
          break;
        case "rounded":
          this.graph.setCellStyles(mx.mxConstants.STYLE_ROUNDED, 1, this.selection);
          this.graph.setCellStyles(mx.mxConstants.STYLE_CURVED, 0, this.selection);
          break;
        case "curved":
          this.graph.setCellStyles(mx.mxConstants.STYLE_ROUNDED, 0, this.selection);
          this.graph.setCellStyles(mx.mxConstants.STYLE_CURVED, 1, this.selection);
          break;
      }
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasEndSize() : boolean {
    // must only have interactions
    return this.selectionTypes.has(elementTypes.INTERACTION) && this.selectionTypes.size === 1;
  }
  currentEndSize() : string {
    const cell = this.selection[0];
    return this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_ENDSIZE];
  }
  setEndSize(newValue: string) : void {
    this.graph.getModel().beginUpdate();
    try {
      this.graph.setCellStyles(mx.mxConstants.STYLE_ENDSIZE, newValue, this.selection);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasEdgeStyle() : boolean {
    // must only have interactions
    return this.selectionTypes.has(elementTypes.INTERACTION) && this.selectionTypes.size === 1;
  }
  currentEdgeStyle() : string {
    const cell = this.selection[0];
    let style = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_EDGE];
    if (!style) {
      // undefined style means mxGraph's default, which is diagonal
      style = 'diagonal';
    }
    return style;
  }
  setEdgeStyle(newValue: string) : void {
    this.graph.getModel().beginUpdate();
    try {
      this.graph.setCellStyles(mx.mxConstants.STYLE_EDGE, newValue, this.selection);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasSourceSpacing() : boolean {
    // must only have interactions
    return this.selectionTypes.has(elementTypes.INTERACTION) && this.selectionTypes.size === 1;
  }
  currentSourceSpacing() : string {
    const cell = this.selection[0];
    let value = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_SOURCE_PERIMETER_SPACING];;
    return value ? value : 0;
  }
  setSourceSpacing(newValue: number) : void {
    this.graph.getModel().beginUpdate();
    try {
      this.graph.setCellStyles(mx.mxConstants.STYLE_SOURCE_PERIMETER_SPACING, newValue, this.selection);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasTargetSpacing() : boolean {
    // must only have interactions
    return this.selectionTypes.has(elementTypes.INTERACTION) && this.selectionTypes.size === 1;
  }
  currentTargetSpacing() : string {
    const cell = this.selection[0];
    let value = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_TARGET_PERIMETER_SPACING];;
    return value ? value : 0;
  }
  setTargetSpacing(newValue: number) : void {
    this.graph.getModel().beginUpdate();
    try {
      this.graph.setCellStyles(mx.mxConstants.STYLE_TARGET_PERIMETER_SPACING, newValue, this.selection);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasFontColor() : boolean {
    // must have only text boxes
    return this.selectionTypes.has(elementTypes.TEXT_BOX) && this.selectionTypes.size === 1;
  }
  currentFontColor() : string {
    const cell = this.selection[0];
    return this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_FONTCOLOR];
  }
  setFontColor(newValue: string) : void {
    this.graph.getModel().beginUpdate();
    try {
      this.graph.setCellStyles(mx.mxConstants.STYLE_FONTCOLOR, newValue, this.selection);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasFontOpacity() : boolean {
    return this.selection.length > 0 && !this.selectionTypes.has(elementTypes.INTERACTION);
  }
  currentFontOpacity() : number {
    const cell = this.selection[0];
    let val = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_TEXT_OPACITY];
    return (typeof val === 'undefined') ? 100 : val;
  }
  setFontOpacity(newValue: number) : void {
    this.graph.getModel().beginUpdate();
    try {
      this.graph.setCellStyles(mx.mxConstants.STYLE_TEXT_OPACITY, newValue, this.selection);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  hasFontSize() : boolean {
    return this.selection.length > 0 && !this.selectionTypes.has(elementTypes.INTERACTION);
  }
  currentFontSize() : number {
    const cell = this.selection[0];
    let val = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_FONTSIZE];
    return (typeof val === 'undefined') ? 11 : val;
  }
  setFontSize(newValue: number) : void {
    this.graph.getModel().beginUpdate();
    try {
      this.graph.setCellStyles(mx.mxConstants.STYLE_FONTSIZE, newValue, this.selection);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

}
