/*
* GraphService
*
* This service controls the main editing canvas
*/

/// <reference path="./graph-base.ts"/>

import { Injectable } from '@angular/core';
import * as mxEditor from 'mxgraph';
import * as mxGraph from 'mxgraph';
import * as mxDragSource from 'mxgraph';
import * as mxCell from 'mxgraph';
import { GlyphInfo } from './glyphInfo';
import { StyleInfo } from './style-info';
import { MetadataService } from './metadata.service';
import { GlyphService } from './glyph.service';
import { InteractionInfo } from './interactionInfo';
import { environment } from 'src/environments/environment';
import { MatDialog } from '@angular/material';
import { ErrorComponent } from './error/error.component';
import { ConfirmComponent } from './confirm/confirm.component';
import { GraphEdits } from './graph-edits';
import { GraphBase, mx } from './graph-base';
import { GraphHelpers } from './graph-helpers';


/*declare var require: any;
const mx = require('mxgraph')({
  mxImageBasePath: 'mxgraph/images',
  mxBasePath: 'mxgraph'
});*/



@Injectable({
  providedIn: 'root'
})
export class GraphService extends GraphHelpers {

  constructor(public dialog: MatDialog, private metadataService: MetadataService, glyphService: GlyphService) {
    super(glyphService);

    this.graph.getSelectionModel().addListener(mx.mxEvent.CHANGE, mx.mxUtils.bind(this, this.handleSelectionChange));
  }

  isRootAComponentView(): boolean {
    return this.viewStack[0].isComponentView();
  }

  /**
   * Attempts some auto formatting on the graph.
   * Only affects the current "drill level," ie children cells are not affected.
   *
   * This generally does a bad job. Only use this for outside files with no
   * position information at all.
   */
  autoFormat() {
    var first = new mx.mxStackLayout(this.graph, false, 20);
    var second = new mx.mxFastOrganicLayout(this.graph);

    var layout = new mx.mxCompositeLayout(this.graph, [first, second], first);
    layout.execute(this.graph.getDefaultParent());

    this.fitCamera();
  }

  handleSelectionChange(sender, evt) {
    // 'added' and 'removed' properties are reversed in mxGraph
    var cellsRemoved = evt.getProperty('added');
    var cellsAdded = evt.getProperty('removed');

    console.debug("----handleSelectionChange-----");

    console.debug("cells removed: ");
    if (cellsRemoved) {
      for (var i = 0; i < cellsRemoved.length; i++) {
        console.debug(cellsRemoved[i]);
      }
    }

    console.debug("cells added: ");
    if (cellsAdded) {
      for (var i = 0; i < cellsAdded.length; i++) {
        console.debug(cellsAdded[i]);
      }
    }

    console.debug("Current root: ");
    console.debug(this.graph.getCurrentRoot());

    console.debug("Graph Model: ");
    console.debug(this.graph.getModel());

    // Don't just use the new cells though, use all currently selected ones.
    this.updateAngularMetadata(this.graph.getSelectionCells());
  }

  /**
   * Updates the data in the metadata service according to the cells properties
   */
  updateAngularMetadata(cells) {
    // start with null data, (re)add it as possible
    this.nullifyMetadata();

    if (!cells || cells.length === 0) {
      // no selection? can't display metadata
      return;
    }

    // style first.
    const styleInfo = new StyleInfo(cells, this.graph);
    this.metadataService.setSelectedStyleInfo(styleInfo);

    if (cells.length !== 1) {
      // multiple selections? can't display glyph data
      return;
    }

    const cell = cells[0];
    if (cell.isSequenceFeatureGlyph() || cell.isMolecularSpeciesGlyph() || cell.isCircuitContainer()) {
      const glyphInfo = this.getFromGlyphDict(cell.value);
      if (glyphInfo) {
        this.metadataService.setSelectedGlyphInfo(glyphInfo.makeCopy());
      }
    }
    else if (cell.isInteraction()) {
      let interactionInfo = cell.value;
      if (interactionInfo) {
        this.metadataService.setSelectedInteractionInfo(interactionInfo.makeCopy());
      }
    }
  }

  nullifyMetadata() {
    this.metadataService.setSelectedGlyphInfo(null);
    this.metadataService.setSelectedInteractionInfo(null);

    // Empty 'StyleInfo' object indicates that nothing is selected, so no options should be available
    this.metadataService.setSelectedStyleInfo(new StyleInfo([]));
  }


  /**
   * This method is called by the UI when the user turns scars on
   * or off.
   */
  toggleScars() {
    // Toggle showing scars
    if (this.showingScars) {
      this.showingScars = false;
    } else { this.showingScars = true; }

    // We hide scar glyphs by setting their widths to 0.
    console.debug("showing scars now equals " + this.showingScars);
    this.setAllScars(this.showingScars);
  }

  getScarsVisible() {
    // empty graph case
    if (!this.graph.getDefaultParent().children) {
      return true;
    }

    // normal case
    let allGraphCells = this.graph.getDefaultParent().children;
    for (let i = 0; i < allGraphCells.length; i++) {
      for (let j = 0; j < allGraphCells[i].children.length; j++) {
        if (allGraphCells[i].children[j].isScar()) {
          if (allGraphCells[i].children[j].getGeometry().width > 0)
            return true;
        }
      }
    }
    return false;
  }

