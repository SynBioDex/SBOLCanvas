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

}