  /**
   * Sets all scars in the current view
   * @param isCollapsed
   */
  setAllScars(isCollapsed: boolean) {
    this.graph.getModel().beginUpdate();
    try {
      let allGraphCells = this.graph.getDefaultParent().children;
      for (let i = 0; i < allGraphCells.length; i++) {
        if (allGraphCells[i].isCircuitContainer()) {
          this.setScars(allGraphCells[i], this.showingScars);
        }
      }
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Recursively changes all scars in a circuit container and
   * children circuit containers.
   * @param circuitContainer
   * @param isCollapsed
   */
  setScars(circuitContainer, isCollapsed: boolean) {
    let children = circuitContainer.children;
    for (let i = 0; i < children.length; i++) {
      if (children[i].isScar()) {
        console.debug("scar found");
        let child = children[i];
        const geo = new mx.mxGeometry(0, 0, 0, 0);
        geo.x = 0;
        geo.y = 0;
        geo.height = GraphBase.sequenceFeatureGlyphHeight;

        if (this.showingScars) {
          geo.width = GraphBase.sequenceFeatureGlyphWidth;
        } else {
          geo.width = 0;
        }
        this.graph.getModel().setGeometry(child, geo);
      }

      if (children[i].isSequenceFeatureGlyph()) {
        this.setScars(children[i].getCircuitContainer(this.graph), isCollapsed);
      }
    }
    circuitContainer.refreshCircuitContainer(this.graph)
  }

  /**
   * This method is called by the UI when the user asks to flip a
   * sequence feature glyph.
   * It swaps direction east/west.
   */
  async flipSequenceFeatureGlyph() {
    let selectionCells = this.graph.getSelectionCells();

    // flip any selected glyphs
    for (let cell of selectionCells) {
      if (cell.isSequenceFeatureGlyph()) {

        // check if we own this item
        if (this.graph.getCurrentRoot()) {
          let glyphInfo;
          if (this.graph.getCurrentRoot().isComponentView()) {
            // normal case
            glyphInfo = this.getFromGlyphDict(this.graph.getCurrentRoot().getId());
          } else {
            // edge case of a module view
            glyphInfo = this.getFromGlyphDict(cell.getParent().getValue());
          }
          if (glyphInfo.uriPrefix != GlyphInfo.baseURI && !await this.promptMakeEditableCopy(glyphInfo.displayID)) {
            return;
          }
        }

        // Make the cell face east/west.
        this.graph.getModel().beginUpdate();

        try {
          let direction = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_DIRECTION];
          console.debug("current glyph direction setting = " + direction);

          if (direction == undefined) {
            console.warn("direction style undefined. Assuming east, and turning to west");
            this.graph.setCellStyles(mx.mxConstants.STYLE_DIRECTION, "west");
          } else if (direction === "east") {
            this.graph.setCellStyles(mx.mxConstants.STYLE_DIRECTION, "west");
            console.debug("turning west")
          } else if (direction == "west") {
            this.graph.setCellStyles(mx.mxConstants.STYLE_DIRECTION, "east");
            console.debug("turning east")
          }

          // change the owner
          if (this.graph.getCurrentRoot()) {
            let glyphInfo;
            if (this.graph.getCurrentRoot().isComponentView()) {
              // normal case
              glyphInfo = this.getFromGlyphDict(this.graph.getCurrentRoot().getId());
            } else {
              // edge case of a module view
              glyphInfo = this.getFromGlyphDict(cell.getParent().getValue());
            }
            this.changeOwnership(glyphInfo.getFullURI());
          }
        } finally {
          this.graph.getModel().endUpdate();
        }
      } else if (cell.isInteraction()) {
        this.graph.getModel().beginUpdate();
        try {
          const src = cell.source;
          const dest = cell.target;
          this.graph.addEdge(cell, null, dest, src);
        } finally {
          this.graph.getModel().endUpdate();
        }
      }
    }
  }

  /**
   * "Drills in" to replace the canvas with the selected glyph's component definition
   */
  enterGlyph() {
    let selection = this.graph.getSelectionCells();
    if (selection.length != 1) {
      return;
    }

    if (!selection[0].isSequenceFeatureGlyph()) {
      return;
    }

    let zoomEdit = new GraphEdits.zoomEdit(this.graph.getView(), selection[0], this);
    this.graph.getModel().execute(zoomEdit);
  }

  /**
   * Moves up the drilling hierarchy, restoring the canvas to how it was before "Drilling in"
   * (If "enterGlyph" has not been called, ie the canvas is already
   * at the top of the drilling hierarchy, does nothing)
   */
  exitGlyph() {
    // the root view should always be left on the viewStack
    if (this.viewStack.length > 1) {
      let zoomEdit = new GraphEdits.zoomEdit(this.graph.getView(), null, this);
      this.graph.getModel().execute(zoomEdit);
    }
  }

  /**
   * Turns the given element into a dragsource for creating empty DNA strands
   */
  makeBackboneDragsource(element) {
    const insertGlyph = mx.mxUtils.bind(this, function (graph, evt, target, x, y) {
      this.addBackboneAt(x - GraphBase.sequenceFeatureGlyphWidth / 2, y - GraphBase.sequenceFeatureGlyphHeight / 2);
    });

    this.makeGeneralDragsource(element, insertGlyph);
  }

  makeGeneralDragsource(element, insertFunc) {
    const xOffset = -1 * element.getBoundingClientRect().width / 2;
    const yOffset = -1 * element.getBoundingClientRect().height / 2;

    const ds: mxDragSource = mx.mxUtils.makeDraggable(element, this.graph, insertFunc, null, xOffset, yOffset);
    ds.isGridEnabled = function () {
      return this.graph.graphHandler.guidesEnabled;
    };
  }

  /**
   * Creates an empty DNA strand at the center of the current view
   */
  addBackbone() {
    const pt = this.getDefaultNewCellCoords();
    this.addBackboneAt(pt.x, pt.y);
  }

  /**
   * Creates an empty DNA strand at the given coordinates
   */
  addBackboneAt(x, y) {
    this.graph.getModel().beginUpdate();
    try {
      let glyphInfo;
      if (this.graph.getCurrentRoot().isModuleView()) {
        glyphInfo = new GlyphInfo();
        super.addToGlyphDict(glyphInfo);
      } else {
        glyphInfo = this.getFromGlyphDict(this.graph.getCurrentRoot().getId());
      }
      const circuitContainer = this.graph.insertVertex(this.graph.getDefaultParent(), null, glyphInfo.getFullURI(), x, y, GraphBase.sequenceFeatureGlyphWidth, GraphBase.sequenceFeatureGlyphHeight, GraphBase.circuitContainerStyleName);
      const backbone = this.graph.insertVertex(circuitContainer, null, '', 0, GraphBase.sequenceFeatureGlyphHeight / 2, GraphBase.sequenceFeatureGlyphWidth, 1, GraphBase.backboneStyleName);

      backbone.refreshBackbone(this.graph);

      circuitContainer.setConnectable(false);
      backbone.setConnectable(false);

      // The new circuit should be selected
      this.graph.clearSelection();
      this.graph.setSelectionCell(circuitContainer);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Returns the <div> that this graph displays to
   */
  getGraphDOM() {
    return this.graphContainer;
  }

  /**
   * Deletes the currently selected cell
   */
  async delete() {
    const selectedCells = this.graph.getSelectionCells();
    if (selectedCells == null) {
      return;
    }

    // check for ownership prompt
    let containers = new Set<string>();
    if (this.graph.getCurrentRoot()) {
      let ownershipPrompt = false;
      for (let cell of selectedCells) {
        if (cell.isSequenceFeatureGlyph()) {
          ownershipPrompt = true;
          containers.add(cell.getParent().getValue());
        }
      }
      for (let container of Array.from(containers.values())) {
        let glyphInfo;
        if (this.graph.getCurrentRoot().isComponentView()) {
          glyphInfo = this.getFromGlyphDict(this.graph.getCurrentRoot().getId());
        } else {
          glyphInfo = this.getFromGlyphDict(container);
        }
        if (ownershipPrompt && glyphInfo.uriPrefix != GlyphInfo.baseURI && !await this.promptMakeEditableCopy(glyphInfo.displayID)) {
          return;
        }
      }
    }

    this.graph.getModel().beginUpdate();
    try {
      let circuitContainers = [];
      for (let cell of selectedCells) {
        if (cell.isSequenceFeatureGlyph())
          circuitContainers.push(cell.getParent());
      }

      // If we are not at the top level, we need to check
      // for a corner case where we can't allow the backbone
      // to be deleted
      if (this.graph.getCurrentRoot() != null && this.graph.getCurrentRoot().isComponentView()) {
        let newSelection = [];
        for (let cell of selectedCells) {
          // Anything other than the backbone gets added to
          // the revised selection
          if (!(cell.isBackbone() || cell.isCircuitContainer())) {
            newSelection.push(cell);
          }
        }
        this.graph.setSelectionCells(newSelection);
      }

      this.editor.execute('delete');

      this.trimUnreferencedCells();

      for (let container of Array.from(containers)) {
        this.changeOwnership(container);
      }

      for (let cell of circuitContainers) {
        cell.refreshCircuitContainer(this.graph);
      }
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Undoes the most recent changes
   */
  undo() {
    // (un/re)doing is managed by the editor; it only works
    // if all changes are encapsulated by graphModel.(begin/end)Update
    this.editor.execute('undo');

    //console.log(this.editor.undoManager);

    // If the undo caused scars to become visible, we should update
    this.showingScars = this.getScarsVisible();

    // refresh to update cell labels
    if (this.graph.getCurrentRoot()) {
      this.graph.refresh(this.graph.getCurrentRoot());
    }

    // selections after an undo break things if annother undo/redo happens
    this.filterSelectionCells();
  }

  /**
   * Redoes the most recent changes
   */
  redo() {
    //console.log(this.editor.undoManager);

    this.editor.execute('redo');

    // If the undo caused scars to become visible, we should update
    this.showingScars = this.getScarsVisible();

    // refresh to update cell labels
    if (this.graph.getCurrentRoot()) {
      this.graph.refresh(this.graph.getCurrentRoot());
    }

    // selections after an undo break things if annother undo/redo happens
    this.filterSelectionCells();
  }

  /**
   * Only the currently viewable layer should be allowed to have selections
   */
  private filterSelectionCells() {
    const selectionCells = this.graph.getSelectionCells();
    const newSelectionCells = [];
    for (let i = 0; i < selectionCells.length; i++) {
      if (selectionCells[i].getParent() && selectionCells[i].getParent().getParent() === this.viewStack[this.viewStack.length - 1]) {
        newSelectionCells.push(selectionCells[i]);
      }
    }
    this.graph.setSelectionCells(newSelectionCells);
  }

  zoomIn() {
    this.graph.zoomIn();
  }

  zoomOut() {
    this.graph.zoomOut();
  }

  setZoom(scale: number) {
    this.graph.zoomTo(scale);
  }

  getZoom(): number {
    return this.graph.getView().getScale();
  }

  sendSelectionToFront() {
    this.graph.orderCells(false)
  }

  sendSelectionToBack() {
    this.graph.orderCells(true)
  }

  fitCamera() {
    // graph.fit() does most of the work. however by default it will zoom in far too much.
    // Instead, it makes sense to stay at the user's zoom level unless it is too small to
    // contain everything.
    let currentScale = this.graph.getView().getScale();
    this.graph.maxFitScale = currentScale;
    this.graph.fit();

    // if the user had it widely zoomed out, however, stupidly graph.fit()
    // doesn't center the view on cells. It puts them in the top left.
    this.graph.center();
  }

  /**
   * Returns true if there is at least 1 circuit container on the current
   * view
   */
  atLeastOneCircuitContainerInGraph() {
    let allGraphCells = this.graph.getDefaultParent().children;
    if (allGraphCells != null) {
      for (let i = 0; i < allGraphCells.length; i++) {
        if (allGraphCells[i].isCircuitContainer()) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Turns the given element into a dragsource for creating
   * sequenceFeatureGlyphs of the type specified by 'stylename.'
   */
  makeSequenceFeatureDragsource(element, stylename) {
    const insertGlyph = mx.mxUtils.bind(this, function (graph, evt, target, x, y) {
      this.addSequenceFeatureAt(stylename, x - GraphBase.sequenceFeatureGlyphWidth / 2, y - GraphBase.sequenceFeatureGlyphHeight / 2);
    });
    this.makeGeneralDragsource(element, insertGlyph);
  }

  /**
   * Adds a sequenceFeatureGlyph.
   * The new glyph's location is based off the user's selection.
   */
  addSequenceFeature(name) {
    this.graph.getModel().beginUpdate();
    try {
      if (!this.atLeastOneCircuitContainerInGraph()) {
        // if there is no strand, quietly make one
        // stupid user
        this.addBackbone();
        // this changes the selection, so the rest of this method works fine
      }

      // let the graph choose an arbitrary cell from the selection,
      // we'll pretend it's the only one selected
      const selection = this.graph.getSelectionCell();

      // if selection is nonexistent, or is not part of a strand, there is no suitable place.
      if (!selection || !(selection.isSequenceFeatureGlyph() || selection.isCircuitContainer())) {
        return;
      }

      const circuitContainer = selection.isCircuitContainer() ? selection : selection.getParent();

      // use y coord of the strand
      let y = circuitContainer.getGeometry().y;

      // x depends on the exact selection
      let x;
      if (selection.isCircuitContainer()) {
        x = selection.getGeometry().x + selection.getGeometry().width;
      } else {
        x = circuitContainer.getGeometry().x + selection.getGeometry().x + 1;
      }

      // Add it
      this.addSequenceFeatureAt(name, x, y, circuitContainer);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Adds a sequenceFeatureGlyph.
   *
   * circuitContainer (optional) specifies the strand to add to.
   * If not specified, it is inferred by x,y.
   *
   * x,y are also used to determine where on the strand the new
   * glyph is added (first, second, etc)
   */
  async addSequenceFeatureAt(name, x, y, circuitContainer?) {

    // ownership change check
    if (this.graph.getCurrentRoot()) {
      let glyphInfo;
      if (this.graph.getCurrentRoot().isComponentView()) {
        // normal case
        glyphInfo = this.getFromGlyphDict(this.graph.getCurrentRoot().getId());
      } else if (this.atLeastOneCircuitContainerInGraph()) {
        // edge case that we're adding to a container in a module view
        if (!circuitContainer) {
          circuitContainer = this.getClosestCircuitContainerToPoint(x, y);
        }
        glyphInfo = this.getFromGlyphDict(circuitContainer.getValue());
      }
      if (glyphInfo && glyphInfo.uriPrefix != GlyphInfo.baseURI && !await this.promptMakeEditableCopy(glyphInfo.displayID)) {
        return;
      }
    }

    this.graph.getModel().beginUpdate();
    try {
      // Make sure scars are/become visible if we're adding one
      if (name.includes(GraphBase.scarStyleName) && !this.showingScars) {
        this.toggleScars();
      }

      if (!this.atLeastOneCircuitContainerInGraph()) {
        // if there is no strand, quietly make one
        this.addBackboneAt(x, y);
      }

      if (!circuitContainer) {
        circuitContainer = this.getClosestCircuitContainerToPoint(x, y);
      }

      // transform coords to be relative to parent
      x = x - circuitContainer.getGeometry().x;
      y = y - circuitContainer.getGeometry().y;

      // create the glyph info and add it to the dictionary
      const glyphInfo = new GlyphInfo();
      glyphInfo.partRole = name;
      this.addToGlyphDict(glyphInfo);

      // Insert new glyph and its components
      const sequenceFeatureCell = this.graph.insertVertex(circuitContainer, null, glyphInfo.getFullURI(), x, y, GraphBase.sequenceFeatureGlyphWidth, GraphBase.sequenceFeatureGlyphHeight, GraphBase.sequenceFeatureGlyphBaseStyleName + name);

      // construct the view cell for it's children
      const cell1 = this.graph.getModel().getCell(1);
      const childViewCell = this.graph.insertVertex(cell1, glyphInfo.getFullURI(), '', 0, 0, 0, 0, GraphBase.componentViewCellStyleName);

      // add the backbone to the child view cell
      const childCircuitContainer = this.graph.insertVertex(childViewCell, null, glyphInfo.getFullURI(), 0, 0, 0, 0, GraphBase.circuitContainerStyleName);
      const childCircuitContainerBackbone = this.graph.insertVertex(childCircuitContainer, null, '', 0, 0, 0, 0, GraphBase.backboneStyleName);

      childCircuitContainerBackbone.setConnectable(false);
      childCircuitContainer.setConnectable(false);
      sequenceFeatureCell.setConnectable(true);

      // Sorts the new SequenceFeature into the correct position in parent's array
      this.horizontalSortBasedOnPosition(circuitContainer);

      // The new glyph should be selected
      this.graph.clearSelection();
      this.graph.setSelectionCell(sequenceFeatureCell);

      // perform the ownership change
      if (this.graph.getCurrentRoot()) {
        let glyphInfo;
        if (this.graph.getCurrentRoot().isComponentView()) {
          // normal case
          glyphInfo = this.getFromGlyphDict(this.graph.getCurrentRoot().getId());
        } else {
          // edge case that we're adding to a container in a module view
          glyphInfo = this.getFromGlyphDict(circuitContainer.getValue());
        }
        if (glyphInfo.uriPrefix != GlyphInfo.baseURI) {
          this.changeOwnership(glyphInfo.getFullURI());
        }
      }
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Returns the circuitContainer that is closest to the given point.
   *
   * Considers only the canvas's current "drill level," ie, circuitContainers
   * inside of SequenceFeatureGlyphs aren't considered.
   */
  getClosestCircuitContainerToPoint(x, y) {
    if (!this.graph.getDefaultParent().children)
      return null;

    let candidates = this.graph.getDefaultParent().children.filter(cell => cell.isCircuitContainer());

    if (candidates.length === 0) {
      return null;
    }

    let bestC;
    let bestDistance;

    for (let c of candidates) {
      const g = c.getGeometry();

      let xDist;
      if (x < g.x) {
        xDist = g.x - x;
      } else if (x > g.x + g.width) {
        xDist = x - (g.x + g.width);
      } else {
        xDist = 0;
      }

      let yDist;
      if (y < g.y) {
        yDist = g.y - y;
      } else if (y > g.y + g.height) {
        yDist = y - (g.y + g.height);
      } else {
        yDist = 0;
      }

      const dist = Math.sqrt(xDist * xDist + yDist * yDist);
      if (!bestC || dist < bestDistance) {
        bestC = c;
        bestDistance = dist;
      }
    }

    return bestC;
  }

  /**
   * Turns the given element into a dragsource for creating molecular species glyphs
   */
  makeMolecularSpeciesDragsource(element, stylename) {
    const insertGlyph = mx.mxUtils.bind(this, function (graph, evt, target, x, y) {
      this.addMolecularSpeciesAt(stylename, x - GraphBase.molecularSpeciesGlyphWidth / 2, y - GraphBase.molecularSpeciesGlyphHeight / 2);
    });
    this.makeGeneralDragsource(element, insertGlyph);
  }

  /**
   * Creates a molecular species glyph of the given type at the center of the current view
   */
  addMolecularSpecies(name) {
    const pt = this.getDefaultNewCellCoords();
    this.addMolecularSpeciesAt(name, pt.x, pt.y);
  }

  /**
   * Creates a molecular species glyph of the given type at the given location
   */
  addMolecularSpeciesAt(name, x, y) {
    this.graph.getModel().beginUpdate();
    try {

      //TODO partRoles for proteins
      let proteinInfo = new GlyphInfo();
      switch (name) {
        case "dsNA":
          proteinInfo.partType = "DNA molecule";
          break;
        case "macromolecule":
          proteinInfo.partType = "Protein";
          break;
        case "NGA (No Glyph Assigned Molecular Species)":
          proteinInfo.partType = "Protein";
          break;
        case "small-molecule":
          proteinInfo.partType = "Small molecule";
          break;
        case "ssNA":
          proteinInfo.partType = "RNA molecule";
          break;
        case "replacement-glyph":
          proteinInfo.partType = "All_types";
          break;
        default:
          proteinInfo.partType = "Protein";
      }
      this.addToGlyphDict(proteinInfo);

      const molecularSpeciesGlyph = this.graph.insertVertex(this.graph.getDefaultParent(), null, proteinInfo.getFullURI(), x, y,
        GraphBase.molecularSpeciesGlyphWidth, GraphBase.molecularSpeciesGlyphHeight, GraphBase.molecularSpeciesGlyphBaseStyleName + name);
      molecularSpeciesGlyph.setConnectable(true);

      // The new glyph should be selected
      this.graph.clearSelection();
      this.graph.setSelectionCell(molecularSpeciesGlyph);
    } finally {
      this.graph.getModel().endUpdate();
    }

    console.log(this.graph.getModel().cells);
  }

  /**
   * Turns the given HTML element into a dragsource for creating interaction glyphs
   */
  makeInteractionDragsource(element, stylename) {
    const insertGlyph = mx.mxUtils.bind(this, function (graph, evt, target, x, y) {
      this.addInteractionAt(stylename, x - GraphBase.defaultInteractionSize / 2, y - GraphBase.defaultInteractionSize / 2);
    });
    this.makeGeneralDragsource(element, insertGlyph);
  }

  /**
   * Creates an interaction edge of the given type at the center of the current view
   */
  addInteraction(name) {
    let selectedCell = this.graph.getSelectionCell();
    const selectionCells = this.graph.getSelectionCells();
    if (selectionCells.length == 1 || selectionCells.length == 2) {
      if (selectionCells.length == 2) {
        selectedCell = selectionCells[0];
      }
      const selectedParent = selectedCell.getParent();
      if (!selectedParent.geometry) {
        this.addInteractionAt(name, selectedCell.geometry.x + (selectedCell.geometry.width / 2),
          selectedCell.geometry.y);
      } else {
        this.addInteractionAt(name, selectedParent.geometry.x + selectedCell.geometry.x + (selectedCell.geometry.width / 2),
          selectedParent.geometry.y);
      }
    } else {
      const pt = this.getDefaultNewCellCoords();
      this.addInteractionAt(name, pt.x, pt.y);
    }
  }

  /**
   * Creates an interaction edge of the given type at the given coordiantes
   * @param name The name identifying the type of interaction this should be.
   * @param x The x coordinate that the interaction should appear at
   * @param y The y coordinate that the interaction should appear at
   */
  addInteractionAt(name: string, x, y) {
    let cell;

    this.graph.getModel().beginUpdate();
    try {
      cell = new mx.mxCell(new InteractionInfo(), new mx.mxGeometry(x, y, 0, 0), GraphBase.interactionGlyphBaseStyleName + name);

      const selectionCells = this.graph.getSelectionCells();
      if (selectionCells.length == 1) {
        const selectedCell = this.graph.getSelectionCell();
        cell.geometry.setTerminalPoint(new mx.mxPoint(x, y - GraphBase.defaultInteractionSize), false);
        cell.edge = true;
        this.graph.addEdge(cell, null, selectedCell, null);
      } else if (selectionCells.length == 2) {
        const sourceCell = selectionCells[0];
        const destCell = selectionCells[1];
        cell.edge = true;
        this.graph.addEdge(cell, null, sourceCell, destCell);
      } else {
        cell.geometry.setTerminalPoint(new mx.mxPoint(x, y + GraphBase.defaultInteractionSize), true);
        cell.geometry.setTerminalPoint(new mx.mxPoint(x + GraphBase.defaultInteractionSize, y), false);
        cell.edge = true;
        this.graph.addEdge(cell, null, null, null);
      }


      // Default name for a process interaction
      if (name == "Process") {
        name = "Genetic Production"
      }
      //cell.data = new InteractionInfo();
      cell.value.interactionType = name;

      // The new glyph should be selected
      this.graph.clearSelection();
      this.graph.setSelectionCell(cell);
    } finally {
      this.graph.getModel().endUpdate();
    }

    return cell;
  }


  /**
   * Changes the selected sequence feature's style based on the one selected in the info menu.
   */
  private mutateSequenceFeatureGlyph(name: string);
  private mutateSequenceFeatureGlyph(name: string, cells: mxCell);
  private mutateSequenceFeatureGlyph(name: string, cells: mxCell, graph: mxGraph);
  private mutateSequenceFeatureGlyph(name: string, cells?: mxCell, graph?: mxGraph) {
    if (!graph) {
      graph = this.graph;
    }
    if (!cells) {
      const selectionCells = this.graph.getSelectionCells();
      if (selectionCells.length > 0) {
        this.mutateSequenceFeatureGlyph(name, selectionCells);
      }
      return;
    }
    try {
      graph.getModel().beginUpdate();
      // make sure the glyph style matches the partRole
      let newStyleName = GraphBase.sequenceFeatureGlyphBaseStyleName + name;

      // if there's no style for the partRole, use noGlyphAssigned
      let cellStyle = graph.getStylesheet().getCellStyle(newStyleName);
      // if there is no registered style for the newStyleName, getCellStyle returns an empty object.
      // all of our registered styles have several fields, use fillcolor as an example to check
      if (!cellStyle.fillColor)
        newStyleName = GraphBase.sequenceFeatureGlyphBaseStyleName + GraphBase.noGlyphAssignedName;

      cells.forEach(function (cell) {
        if (cell.isSequenceFeatureGlyph()) {
          // Modify the style string
          let styleString = cell.style.slice();
          if (!styleString.includes(';')) {
            // nothing special needed, the original style only had the glyphStyleName
            styleString = newStyleName;
          } else {
            // the string is something like "strokecolor=#000000;glyphStyleName;fillcolor=#ffffff;etc;etc;"
            // we only want to replace the 'glyphStyleName' bit
            let startIdx = styleString.indexOf(GraphBase.sequenceFeatureGlyphBaseStyleName);
            let endIdx = styleString.indexOf(';', startIdx);
            let stringToReplace = styleString.slice(startIdx, endIdx - startIdx);
            styleString = styleString.replace(stringToReplace, newStyleName);
          }

          graph.getModel().setStyle(cell, styleString);
        }
      });
    } finally {
      graph.getModel().endUpdate();
    }
  }

  /**
   * Changes the selected interaction's style based on the
   * one selected in the info menu
   * @param name
   */
  mutateInteractionGlyph(name: string) {
    const selectionCells = this.graph.getSelectionCells();

    if (selectionCells.length == 1 && selectionCells[0].isInteraction()) {
      let selectedCell = selectionCells[0];

      this.graph.getModel().beginUpdate();
      try {

        if (name == "Biochemical Reaction" || name == "Non-Covalent Binding" || name == "Genetic Production") {
          name = "Process";
        }
        name = GraphBase.interactionGlyphBaseStyleName + name;

        // Modify the style string
        let styleString = selectedCell.style.slice();
        if (!styleString.includes(';')) {
          // nothing special needed, the original style only had the glyphStyleName
          styleString = name;
        } else {
          // the string is something like "strokecolor=#000000;interactionStyleName;fillcolor=#ffffff;etc;etc;"
          // we only want to replace the 'glyphStyleName' bit
          let startIdx = styleString.indexOf(GraphBase.interactionGlyphBaseStyleName);
          let endIdx = styleString.indexOf(';', startIdx);
          let stringToReplace = styleString.slice(startIdx, endIdx - startIdx);
          styleString = styleString.replace(stringToReplace, name);
        }

        console.debug("changing interaction style to: " + styleString);

        this.graph.getModel().setStyle(selectedCell, styleString);
      } finally {
        this.graph.getModel().endUpdate();
      }
    }
  }

  /**
   * Returns an mxPoint specifying coordinates suitable for a new cell
   */
  getDefaultNewCellCoords() {
    const s = this.graph.getView().getScale();
    const t = this.graph.getView().getTranslate();
    const c = this.graph.container;
    let newX = (c.scrollLeft + c.clientWidth / 2) / s - t.x;
    let newY = (c.scrollTop + c.clientHeight / 2) / s - t.y;

    const model = this.graph.getModel();
    const topLevelCells = model.getChildren(this.graph.getDefaultParent());
    while (true) {
      // find cell(s) that match the chosen spot...
      const centeredCells = model.filterCells(topLevelCells, function (cell) {
        return cell.getGeometry().x === newX && cell.getGeometry().y === newY;
      });
      // break if there are none
      if (!centeredCells || centeredCells.length === 0)
        break;

      // otherwise bump down the chosen spot and repeat
      newX += 20;
      newY += 20;
    }

    return new mx.mxPoint(newX, newY);
  }

  /**
   * Turns the given HTML element into a dragsource for creating textboxes
   */
  makeTextboxDragsource(element) {
    const insert = mx.mxUtils.bind(this, function (graph, evt, target, x, y) {
      this.addTextBoxAt(x - GraphBase.defaultTextWidth / 2, y - GraphBase.defaultTextHeight / 2);
    });
    this.makeGeneralDragsource(element, insert);
  }

  /**
   * Creates a textbox at the center of the current view
   */
  addTextBox() {
    const pt = this.getDefaultNewCellCoords();
    this.addTextBoxAt(pt.x, pt.y);
  }

  /**
   * Creates a textbox at the given location
   */
  addTextBoxAt(x, y) {
    this.graph.getModel().beginUpdate();
    try {
      const cell = this.graph.insertVertex(this.graph.getDefaultParent(), null, 'Sample Text', x, y, GraphBase.defaultTextWidth, GraphBase.defaultTextHeight, GraphBase.textboxStyleName);
      cell.setConnectable(false);

      // The new cell should be selected
      this.graph.clearSelection();
      this.graph.setSelectionCell(cell);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Find the selected cell, and if there is a glyph selected, update its metadata.
   */
  setSelectedCellInfo(glyphInfo: GlyphInfo);
  setSelectedCellInfo(interactionInfo: InteractionInfo);
  async setSelectedCellInfo(info: any) {
    const selectedCell = this.graph.getSelectionCell();
    if (!selectedCell) {
      return;
    }

    // verify that the selected cell matches the type of info object
    if (info instanceof GlyphInfo && (selectedCell.isSequenceFeatureGlyph() || selectedCell.isCircuitContainer() || selectedCell.isMolecularSpeciesGlyph()) ||
      (info instanceof InteractionInfo && selectedCell.isInteraction())) {

      // since it does, update its info
      this.graph.getModel().beginUpdate();
      try {
        if (info instanceof GlyphInfo) {

          let oldGlyphURI = "";
          oldGlyphURI = selectedCell.value;
          info.uriPrefix = GlyphInfo.baseURI;
          let newGlyphURI = info.getFullURI();

          // check for ownership prompt
          let oldGlyphInfo = this.getFromGlyphDict(oldGlyphURI);
          if (oldGlyphInfo.uriPrefix != GlyphInfo.baseURI && !await this.promptMakeEditableCopy(oldGlyphInfo.displayID)) {
            return;
          }

          if (oldGlyphURI != newGlyphURI) {
            if (this.checkCycleUp(selectedCell, newGlyphURI)) {
              // Tell the user a cycle isn't allowed
              this.dialog.open(ErrorComponent, { data: "ComponentInstance objects MUST NOT form circular reference chains via their definition properties and parent ComponentDefinition objects." });
              return;
            }

            const coupledCells = this.getCoupledCells(oldGlyphURI);
            if (coupledCells.length > 1) {
              this.promptDeCouple(selectedCell, coupledCells, info, newGlyphURI, oldGlyphURI);
              return;
            }

            const conflictViewCell = this.graph.getModel().getCell(newGlyphURI);
            if (conflictViewCell != null) {
              this.promptCouple(conflictViewCell, [selectedCell], info, newGlyphURI, oldGlyphURI);
              return;
            }

            // update the glyphDictionary
            this.removeFromGlyphDict(oldGlyphURI);
            this.addToGlyphDict(info);

            if (selectedCell.isCircuitContainer()) {
              if (this.graph.getCurrentRoot().isComponentView()) {
                // default case (we're zoomed into a component view)
                const glyphZoomed = this.selectionStack[this.selectionStack.length - 1];
                this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));

                // default case
                // update the viewcell ID
                const viewCell = this.graph.getModel().getCell(oldGlyphURI);
                this.updateViewCell(viewCell, newGlyphURI);

                // update the selected cell id
                this.graph.getModel().setValue(glyphZoomed, newGlyphURI);

                this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), glyphZoomed, this));
              } else {
                // edge case (we're in a module view, and there is no view cell to update)
                this.graph.getModel().setValue(selectedCell, newGlyphURI);
              }
            } else {
              // default case
              // update the viewcell ID
              const viewCell = this.graph.getModel().getCell(oldGlyphURI);
              this.updateViewCell(viewCell, newGlyphURI);

              // update the selected cell id
              this.graph.getModel().setValue(selectedCell, newGlyphURI);
            }

            // update the ownership
            if (selectedCell.isCircuitContainer()) {
              this.changeOwnership(newGlyphURI, true)
            } else {
              this.changeOwnership(selectedCell.getValue(), true);
            }

            // update the view
            this.updateAngularMetadata(this.graph.getSelectionCells());
            return;
          }

          //let glyphEdit = new GraphService.glyphEdit(info);
          this.updateGlyphDict(info);

          // there may be coupled cells that need to also be mutated
          // the glyphInfo may be different than info, so use getFromGlyphDict
          this.mutateSequenceFeatureGlyph(this.getFromGlyphDict(selectedCell.value).partRole, this.getCoupledCells(selectedCell.value));

          // change the ownership
          this.changeOwnership(selectedCell.getValue());

          // update the view
          this.updateAngularMetadata(this.graph.getSelectionCells());

        } else {
          let interactionEdit = new GraphEdits.interactionEdit(selectedCell, info);
          this.mutateInteractionGlyph(info.interactionType);
          this.graph.getModel().execute(interactionEdit);
        }
      } finally {
        this.graph.getModel().endUpdate();
        this.graph.refresh(selectedCell);
        this.updateAngularMetadata(this.graph.getSelectionCells());
      }
    }
  }

  private promptCouple(conflictViewCell: mxCell, selectedCells: mxCell[], info: GlyphInfo, newGlyphURI: string, oldGlyphURI: string) {
    // start a new begin so that when the dialog closes, all changes are in one edit
    this.graph.getModel().beginUpdate();

    // a cell with this display ID already exists prompt user if they want to couple them
    const confirmRef = this.dialog.open(ConfirmComponent, { data: { message: "A component with this URI already exists. Would you like to couple them and keep the current substructure, or update it?", options: ["Keep", "Update", "Cancel"] } });
    confirmRef.afterClosed().subscribe(result => {
      try {
        if (result === "Keep") {

          if (this.checkCycleDown(selectedCells[0], newGlyphURI)) {
            // Tell the user a cycle isn't allowed
            this.dialog.open(ErrorComponent, { data: "ComponentInstance objects MUST NOT form circular reference chains via their definition properties and parent ComponentDefinition objects." });
            return;
          }

          // update the glyphDict
          this.removeFromGlyphDict(oldGlyphURI);
          this.removeFromGlyphDict(newGlyphURI);
          this.addToGlyphDict(info);

          // update the viewCell id
          const viewCell = this.graph.getModel().getCell(oldGlyphURI);


          // update the display of the selectioncell
          if (selectedCells.length == 1 && selectedCells[0].isCircuitContainer()) {
            const glyphZoomed = this.selectionStack[this.selectionStack.length - 1];
            // zoom out before making changes
            this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));

            // remove the found viewCell and replace it with this one
            this.removeViewCell(conflictViewCell);

            // change the glyphURI associated with the glyph
            this.graph.getModel().setValue(glyphZoomed, newGlyphURI);

            // update the viewCell's id
            this.updateViewCell(viewCell, newGlyphURI);

            // rezoom after the ID has been changed
            this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), glyphZoomed, this));
          } else {
            // remove the found viewCell and replace it with this one
            this.removeViewCell(conflictViewCell);

            // update the viewCell's id
            this.updateViewCell(viewCell, newGlyphURI);

            // change the glyphURI assicated with the glyphs
            const graph = this.graph;
            selectedCells.forEach(function (cell) {
              graph.getModel().setValue(cell, newGlyphURI);
            });
          }

          // update the conflicting cells graphics
          this.mutateSequenceFeatureGlyph(info.partRole, this.getCoupledCells(newGlyphURI));
          this.changeOwnership(newGlyphURI, true);
        } else if (result === "Update") {

          // update the selected cells glyphURI
          if (selectedCells.length == 1 && selectedCells[0].isCircuitContainer()) {
            // update the glyphDict
            this.removeFromGlyphDict(oldGlyphURI);

            const glyphZoomed = this.selectionStack[this.selectionStack.length - 1];
            // unzoom and rezoom after the rename
            this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));

            // remove this cells viewCell and update the glyphURI
            const viewCell = this.graph.getModel().getCell(oldGlyphURI);
            this.removeViewCell(viewCell);

            this.graph.getModel().setValue(glyphZoomed, newGlyphURI);
            this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), glyphZoomed, this));
          } else {
            // remove this cells viewCell and update the glyphURI
            const viewCell = this.graph.getModel().getCell(oldGlyphURI);
            this.removeViewCell(viewCell);

            // update the glyphDict
            this.removeFromGlyphDict(oldGlyphURI);

            const graph = this.graph;
            selectedCells.forEach(function (cell) {
              graph.getModel().setValue(cell, newGlyphURI);
            });
          }

          // update the selected cell's graphics
          if (selectedCells.length == 1 && selectedCells[0].isCircuitContainer()) {
            this.mutateSequenceFeatureGlyph(this.getFromGlyphDict(newGlyphURI).partRole, [this.selectionStack[this.selectionStack.length - 1]]);
          } else {
            this.mutateSequenceFeatureGlyph(this.getFromGlyphDict(newGlyphURI).partRole, selectedCells);
          }
          this.changeOwnership(newGlyphURI, true);
        }
      } finally {
        this.graph.getModel().endUpdate();
        // update the view
        this.updateAngularMetadata(this.graph.getSelectionCells());
      }
    });
  }

  private promptDeCouple(selectedCell: mxCell, coupledCells: mxCell[], info: GlyphInfo, newGlyphURI: string, oldGlyphURI: string) {
    // start a new begin so that when the dialog closes, all changes are in one edit
    this.graph.getModel().beginUpdate();
    // prompt the user if they want to keep the cells coupled
    const confirmRef = this.dialog.open(ConfirmComponent, { data: { message: "Other components are coupled with this one. Would you like to keep them coupled?", options: ["Yes", "No", "Cancel"] } });
    confirmRef.afterClosed().subscribe(result => {
      if (result === "Yes") {
        // update the glyph dict
        this.removeFromGlyphDict(oldGlyphURI);
        this.addToGlyphDict(info);

        // update viewCell id
        const viewCell = this.graph.getModel().getCell(oldGlyphURI);
        // if the current selectedcell is a circuit container we need to unzoom and rezoom
        if (selectedCell.isCircuitContainer()) {
          const zoomedCell = this.selectionStack[this.selectionStack.length - 1];
          this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));
          this.updateViewCell(viewCell, newGlyphURI);

          // update the glyphURI of the other cells
          // this.graph can't be used in the foreach apparently
          const graph = this.graph;
          coupledCells.forEach(function (cell) {
            graph.getModel().setValue(cell, newGlyphURI);
          });

          this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), zoomedCell, this));
        } else {
          this.updateViewCell(viewCell, newGlyphURI);

          // update the glyphURI of the other cells
          // this.graph can't be used in the foreach apparently
          const graph = this.graph;
          coupledCells.forEach(function (cell) {
            graph.getModel().setValue(cell, newGlyphURI);
          });

        }

        this.mutateSequenceFeatureGlyph(info.partRole, coupledCells, this.graph);
        this.changeOwnership(newGlyphURI, true);
      } else if (result === "No") {
        // don't use update, as it will remove the old one
        this.addToGlyphDict(info);

        // copy viewCell
        const viewCell = this.graph.getModel().getCell(oldGlyphURI);
        const viewCellClone = this.graph.getModel().cloneCell(viewCell);

        // update the clones id
        this.updateViewCell(viewCellClone, newGlyphURI);

        if (selectedCell.isCircuitContainer()) {
          const glyphZoomed = this.selectionStack[this.selectionStack.length - 1];
          this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));
          this.graph.getModel().setValue(glyphZoomed, newGlyphURI);
          this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), glyphZoomed, this));
        } else {
          // update the selected cell's glyphURI
          this.graph.getModel().setValue(selectedCell, newGlyphURI);
        }
        this.mutateSequenceFeatureGlyph(info.partRole);
        this.changeOwnership(newGlyphURI, true);
      }
      this.graph.getModel().endUpdate();
      // update the view
      this.updateAngularMetadata(this.graph.getSelectionCells());
    });
  }

  /**
   * 
   */
  private async promptMakeEditableCopy(partName: string): Promise<boolean> {
    const confirmRef = this.dialog.open(ConfirmComponent, { data: { message: "The part '" + partName + "' is not owned by you and cannot be edited.\n Do you want to create an editable copy of this part and save your changes?", options: ["OK", "Cancel"] } });
    let result = await confirmRef.afterClosed().toPromise();
    return result === "OK";
  }

  /**
   * Goes through all the cells (starting at the root) and removes any cells that can't be reached.
   */
  private trimUnreferencedCells() {
    let reached = new Set<string>();
    let toExpand = new Set<string>();

    // get the main root of what we can see
    let root = this.graph.getCurrentRoot();
    let coupledCells = this.getCoupledCells(root.getId());
    while (coupledCells.length > 0) {
      root = coupledCells[0].getParent().getParent();
      coupledCells = this.getCoupledCells(root.getId());
    }
    toExpand.add(root.getId());

    // populate the reached set
    while (toExpand.size > 0) {
      let viewID = toExpand.values().next().value;
      let viewCell = this.graph.getModel().getCell(viewID);
      toExpand.delete(viewID);
      reached.add(viewCell.getId());

      // get the children of the viewCell
      let viewChildren = this.graph.getModel().getChildren(viewCell);
      for (let child of viewChildren) {
        // If the child isn't a circuit container, it can't lead to another viewCell
        if (!child.isCircuitContainer())
          continue;
        let glyphs = this.graph.getModel().getChildren(child);
        for (let glyph of glyphs) {
          if (!glyph.isSequenceFeatureGlyph() || reached.has(glyph.value))
            continue;
          toExpand.add(glyph.value);
        }
      }
    }

    let toRemove = [];
    for (let key in this.graph.getModel().cells) {
      const cell = this.graph.getModel().cells[key];
      if (!cell.isViewCell())
        continue;
      if (!reached.has(cell.getId())) {
        toRemove.push(cell);
      }
    }

    for (let cell of toRemove) {
      this.graph.getModel().remove(cell);
    }

  }

  private getCoupledCells(glyphURI: string): mxCell[] {
    const coupledCells = [];
    for (let key in this.graph.getModel().cells) {
      const cell = this.graph.getModel().cells[key];
      if (cell.value === glyphURI && cell.isSequenceFeatureGlyph()) {
        coupledCells.push(cell);
      }
    }
    return coupledCells;
  }

  /**
   * Updates the id of the view cell. Also updates the circuit container value if it's a component view cell
   * @param cell 
   * @param newGlyphURI 
   */
  private updateViewCell(cell: mxCell, newGlyphURI: string) {
    // update the circuit container value if the view is a component view
    if (cell.isComponentView()) {
      let circuitContainer = cell.children.filter(cell => cell.isCircuitContainer())[0];
      this.graph.getModel().setValue(circuitContainer, newGlyphURI);
    }
    const newViewCell = this.graph.getModel().cloneCell(cell);
    this.graph.getModel().remove(cell);
    // clone it because the previous remove will keep the id change if we don't
    newViewCell.id = newGlyphURI;
    this.graph.getModel().add(this.graph.getModel().getCell(1), newViewCell);
  }

  private removeViewCell(viewCell: mxCell) {
    // remove the cell
    this.graph.getModel().remove(viewCell);

    // check if any of the children's viewcells have other parents
    let viewChildren = viewCell.children[0].children;
    for (let i = 0; i < viewChildren.length; i++) {
      if (viewChildren[i].isSequenceFeatureGlyph()) {
        let otherRefs = [];
        for (let key in this.graph.getModel().cells) {
          const cell = this.graph.getModel().cells[key];
          if (cell.value === viewChildren[i].value) {
            otherRefs.push(cell);
          }
        }
        if (otherRefs.length == 0) {
          this.removeViewCell(this.graph.getModel().getCell(viewChildren[i].value));
        }
      }
    }
  }

  /**
   * URI's must not form a circular reference. This method checks for any cycles 
   * that would be created if the cell's parents have the same glyphURI that's passed in.
   * @param cell The cell to check upward from.
   * @param glyphURI The URI you would like to set the current cell to.
   */
  private checkCycleUp(cell: mxCell, glyphURI: string) {
    let checked = new Set<string>();
    let toCheck = new Set<string>();
    // check upward
    if (cell.isCircuitContainer() && this.selectionStack.length > 1) {
      toCheck.add(this.selectionStack[this.selectionStack.length - 1].getParent().getParent().getId());
    } else {
      toCheck.add(cell.getParent().getParent().getId());
    }
    while (toCheck.size > 0) {
      let checking: string = toCheck.values().next().value;
      checked.add(checking);
      toCheck.delete(checking);
      if (checking === glyphURI) {
        return true;
      }
      let toAddCells = [];
      for (let key in this.graph.getModel().cells) {
        const cell = this.graph.getModel().cells[key];
        if (cell.value === checking) {
          toAddCells.push(cell);
        }
      }
      for (let i = 0; i < toAddCells.length; i++) {
        let toAdd = toAddCells[i].getParent().getParent().getId();
        if (toAdd != "rootView" && !checked.has(toAdd)) { // TODO replace with a check if the cell is a module view
          toCheck.add(toAdd);
        }
      }
    }
    return false;
  }

  /**
   * URI's must not form a circular reference. This method checks for any cycles 
   * that would be created if the cell's children have the same glyphURI that's passed in.
   * @param cell The cell to check downward from.
   * @param glyphURI The URI you would like to set the current cell to.
   */
  private checkCycleDown(cell: mxCell, glyphURI: string) {
    let checked = new Set<string>();
    let toCheck = new Set<string>();
    // check downward
    if (cell.isCircuitContainer()) {
      for (let i = 0; i < cell.children.length; i++) {
        if (cell.children[i].isSequenceFeatureGlyph()) {
          toCheck.add(cell.children[i].value);
        }
      }
    } else {
      let viewCell = this.graph.getModel().getCell(cell.value);
      let viewChildren = viewCell.children[0].children;
      for (let i = 0; i < viewChildren.length; i++) {
        if (viewChildren[i].isSequenceFeatureGlyph()) {
          toCheck.add(viewChildren[i].value);
        }
      }
    }

    while (toCheck.size > 0) {
      let checking: string = toCheck.values().next().value;
      checked.add(checking);
      toCheck.delete(checking);
      if (checking === glyphURI) {
        return true;
      }

      let viewCell = this.graph.getModel().getCell(checking);
      let viewChildren = viewCell.children[0].children;
      for (let i = 0; i < viewChildren.length; i++) {
        if (viewChildren[i].isSequenceFeatureGlyph() && !checked.has(viewChildren[i].value)) {
          toCheck.add(viewChildren[i].value);
        }
      }
    }

    return false;
  }

  /**
   * Changes the uriPrefix of the passed in cell's glyph info, and any of it's parents.
   * @param cell The cell to change ownership for.
   * @param fullCheck Stops at currently owned objects if false, continues until the root if true.
   */
  private changeOwnership(glyphURI: string, fullCheck: boolean = false) {

    this.graph.getModel().beginUpdate();
    try {
      let glyphInfo = this.getFromGlyphDict(glyphURI);

      // if we already own it, we don't need to do anything
      if (!glyphInfo.uriPrefix || (glyphInfo.uriPrefix === GlyphInfo.baseURI && !fullCheck)) {
        return;
      }

      // parent propogation
      let toCheck = new Set<string>();
      let checked = new Set<string>();

      toCheck.add(glyphURI);

      // zoom out because the current view cell may be deleted and re added with a different URI
      // more than the direct parent's view cell may have been changed, so it's easiest to zoom all the way out (trust me, It had problems when it wasn't zooming out)
      let zoomedCells = this.selectionStack.slice();
      for (let i = 0; i < zoomedCells.length; i++) {
        this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));
      }

      // zoom out of the rootView TODO come back to me when recursive modules is a thing
      let rootViewId;
      let rootViewInfo;
      if (this.graph.getCurrentRoot()) {
        rootViewId = this.graph.getCurrentRoot().getId();
        rootViewInfo = this.getFromGlyphDict(rootViewId);
        if (rootViewInfo) {
          this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));
        }
      } else {
        // special case of the root getting changed before changeOwnership is called
        rootViewId = glyphURI;
        rootViewInfo = this.getFromGlyphDict(rootViewId);
      }

      while (toCheck.size > 0) {
        let checking: string = toCheck.values().next().value;
        checked.add(checking);
        toCheck.delete(checking);
        if (checking.startsWith(GlyphInfo.baseURI) && !fullCheck) {
          continue;
        }

        // change the glyphInfo's uriPrefix
        let glyphInfo = this.getFromGlyphDict(checking).makeCopy();
        glyphInfo.uriPrefix = GlyphInfo.baseURI;
        this.removeFromGlyphDict(checking);
        this.addToGlyphDict(glyphInfo);

        // update the viewCell
        let viewCell = this.graph.getModel().getCell(checking);
        if (viewCell) {
          this.updateViewCell(viewCell, glyphInfo.getFullURI());
        }

        // update any cells that referenced the viewCell and add their parents to be checked
        for (let key in this.graph.getModel().cells) {
          const cell = this.graph.getModel().cells[key];
          if (cell.value === checking) {
            this.graph.getModel().setValue(cell, glyphInfo.getFullURI());
            if (cell.isSequenceFeatureGlyph()) {
              let toAdd = cell.getParent().getParent();
              if (toAdd.isComponentView() && !checked.has(toAdd.getId())) {
                // normal case
                toCheck.add(toAdd.getId());
              } else if (toAdd.isModuleView() && !checked.has(cell.getParent().getValue())) {
                // edge case, module view, need to check parent circuit container
                toCheck.add(cell.getParent().getValue());
              }
            }
          }
        }
      }

      // zoom back into the rootView
      if (rootViewInfo) {
        rootViewInfo = rootViewInfo.makeCopy();
        rootViewInfo.uriPrefix = GlyphInfo.baseURI;
        let newRootViewCell = this.graph.getModel().getCell(rootViewInfo.getFullURI());
        this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), newRootViewCell, this));
      }
      // re zoom to fix the view
      for (let i = 0; i < zoomedCells.length; i++) {
        this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), zoomedCells[i], this));
      }
    } finally {
      this.graph.getModel().endUpdate();
    }

  }



  exportSVG(filename: string) {
    var background = '#ffffff';
    var scale = 1;
    var border = 1;

    var imgExport = new mx.mxImageExport();
    var bounds = this.graph.getGraphBounds();
    var vs = this.graph.view.scale;

    // Prepares SVG document that holds the output
    var svgDoc = mx.mxUtils.createXmlDocument();
    var root = (svgDoc.createElementNS != null) ?
      svgDoc.createElementNS(mx.mxConstants.NS_SVG, 'svg') : svgDoc.createElement('svg');

    if (background != null) {
      if (root.style != null) {
        root.style.backgroundColor = background;
      } else {
        root.setAttribute('style', 'background-color:' + background);
      }
    }

    if (svgDoc.createElementNS == null) {
      root.setAttribute('xmlns', mx.mxConstants.NS_SVG);
      root.setAttribute('xmlns:xlink', mx.mxConstants.NS_XLINK);
    } else {
      // KNOWN: Ignored in IE9-11, adds namespace for each image element instead. No workaround.
      root.setAttributeNS('http://www.w3.org/2000/xmlns/', 'xmlns:xlink', mx.mxConstants.NS_XLINK);
    }

    root.setAttribute('width', (Math.ceil(bounds.width * scale / vs) + 2 * border) + 'px');
    root.setAttribute('height', (Math.ceil(bounds.height * scale / vs) + 2 * border) + 'px');
    root.setAttribute('version', '1.1');

    // Adds group for anti-aliasing via transform
    var group = (svgDoc.createElementNS != null) ? svgDoc.createElementNS(mx.mxConstants.NS_SVG, 'g') : svgDoc.createElement('g');
    group.setAttribute('transform', 'translate(0.5,0.5)');
    root.appendChild(group);
    svgDoc.appendChild(root);

    // Renders graph. Offset will be multiplied with state's scale when painting state.
    var svgCanvas = new mx.mxSvgCanvas2D(group);
    svgCanvas.translate(Math.floor((border / scale - bounds.x) / vs), Math.floor((border / scale - bounds.y) / vs));
    svgCanvas.scale(scale / vs);

    // Displayed if a viewer does not support foreignObjects (which is needed to HTML output)
    svgCanvas.foAltText = '[Not supported by viewer]';
    imgExport.drawState(this.graph.getView().getState(this.graph.getCurrentRoot()), svgCanvas);

    var xml = encodeURIComponent(mx.mxUtils.getXml(root));
    new mx.mxXmlRequest(environment.backendURL + '/echo', 'filename=' + filename + '.svg&format=svg' + '&xml=' + xml).simulate(document, '_blank');
  }

  exportImage(filename: string, format: string) {
    let bg = '#ffffff';
    let scale = 1;
    let b = 1;

    let imgExport = new mx.mxImageExport();
    let bounds = this.graph.getGraphBounds();
    let vs = this.graph.view.scale;

    let xmlDoc = mx.mxUtils.createXmlDocument();
    let root = xmlDoc.createElement('output');
    xmlDoc.appendChild(root);

    let xmlCanvas = new mx.mxXmlCanvas2D(root);
    xmlCanvas.translate(Math.floor((b / scale - bounds.x) / vs), Math.floor((b / scale - bounds.y) / vs));
    xmlCanvas.scale(1 / vs);

    imgExport.drawState(this.graph.getView().getState(this.graph.getCurrentRoot()), xmlCanvas);

    let w = Math.ceil(bounds.width * scale / vs + 2 * b);
    let h = Math.ceil(bounds.height * scale / vs + 2 * b);

    let xml = mx.mxUtils.getXml(root);

    if (bg != null) {
      bg = '&bg=' + bg;
    }

    new mx.mxXmlRequest(environment.backendURL + '/export', 'filename=' + filename + '.' + format + '&format=' + format + bg + '&w=' + w + '&h=' + h + '&xml=' + encodeURIComponent(xml)).simulate(document, '_blank');
  }

  /**
   * Encodes the current graph to a string (xml) representation
   */
  getGraphXML(): string {
    const encoder = new mx.mxCodec();
    const result = encoder.encode(this.graph.getModel());
    return mx.mxUtils.getXml(result);
  }

  /**
   * Decodes the given string (xml) representation of a graph
   * and uses it to replace the current graph
   */
  setGraphToXML(graphString: string) {
    this.anyForeignCellsFound = false;
    this.graph.home();
    this.graph.getModel().clear();

    const doc = mx.mxUtils.parseXml(graphString);
    const codec = new mx.mxCodec(doc);
    codec.decode(doc.documentElement, this.graph.getModel());

    // get the viewCell that has no references
    const cell1 = this.graph.getModel().getCell("1");
    let viewCells = this.graph.getModel().getChildren(cell1);
    let rootViewCell = viewCells[0];
    for (let viewCell of viewCells) {
      if (this.getCoupledCells(viewCell.getId()).length > 0)
        continue;
      rootViewCell = viewCell;
      break;
    }
    this.graph.enterGroup(rootViewCell);
    this.viewStack = [];
    this.viewStack.push(rootViewCell);
    this.selectionStack = [];

    let children = this.graph.getModel().getChildren(this.graph.getDefaultParent());
    children.forEach(element => {
      if (element.isCircuitContainer())
        element.refreshCircuitContainer(this.graph);
    });

    if (this.anyForeignCellsFound) {
      console.log("FORMATTING !!!!!!!!!!!!!!!!");
      this.autoFormat();
      this.anyForeignCellsFound = false;
    }

    this.fitCamera();

    this.metadataService.setComponentDefinitionMode(this.graph.getCurrentRoot().isComponentView());

    this.editor.undoManager.clear();
  }

  /**
   * Decodes the given string (xml) representation of a cell
   * and uses it ot replace the currently selected cell
   * @param cellString
   */
  async setSelectedToXML(cellString: string) {
    const selectionCells = this.graph.getSelectionCells();

    if (selectionCells.length == 1 && (selectionCells[0].isSequenceFeatureGlyph() || selectionCells[0].isCircuitContainer())) {
      // We're making a new cell to replace the selected one
      let selectedCell = selectionCells[0];

      this.graph.getModel().beginUpdate();
      try {

        let fromCircuitContainer = selectedCell.isCircuitContainer();
        let inModuleView = this.graph.getCurrentRoot().isModuleView();

        // prompt ownership change
        if (this.graph.getCurrentRoot()) {
          let glyphInfo;
          if (fromCircuitContainer) {
            if (this.viewStack.length > 1) {
              // has a parent that might need to change
              glyphInfo = this.getFromGlyphDict(this.selectionStack[this.selectionStack.length - 1].getParent().getValue());
            }
            //TODO come back to me when module definitions will need to be updated
          } else {
            glyphInfo = this.getFromGlyphDict(selectedCell.getParent().getValue());
          }
          if (glyphInfo && glyphInfo.uriPrefix != GlyphInfo.baseURI && !await this.promptMakeEditableCopy(glyphInfo.displayID)) {
            return;
          }
        }

        // zoom out to make things easier
        if (fromCircuitContainer && this.viewStack.length > 1) {
          selectedCell = this.selectionStack[this.selectionStack.length - 1];
          this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));
        }

        // setup the decoding info
        const doc = mx.mxUtils.parseXml(cellString);
        const codec = new mx.mxCodec(doc);

        // store the information in a temp graph for easy access
        const subGraph = new mx.mxGraph();
        codec.decode(doc.documentElement, subGraph.getModel());

        // get the new cell
        let newCell = subGraph.getModel().cloneCell(subGraph.getModel().getCell("1").children[0]);

        // not part of a module or a top level component definition
        let origParent;
        if (selectedCell.isSequenceFeatureGlyph()) {
          // store old cell's parent
          origParent = selectedCell.getParent();

          // generated cells don't have a proper geometry
          newCell.setStyle(selectedCell.getStyle());
          this.graph.getModel().setGeometry(newCell, selectedCell.geometry);

          // add new cell to the graph
          this.graph.getModel().add(origParent, newCell, origParent.getIndex(selectedCell));

          // remove the old cell's view cell if it doesn't have any references
          if (this.getCoupledCells(selectedCell.value).length < 2) {
            this.removeViewCell(this.graph.getModel().getCell(selectedCell.value));
          }

          // remove the old cell
          this.graph.getModel().remove(selectedCell);

          // move any edges from selectedCell to newCell
          if (selectedCell.edges != null) {
            let edgeCache = [];
            selectedCell.edges.forEach(edge => {
              edgeCache.push(edge);
            });

            edgeCache.forEach(edge => {
              if (edge.source == selectedCell) {
                this.graph.getModel().setTerminal(edge, newCell, true);
              }
              if (edge.target == selectedCell) {
                this.graph.getModel().setTerminal(edge, newCell, false);
              }
            });
          }
        }

        // Now create all children of the new cell
        let viewCells = subGraph.getModel().getCell("1").children;
        let subGlyphDict = subGraph.getModel().getCell("0").getValue();
        let cell1 = this.graph.getModel().getCell("1");
        for (let i = 1; i < viewCells.length; i++) { // start at cell 1 because the glyph is at 0
          // If we already have it skip it
          if (this.graph.getModel().getCell(viewCells[i].getId())) {
            continue;
          }

          // clone the cell otherwise viewCells get's messed up
          let viewClone = subGraph.getModel().cloneCell(viewCells[i]);
          // cloning doesn't keep the id for some reason
          viewClone.id = viewCells[i].id;

          // add the cell to the graph
          this.graph.addCell(viewClone, cell1);

          // add the info to the dictionary
          if (this.getFromGlyphDict(viewCells[i].getId()) != null) {
            this.removeFromGlyphDict(viewCells[i].getId());
          }
          this.addToGlyphDict(subGlyphDict[viewCells[i].getId()]);
        }

        if (selectedCell.isSequenceFeatureGlyph()) {
          origParent.refreshCircuitContainer(this.graph);
          this.graph.setSelectionCell(newCell);
          this.mutateSequenceFeatureGlyph(this.getFromGlyphDict(newCell.value).partRole);
        }

        // if we came from a circuit container, zoom back into it
        if (fromCircuitContainer) {
          if (selectedCell.isSequenceFeatureGlyph()) {
            // if the selected cell is a sequenceFeature that means we came from a sub view
            this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), newCell, this));
          } else {
            // if it isn't, that means we are in a module, or at the root
            let newRootView = this.graph.getModel().getCell(newCell.getValue());
            let circuitContainer = this.graph.getModel().filterCells(newRootView.children, cell => cell.isCircuitContainer())[0];
            if (inModuleView) {
              // get the circuit container so we can replace our current one
              this.graph.getModel().setGeometry(circuitContainer, selectedCell.geometry);
              if (this.getCoupledCells(newRootView.getId()).length < 1)
                // we don't need the root view if nothing references it, we only need it's circuit container
                this.graph.getModel().remove(newRootView);
              circuitContainer = this.graph.getModel().add(selectedCell.getParent(), circuitContainer);
              this.graph.getModel().remove(selectedCell);
              circuitContainer.refreshCircuitContainer(this.graph);
              //circuitContainer.setCollapsed(false); 
            } else {
              // at the root, just zoom back in
              this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), newRootView, this));
              circuitContainer.refreshCircuitContainer(this.graph);
            }
          }
        }
      } finally {
        this.graph.getModel().endUpdate();
      }
    }
    console.log(this.graph.getModel().cells);
  }

  resetGraph(moduleMode: boolean = true) {
    this.graph.home();
    this.graph.getModel().clear();

    this.viewStack = [];
    this.selectionStack = [];

    // initalize the GlyphInfoDictionary
    const cell0 = this.graph.getModel().getCell(0);
    const glyphDict = [];
    this.graph.getModel().setValue(cell0, glyphDict);

    const cell1 = this.graph.getModel().getCell(1);
    let rootViewCell;

    // initalize the root view cell of the graph
    if (moduleMode) {
      rootViewCell = this.graph.insertVertex(cell1, "rootView", "", 0, 0, 0, 0, GraphBase.moduleViewCellStyleName);
      this.graph.enterGroup(rootViewCell);
      this.viewStack.push(rootViewCell);
    } else {
      let info = new GlyphInfo();
      this.addToGlyphDict(info);
      rootViewCell = this.graph.insertVertex(cell1, info.getFullURI(), "", 0, 0, 0, 0, GraphBase.componentViewCellStyleName);
      this.graph.enterGroup(rootViewCell);
      this.viewStack.push(rootViewCell);
      this.addBackbone();
    }

    this.metadataService.setComponentDefinitionMode(!moduleMode);

    this.editor.undoManager.clear();
  }

  /**
   * Sets the graph to component definition mode or module mode.
   * wrapper for metadataService.setComponentDefinitionMode.
   * @param componentMode True if you want to be in component mode, false if module mode.
   */
  public setComponentDefinitionMode(componentMode: boolean) {
    this.metadataService.setComponentDefinitionMode(componentMode);
  }



  horizontalSortBasedOnPosition(circuitContainer) {
    // sort the children
    let childrenCopy = circuitContainer.children.slice();
    childrenCopy.sort(function (cellA, cellB) {
      return cellA.getGeometry().x - cellB.getGeometry().x;
    });
    // and have the model reflect the sort in an undoable way
    for (let i = 0; i < childrenCopy.length; i++) {
      const child = childrenCopy[i];
      this.graph.getModel().add(circuitContainer, child, i);
    }

    circuitContainer.refreshCircuitContainer(this.graph);
  }
}
