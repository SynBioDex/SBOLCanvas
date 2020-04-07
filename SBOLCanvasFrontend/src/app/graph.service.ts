/*
 * GraphService
 *
 * This service controls the main editing canvas
 */

import { Injectable } from '@angular/core';
import * as mxEditor from 'mxgraph';
import * as mxGraph from 'mxgraph';
import * as mxDragSource from 'mxgraph';
import * as mxCell from 'mxgraph';
import { GlyphInfo } from './glyphInfo';
import { StyleInfo} from './style-info';
import { MetadataService } from './metadata.service';
import { GlyphService } from './glyph.service';
import { InteractionInfo } from './interactionInfo';
import { environment } from 'src/environments/environment';
import { MatDialog } from '@angular/material';
import { ErrorComponent } from './error/error.component';
import { ConfirmComponent } from './confirm/confirm.component';
import { mxGraphView } from 'src/mxgraph';

declare var require: any;
const mx = require('mxgraph')({
  mxImageBasePath: 'mxgraph/images',
  mxBasePath: 'mxgraph'
});

// Constants
const sequenceFeatureGlyphWidth = 50;
const sequenceFeatureGlyphHeight = 100;
const interactionPortWidth = 10;

const molecularSpeciesGlyphWidth = 50;
const molecularSpeciesGlyphHeight = 50;

const defaultTextWidth = 120;
const defaultTextHeight = 80;

const defaultInteractionSize = 60;

const circuitContainerStyleName = 'circuitContainer';
const backboneStyleName = 'backbone';
const textboxStyleName = 'textBox';
const scarStyleName = 'Scar (Assembly Scar)';
const noGlyphAssignedName = 'NGA (No Glyph Assigned)';
const molecularSpeciesGlyphBaseStyleName = 'molecularSpeciesGlyph';
const sequenceFeatureGlyphBaseStyleName = 'sequenceFeatureGlyph';
const interactionGlyphBaseStyleName = 'interactionGlyph';

const interactionControlName = 'Control';
const interactionInhibitionName = 'Inhibition';
const interactionStimulationName = 'Stimulation';
const interactionProcessName = 'Process';
const interactionDegradationName = 'Degradation';

// We can import non native designs. This will be set to true if ceratin annotations weren't found
let anyForeignCellsFound = false;

@Injectable({
  providedIn: 'root'
})
export class GraphService {

  graph: mxGraph;
  editor: mxEditor;
  graphContainer: HTMLElement;

  // Keeps track of the cell order we entered
  viewStack: mxCell[];
  selectionStack: mxCell[];

  // Boolean for keeping track of whether we are showing scars or not in the graph.
  showingScars: boolean = true;

  baseMolecularSpeciesGlyphStyle: any;
  baseSequenceFeatureGlyphStyle: any;

  // This object handles the hotkeys for the graph.
  keyHandler: any;

  // edit object for interaction history
  static interactionEdit = class {
    cell: mxCell;
    info: any;
    previous: any;
    constructor(cell, info){
      this.cell = cell;
      this.info = info;
      this.previous = info;
    }

    execute(){
      if(this.cell != null){
        let tmp = this.cell.data.makeCopy();
        if(this.previous == null){
          this.cell.data = null;
        }else{
          this.cell.data.copyDataFrom(this.previous);
        }

        this.previous = tmp;
      }
    }
  }

  // edit object for glyph adding history
  static glyphInfoEdit = class{
    cell0: mxCell;
    info: GlyphInfo;
    previousInfo: GlyphInfo;
    constructor(cell0: string, info: GlyphInfo, previousInfo: GlyphInfo){
      this.cell0 = cell0;
      // store them in reverse so the execute performs the action the first time
      this.info = previousInfo;
      this.previousInfo = info;
    }

    // Execute is called for both un-doing and re-doing
    execute(){
      if(this.previousInfo == null){
        // if the previous was null, then the dictionary didn't have an entry before so remove it
        delete this.cell0.value[this.info.displayID];
        this.previousInfo = this.info;
        this.info = null;
      }else if(this.info == null){
        // if the current one is null, then it was removed, so re-add it
        this.cell0.value[this.previousInfo.displayID] = this.previousInfo;
        this.info = this.previousInfo;
        this.previousInfo = null;
      }else{
        // some information was changed, so update it
        this.cell0.value[this.info.displayID] = this.previousInfo;
        const tmpInfo = this.info;
        this.info = this.previousInfo;
        this.previousInfo = tmpInfo;
      }
    }
  }

  // because the mxCurrentRootChange doesn't do what we want
  static zoomEdit = class{
    view: mxGraphView;
    glyphCell: mxCell;
    goDown: boolean;
    graphService: GraphService;
    constructor(view: mxGraphView, glyphCell: mxCell, graphService: GraphService){
      this.view = view;
      this.glyphCell = glyphCell;
      this.goDown = glyphCell != null;
      this.graphService = graphService;
    }

    execute(){
      if(this.glyphCell != null){
        // Zoom into the glyph
        // get the view cell for the selected cell
        const childViewCell = this.graphService.graph.getModel().getCell(this.glyphCell.value);

        // add the necessary info to the viewstack and selectionstack
        this.graphService.viewStack.push(childViewCell);
        this.graphService.selectionStack.push(this.glyphCell);

        // change the view
        this.view.clear(this.view.currentRoot, true);
        this.view.currentRoot = childViewCell;
        
        // set the selection to the circuit container
        this.graphService.graph.setSelectionCell(childViewCell.children[0]);
        this.graphService.fitCamera();

        // make sure we can't add new strands/interactions/molecules
        this.graphService.metadataService.setComponentDefinitionMode(true);

        this.glyphCell = null;
      }else{
        // Zoom out of the glyph
        // remove the last items on the stack
        this.graphService.viewStack.pop();
        const newSelectedCell = this.graphService.selectionStack.pop();

        // change the view
        this.view.clear(this.view.currentRoot, true);
        this.view.currentRoot = this.graphService.viewStack[this.graphService.viewStack.length-1];

        // set the selection back
        this.graphService.graph.setSelectionCell(newSelectedCell);
        this.graphService.setAllScars(this.graphService.showingScars);
        this.graphService.fitCamera();

        // make sure we can add new strands/interactions/molecules on the top level
        if(this.graphService.viewStack.length == 1){
          this.graphService.metadataService.setComponentDefinitionMode(false);
        }

        this.glyphCell = newSelectedCell;
      }
    }
  }

  constructor(public dialog: MatDialog, private metadataService: MetadataService, private glyphService: GlyphService) {
    // constructor code is divided into helper methods for organization,
    // but these methods aren't entirely modular; order of some of
    // these calls is important
    this.initDecodeEnv();
    this.initExtraCellMethods();
    this.initGroupingRules();

    this.graphContainer = document.createElement('div');
    this.graphContainer.id = 'graphContainer';
    this.graphContainer.style.margin = 'auto';
    this.graphContainer.style.background = 'url(assets/grid.png)';
    this.graphContainer.style.position = 'absolute';
    this.graphContainer.style.top = '0';
    this.graphContainer.style.bottom = '0';
    this.graphContainer.style.left = '0';
    this.graphContainer.style.right = '0';
    this.graphContainer.style.overflow = 'hidden';

    // mxEditor is kind of a parent to mxGraph
    // it's used mainly for 'actions', which for now means delete, later will mean undoing
    this.editor = new mx.mxEditor();
    this.graph = this.editor.graph;
    this.editor.setGraphContainer(this.graphContainer);

    this.graph.setCellsCloneable(false);
    this.graph.setConnectable(true);
    this.graph.setDisconnectOnMove(false);

    // Can't create edges without the glyph menu
    this.graph.connectionHandler.enabled = false;

    // Edges are allowed to be detached
    this.graph.setAllowDanglingEdges(true);

    // slightly clearer selection highlighting
    mx.mxConstants.VERTEX_SELECTION_STROKEWIDTH = 2;

    // Enables click-and-drag selection
    new mx.mxRubberband(this.graph);

    // This controls whether glyphs can be expanded without replacing the canvas
    this.graph.isCellFoldable = function (cell) {
      return false;
      // to enable, use 'return cell.isSequenceFeatureGlyph();'
    };

    this.graph.getSelectionModel().addListener(mx.mxEvent.CHANGE, mx.mxUtils.bind(this, this.handleSelectionChange));

    this.initStyles();
    this.initCustomShapes();
    this.initSequenceFeatureGlyphMovement();

    // initalize the root view cell of the graph
    const cell1 = this.graph.getModel().getCell(1);
    const rootViewCell = this.graph.insertVertex(cell1, "rootView", "", 0,0,0,0, null);
    this.graph.enterGroup(rootViewCell);
    this.viewStack = [];
    this.viewStack.push(rootViewCell);
    this.selectionStack = [];

    // initalize the GlyphInfoDictionary
    const cell0 = this.graph.getModel().getCell(0);
    const glyphDict = [];
    this.graph.getModel().setValue(cell0, glyphDict);

    // don't let any of the setup be on the undo stack
    this.editor.undoManager.clear();
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
    if (cell.isSequenceFeatureGlyph() || cell.isMolecularSpeciesGlyph()) {
      const glyphInfo = this.getFromGlyphDict(cell.value);
      if (glyphInfo) {
        this.metadataService.setSelectedGlyphInfo(glyphInfo.makeCopy());
      }
    }
    else if (cell.isCircuitContainer()) {
      // If the cell is a circuit container, and we are zoomed into a component
      // definition, then we can display the info of the parent component definition.
      if (cell.parent.id != "rootView") {
        const glyphInfo = this.getFromGlyphDict(cell.parent.id);
        if (glyphInfo) {
          this.metadataService.setSelectedGlyphInfo(glyphInfo.makeCopy());
        }
      }
    }
    else if (cell.isInteraction()) {
      let interactionInfo = cell.data
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
        geo.height = sequenceFeatureGlyphHeight;

        if (this.showingScars) {
          geo.width = sequenceFeatureGlyphWidth;
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
   * It rotates any selected sequenceFeatureGlyphs by 180 degrees.
   */
  flipSequenceFeatureGlyph() {
    let selectionCells = this.graph.getSelectionCells();

    // flip any selected glyphs
    for (let cell of selectionCells) {
      if (cell.isSequenceFeatureGlyph()) {
        // Make the cell do a 180 degree turn with the center point as the axis of rotation.
        this.graph.getModel().beginUpdate();

        try {
          let rotation = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_ROTATION];
          console.debug("current glyph rotation setting = " + rotation);

          if (rotation == undefined) {
            console.warn("rotation style undefined. Assuming 0, and rotating to 180");
            this.graph.setCellStyles(mx.mxConstants.STYLE_ROTATION, 180, [cell]);
          } else if (rotation == 0) {
            this.graph.setCellStyles(mx.mxConstants.STYLE_ROTATION, 180, [cell]);
            console.debug("rotating to 180")
          } else if (rotation == 180) {
            this.graph.setCellStyles(mx.mxConstants.STYLE_ROTATION, 0, [cell]);
            console.debug("rotating to 0")
          }
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

    let zoomEdit = new GraphService.zoomEdit(this.graph.getView(), selection[0], this);
    this.graph.getModel().execute(zoomEdit);
  }

  /**
   * Moves up the drilling hierarchy, restoring the canvas to how it was before "Drilling in"
   * (If "enterGlyph" has not been called, ie the canvas is already
   * at the top of the drilling hierarchy, does nothing)
   */
  exitGlyph() {
    // the root view should always be left on the viewStack
    let zoomEdit = new GraphService.zoomEdit(this.graph.getView(), null, this);
    this.graph.getModel().execute(zoomEdit);
  }

  /**
   * Turns the given element into a dragsource for creating empty DNA strands
   */
  makeBackboneDragsource(element) {
    const insertGlyph = mx.mxUtils.bind(this, function (graph, evt, target, x, y) {
      this.addBackboneAt(x - sequenceFeatureGlyphWidth / 2, y - sequenceFeatureGlyphHeight / 2);
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
      const circuitContainer = this.graph.insertVertex(this.graph.getDefaultParent(), null, '', x, y, sequenceFeatureGlyphWidth, sequenceFeatureGlyphHeight, circuitContainerStyleName);
      const backbone = this.graph.insertVertex(circuitContainer, null, '', 0, sequenceFeatureGlyphHeight / 2, sequenceFeatureGlyphWidth, 1, backboneStyleName);

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
  delete() {
    const selectedCells = this.graph.getSelectionCells();
    if (selectedCells == null) {
      return;
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
      if (this.graph.getCurrentRoot() != null) {
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

    // If the undo caused scars to become visible, we should update
    this.showingScars = this.getScarsVisible();

    // selections after an undo break things if annother undo/redo happens
    this.filterSelectionCells();
  }

  /**
   * Redoes the most recent changes
   */
  redo() {
    this.editor.execute('redo');

    // If the undo caused scars to become visible, we should update
    this.showingScars = this.getScarsVisible();

    // selections after an undo break things if annother undo/redo happens
    this.filterSelectionCells();
  }

  /**
   * Only the currently viewable layer should be allowed to have selections
   */
  private filterSelectionCells(){
    const selectionCells = this.graph.getSelectionCells();
    const newSelectionCells = [];
    for(let i = 0; i < selectionCells.length; i++){
      if(selectionCells[i].getParent() && selectionCells[i].getParent().getParent() === this.viewStack[this.viewStack.length-1]){
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

  getZoom() :number {
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
      this.addSequenceFeatureAt(stylename, x - sequenceFeatureGlyphWidth / 2, y - sequenceFeatureGlyphHeight / 2);
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
  addSequenceFeatureAt(name, x, y, circuitContainer?) {
    this.graph.getModel().beginUpdate();
    try {
      // Make sure scars are/become visible if we're adding one
      if (name.includes(scarStyleName) && !this.showingScars) {
        this.toggleScars();
      }

      if (!this.atLeastOneCircuitContainerInGraph()) {
        // if there is no strand, quietly make one
        // stupid user
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
      const sequenceFeatureCell = this.graph.insertVertex(circuitContainer, null, glyphInfo.displayID, x, y, sequenceFeatureGlyphWidth, sequenceFeatureGlyphHeight, sequenceFeatureGlyphBaseStyleName + name);

      // construct the view cell for it's children
      const cell1 = this.graph.getModel().getCell(1);
      const childViewCell = this.graph.insertVertex(cell1, glyphInfo.displayID, '', 0, 0, 0, 0, null);

      // add the backbone to the child view cell
      const childCircuitContainer = this.graph.insertVertex(childViewCell, null, '', 0, 0, 0, 0, circuitContainerStyleName);
      const childCircuitContainerBackbone = this.graph.insertVertex(childCircuitContainer, null, '', 0, 0, 0, 0, backboneStyleName);

      //sequenceFeatureCell.setCollapsed(true);

      childCircuitContainerBackbone.setConnectable(false);
      childCircuitContainer.setConnectable(false);
      sequenceFeatureCell.setConnectable(true);

      // Sorts the new SequenceFeature into the correct position in parent's array
      this.horizontalSortBasedOnPosition(circuitContainer);

      // The new glyph should be selected
      this.graph.clearSelection();
      this.graph.setSelectionCell(sequenceFeatureCell);
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
      this.addMolecularSpeciesAt(stylename, x - molecularSpeciesGlyphWidth / 2, y - molecularSpeciesGlyphHeight / 2);
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
      switch(name){
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

      const molecularSpeciesGlyph = this.graph.insertVertex(this.graph.getDefaultParent(), null, proteinInfo.displayID, x, y,
        molecularSpeciesGlyphWidth, molecularSpeciesGlyphHeight, molecularSpeciesGlyphBaseStyleName + name);
      molecularSpeciesGlyph.setConnectable(true);

      // The new glyph should be selected
      this.graph.clearSelection();
      this.graph.setSelectionCell(molecularSpeciesGlyph);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Turns the given HTML element into a dragsource for creating interaction glyphs
   */
  makeInteractionDragsource(element, stylename) {
    const insertGlyph = mx.mxUtils.bind(this, function (graph, evt, target, x, y) {
      this.addInteractionAt(stylename, x - defaultInteractionSize / 2, y - defaultInteractionSize / 2);
    });
    this.makeGeneralDragsource(element, insertGlyph);
  }

  /**
   * Creates an interaction edge of the given type at the center of the current view
   */
  addInteraction(name) {
    const pt = this.getDefaultNewCellCoords();
    this.addInteractionAt(name, pt.x, pt.y);
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
      cell = new mx.mxCell(new InteractionInfo(), new mx.mxGeometry(x, y, 0, 0), interactionGlyphBaseStyleName + name);

      cell.geometry.setTerminalPoint(new mx.mxPoint(x, y + defaultInteractionSize), true);
      cell.geometry.setTerminalPoint(new mx.mxPoint(x + defaultInteractionSize, y), false);

      cell.edge = true;
      this.graph.addEdge(cell, null, null, null);

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
    if(!graph){
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
      let newStyleName = sequenceFeatureGlyphBaseStyleName + name;

      // if there's no style for the partRole, use noGlyphAssigned
      let cellStyle = graph.getStylesheet().getCellStyle(newStyleName);
      // if there is no registered style for the newStyleName, getCellStyle returns an empty object.
      // all of our registered styles have several fields, use fillcolor as an example to check
      if (!cellStyle.fillColor)
        newStyleName = sequenceFeatureGlyphBaseStyleName + noGlyphAssignedName;

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
            let startIdx = styleString.indexOf(sequenceFeatureGlyphBaseStyleName);
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
        name = interactionGlyphBaseStyleName + name;

        // Modify the style string
        let styleString = selectedCell.style.slice();
        if (!styleString.includes(';')) {
          // nothing special needed, the original style only had the glyphStyleName
          styleString = name;
        } else {
          // the string is something like "strokecolor=#000000;interactionStyleName;fillcolor=#ffffff;etc;etc;"
          // we only want to replace the 'glyphStyleName' bit
          let startIdx = styleString.indexOf(interactionGlyphBaseStyleName);
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
      this.addTextBoxAt(x - defaultTextWidth / 2, y - defaultTextHeight / 2);
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
      const cell = this.graph.insertVertex(this.graph.getDefaultParent(), null, 'Sample Text', x, y, defaultTextWidth, defaultTextHeight, textboxStyleName);
      cell.setConnectable(false);

      // The new cell should be selected
      this.graph.clearSelection();
      this.graph.setSelectionCell(cell);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Updates a GlyphInfo
   * NOTE: Should only be used if the displayID is the same
   */
  private updateGlyphDict(info: GlyphInfo){
    const cell0 = this.graph.getModel().getCell(0);
    this.graph.getModel().execute(new GraphService.glyphInfoEdit(cell0, info, cell0.value[info.displayID]));
  }

  private removeFromGlyphDict(displayID: string){
    const cell0 = this.graph.getModel().getCell(0);
    this.graph.getModel().execute(new GraphService.glyphInfoEdit(cell0, null, cell0.value[displayID]));
  }

  /**
   * Add a GlyphInfo object to the dictionary
   */
  private addToGlyphDict(info: GlyphInfo){
    const cell0 = this.graph.getModel().getCell(0);
    this.graph.getModel().execute(new GraphService.glyphInfoEdit(cell0, info, null));
  }

  /**
   * Get the GlyphInfo with the given displayID from the dictionary
   */
  getFromGlyphDict(displayID: string){
    const cell0 = this.graph.getModel().getCell(0);
    return cell0.value[displayID];
  }

  /**
   * Find the selected cell, and if there is a glyph selected, update its metadata.
   */
  setSelectedCellInfo(glyphInfo: GlyphInfo);
  setSelectedCellInfo(interactionInfo: InteractionInfo);
  setSelectedCellInfo(info: any) {
    const selectedCell = this.graph.getSelectionCell();
    if (!selectedCell) {
      return;
    }

    // verify that the selected cell matches the type of info object
    if (info instanceof GlyphInfo && (selectedCell.isSequenceFeatureGlyph() || selectedCell.isCircuitContainer() || selectedCell.isMolecularSpeciesGlyph()) ||
      (info instanceof InteractionInfo && selectedCell.isInteraction())) {

      // since it does, update its info
      this.graph.getModel().beginUpdate();
      try{
        if(info instanceof GlyphInfo){

          let oldDisplayID = "";
          // The selected cell might be a circuit container, in which case we need the id of the parent.
          if (selectedCell.isCircuitContainer()) {
            oldDisplayID = selectedCell.parent.id;
          } else {
            oldDisplayID = selectedCell.value;
          }
          const newDisplayID = info.displayID;
          if(oldDisplayID != newDisplayID){
            // check for a cycle
            let cycle = false;
            this.viewStack.forEach(function (viewCell){
              if(viewCell.id === newDisplayID)
                cycle = true;
            });
            if(cycle){
              // Tell the user a cycle isn't allowed
              this.dialog.open(ErrorComponent, {data: "ComponentInstance objects MUST NOT form circular reference chains via their definition properties and parent ComponentDefinition objects."});
              return;
            }

            const coupledCells = this.getCoupledCells(oldDisplayID);
            if(coupledCells.length > 1){
              this.promptDeCouple(selectedCell, coupledCells, info, newDisplayID, oldDisplayID);
              return;
            }

            const conflictViewCell = this.graph.getModel().getCell(newDisplayID);
            if(conflictViewCell != null){
              this.promptCouple(conflictViewCell, [selectedCell], info, newDisplayID, oldDisplayID);
              return;
            }

            // update the glyphDictionary
            this.removeFromGlyphDict(oldDisplayID);
            this.addToGlyphDict(info);

            if(selectedCell.isCircuitContainer()){
              const glyphZoomed = this.selectionStack[this.selectionStack.length-1];
              this.graph.getModel().execute(new GraphService.zoomEdit(this.graph.getView(), null, this));
              
              // default case
              // update the viewcell ID
              const viewCell = this.graph.getModel().getCell(oldDisplayID);
              this.updateViewCell(viewCell, newDisplayID);

              // update the selected cell id
              this.graph.getModel().setValue(glyphZoomed, newDisplayID);

              this.graph.getModel().execute(new GraphService.zoomEdit(this.graph.getView(), glyphZoomed, this));
            }else{
              // default case
              // update the viewcell ID
              const viewCell = this.graph.getModel().getCell(oldDisplayID);
              this.updateViewCell(viewCell, newDisplayID);

              // update the selected cell id
              this.graph.getModel().setValue(selectedCell, newDisplayID);
            }

            // update the view
            this.updateAngularMetadata(this.graph.getSelectionCells());
            return;
          }

          //let glyphEdit = new GraphService.glyphEdit(info);
          this.updateGlyphDict(info);

          // there may be coupled cells that need to also be mutated
          // the glyphInfo may be different than info, so use getFromGlyphDict
          if(selectedCell.isCircuitContainer()){
            this.mutateSequenceFeatureGlyph(this.getFromGlyphDict(selectedCell.parent.id).partRole, this.getCoupledCells(selectedCell.parent.id));
          }else{
            this.mutateSequenceFeatureGlyph(this.getFromGlyphDict(selectedCell.value).partRole, this.getCoupledCells(selectedCell.value));
          }
          // update the view
          this.updateAngularMetadata(this.graph.getSelectionCells());

        }else{
          let interactionEdit = new GraphService.interactionEdit(selectedCell, info);
          this.mutateInteractionGlyph(info.interactionType);
          this.graph.getModel().execute(interactionEdit);
        }
      }finally{
        this.graph.getModel().endUpdate();
      }
    }
  }

  private promptCouple(conflictViewCell: mxCell, selectedCells: mxCell[], info: GlyphInfo, newDisplayID: string, oldDisplayID: string){
    // start a new begin so that when the dialog closes, all changes are in one edit
    this.graph.getModel().beginUpdate();
    // a cell with this display ID already exists prompt user if they want to couple them
    const confirmRef = this.dialog.open(ConfirmComponent, {data: {message: "A component with this displayID already exists. Would you like to couple them and keep the current substructure, or update it?", options: ["Keep", "Update", "Cancel"]}});
    confirmRef.afterClosed().subscribe(result => {
      if(result === "Keep"){

        // update the glyphDict
        this.removeFromGlyphDict(oldDisplayID);
        this.removeFromGlyphDict(newDisplayID);
        this.addToGlyphDict(info);

        // update the viewCell id
        const viewCell = this.graph.getModel().getCell(oldDisplayID);
        

        // update the display of the selectioncell
        if(selectedCells.length == 1 && selectedCells[0].isCircuitContainer()){
          const glyphZoomed = this.selectionStack[this.selectionStack.length-1];
          // zoom out before making changes
          this.graph.getModel().execute(new GraphService.zoomEdit(this.graph.getView(), null, this));

          // remove the found viewCell and replace it with this one
          this.graph.getModel().remove(conflictViewCell);
          
          // change the displayID associated with the glyph
          this.graph.getModel().setValue(glyphZoomed, newDisplayID);

          // update the viewCell's id
          this.updateViewCell(viewCell, newDisplayID);

          // rezoom after the ID has been changed
          this.graph.getModel().execute(new GraphService.zoomEdit(this.graph.getView(), glyphZoomed, this));
        }else{
          // remove the found viewCell and replace it with this one
          this.graph.getModel().remove(conflictViewCell);
          
          // update the viewCell's id
          this.updateViewCell(viewCell, newDisplayID);

          // change the displayID assicated with the glyphs
          const graph = this.graph;
          selectedCells.forEach(function (cell){
            graph.getModel().setValue(cell, newDisplayID);
          });
        }

        // update the conflicting cells graphics
        this.mutateSequenceFeatureGlyph(info.partRole, this.getCoupledCells(newDisplayID));
      }else if(result === "Update"){
        // update the selected cells displayID
        if(selectedCells.length == 1 && selectedCells[0].isCircuitContainer()){
          // update the glyphDict
          this.removeFromGlyphDict(oldDisplayID);

          const glyphZoomed = this.selectionStack[this.selectionStack.length-1];
          // unzoom and rezoom after the rename
          this.graph.getModel().execute(new GraphService.zoomEdit(this.graph.getView(), null, this));

          // remove this cells viewCell and update the displayID
          const viewCell = this.graph.getModel().getCell(oldDisplayID);
          this.graph.getModel().remove(viewCell);

          this.graph.getModel().setValue(glyphZoomed, newDisplayID);
          this.graph.getModel().execute(new GraphService.zoomEdit(this.graph.getView(), glyphZoomed, this));
        }else{
          // remove this cells viewCell and update the displayID
          const viewCell = this.graph.getModel().getCell(oldDisplayID);
          this.graph.getModel().remove(viewCell);

          // update the glyphDict
          this.removeFromGlyphDict(oldDisplayID);

          const graph = this.graph;
          selectedCells.forEach(function (cell){
            graph.getModel().setValue(cell, newDisplayID);
          });
        }

        // update the selected cell's graphics
        if(selectedCells.length == 1 && selectedCells[0].isCircuitContainer()){
          this.mutateSequenceFeatureGlyph(this.getFromGlyphDict(newDisplayID).partRole, [this.selectionStack[this.selectionStack.length-1]]);
        }else{
          this.mutateSequenceFeatureGlyph(this.getFromGlyphDict(newDisplayID).partRole, selectedCells);
        }
      }
      this.graph.getModel().endUpdate();
      // update the view
      this.updateAngularMetadata(this.graph.getSelectionCells());
    });
  }

  private promptDeCouple(selectedCell: mxCell, coupledCells: mxCell[], info: GlyphInfo, newDisplayID: string, oldDisplayID: string){
    // start a new begin so that when the dialog closes, all changes are in one edit
    this.graph.getModel().beginUpdate();
    // prompt the user if they want to keep the cells coupled
    const confirmRef = this.dialog.open(ConfirmComponent, {data: {message: "Other components are coupled with this one. Would you like to keep them coupled?", options: ["Yes","No","Cancel"]}});
    confirmRef.afterClosed().subscribe(result => {
      if(result === "Yes"){
        // update the glyph dict
        this.removeFromGlyphDict(oldDisplayID);
        this.addToGlyphDict(info);

        // update viewCell id
        const viewCell = this.graph.getModel().getCell(oldDisplayID);
        // if the current selectedcell is a circuit container we need to unzoom and rezoom
        if(selectedCell.isCircuitContainer()){
          const zoomedCell = this.selectionStack[this.selectionStack.length-1];
          this.graph.getModel().execute(new GraphService.zoomEdit(this.graph.getView(), null, this));
          this.updateViewCell(viewCell, newDisplayID);

          // update the displayID of the other cells
          // this.graph can't be used in the foreach apparently
          const graph = this.graph;
          coupledCells.forEach(function (cell) {
            graph.getModel().setValue(cell, newDisplayID);
          });

          this.graph.getModel().execute(new GraphService.zoomEdit(this.graph.getView(), zoomedCell, this));
        }else{
          this.updateViewCell(viewCell, newDisplayID);

          // update the displayID of the other cells
          // this.graph can't be used in the foreach apparently
          const graph = this.graph;
          coupledCells.forEach(function (cell) {
            graph.getModel().setValue(cell, newDisplayID);
          });
        }
        
        this.mutateSequenceFeatureGlyph(info.partRole, coupledCells, this.graph);
      }else if(result === "No"){
        // don't use update, as it will remove the old one
        this.addToGlyphDict(info);

        // copy viewCell
        const viewCell = this.graph.getModel().getCell(oldDisplayID);
        const viewCellClone = this.graph.getModel().cloneCell(viewCell);

        // update the clones id
        this.updateViewCell(viewCellClone, newDisplayID);

        if(selectedCell.isCircuitContainer()){
          const glyphZoomed = this.selectionStack[this.selectionStack.length-1];
          this.graph.getModel().execute(new GraphService.zoomEdit(this.graph.getView(), null, this));
          this.graph.getModel().setValue(glyphZoomed, newDisplayID);
          this.graph.getModel().execute(new GraphService.zoomEdit(this.graph.getView(), glyphZoomed, this));
        }else{
          // update the selected cell's displayID
          this.graph.getModel().setValue(selectedCell, newDisplayID);
        }
        this.mutateSequenceFeatureGlyph(info.partRole);
      }
      this.graph.getModel().endUpdate();
      // update the view
      this.updateAngularMetadata(this.graph.getSelectionCells());
    });
  }

  private getCoupledCells(displayID: string): mxCell[]{
    const coupledCells = [];
    for(let key in this.graph.getModel().cells){
      const cell = this.graph.getModel().cells[key];
      if(cell.value === displayID){
        coupledCells.push(cell);
      }
    }
    return coupledCells;
  }

  private updateViewCell(cell: mxCell, newDisplayID: string){
    const newViewCell = this.graph.getModel().cloneCell(cell);
    this.graph.getModel().remove(cell);
    // clone it because the previous remove will keep the id change if we don't
    newViewCell.id = newDisplayID;
    this.graph.getModel().add(this.graph.getModel().getCell(1), newViewCell);
  }

  exportSVG(filename: string){
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

    if(background != null){
      if(root.style != null){
        root.style.backgroundColor = background;
      }else{
        root.setAttribute('style', 'background-color:' + background);
      }
    }

    if(svgDoc.createElementNS == null){
      root.setAttribute('xmlns', mx.mxConstants.NS_SVG);
      root.setAttribute('xmlns:xlink', mx.mxConstants.NS_XLINK);
    }else{
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
    imgExport.drawState(this.graph.getView().getState(this.graph.model.root), svgCanvas);

    var xml = encodeURIComponent(mx.mxUtils.getXml(root));
    new mx.mxXmlRequest(environment.backendURL+'/echo', 'filename='+filename+'.svg&format=svg' + '&xml=' + xml).simulate(document, '_blank');
  }

  exportImage(filename: string, format:string) {
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

    imgExport.drawState(this.graph.getView().getState(this.graph.model.root), xmlCanvas);

    let w = Math.ceil(bounds.width * scale / vs + 2 * b);
    let h = Math.ceil(bounds.height * scale / vs + 2 * b);

    let xml = mx.mxUtils.getXml(root);

    if (bg != null) {
      bg = '&bg=' + bg;
    }

    new mx.mxXmlRequest(environment.backendURL+'/export', 'filename='+filename+'.' + format + '&format=' + format + bg + '&w=' + w + '&h=' + h + '&xml=' + encodeURIComponent(xml)).simulate(document, '_blank');
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
    anyForeignCellsFound = false;
    this.graph.home();
    this.graph.getModel().clear();

    const doc = mx.mxUtils.parseXml(graphString);
    const codec = new mx.mxCodec(doc);
    codec.decode(doc.documentElement, this.graph.getModel());

    const rootViewCell = this.graph.getModel().getCell("rootView");
    this.graph.enterGroup(rootViewCell);
    this.viewStack = [];
    this.viewStack.push(rootViewCell);
    this.selectionStack = [];

    let children = this.graph.getModel().getChildren(this.graph.getDefaultParent());
    children.forEach(element => {
      if(element.isCircuitContainer())
      element.refreshCircuitContainer(this.graph);
    });
    
    if(anyForeignCellsFound){
      console.log("FORMATTING !!!!!!!!!!!!!!!!");
      this.autoFormat();
      anyForeignCellsFound = false;
    }

    this.fitCamera();
    
    this.editor.undoManager.clear();
  }

  /**
   * Decodes the given string (xml) representation of a cell
   * and uses it ot replace the currently selected cell
   * @param cellString
   */
  setSelectedToXML(cellString: string) {
    const selectionCells = this.graph.getSelectionCells();

    if (selectionCells.length == 1 && selectionCells[0].isSequenceFeatureGlyph()) {
      // We're making a new cell to replace the selected one
      let selectedCell = selectionCells[0];

      // setup the decoding info
      const doc = mx.mxUtils.parseXml(cellString);
      let elt = doc.documentElement.firstChild;
      const codec = new mx.mxCodec(doc);

      // store old cell's parent
      const origParent = selectedCell.getParent();

      this.graph.getModel().beginUpdate();
      try {
        // get the new cell
        let newCell = new mx.mxCell();
        codec.decode(elt, newCell);

        // new id (mxGraph id doesn't matter in SBOL, but must be unique per graph)
        newCell.id = this.graph.getModel().createId(newCell);

        // generated cells don't have a proper geometry
        newCell.setStyle(selectedCell.getStyle());
        this.graph.getModel().setGeometry(newCell, selectedCell.geometry);

        // add new cell to the graph
        this.graph.getModel().add(origParent, newCell, origParent.getIndex(selectedCell));
        console.log(newCell);

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

        // Now create all children of the new cell
        elt = elt.nextSibling;
        while (elt != null) {
          // create a new cell to decode into
          let newCell;// = new mx.mxCell();
          newCell = codec.decodeCell(elt);

          // replace id to ensure uniqueness in this graph
          // The decoder keeps track of the orignal ids, the ones from the xml,
          // so parent-child relationships within the new cells still work
          newCell.id = this.graph.getModel().createId(newCell);

          this.graph.addCell(newCell, newCell.parent);

          elt = elt.nextSibling;
        }

        this.graph.removeCells(null, false);
        origParent.refreshCircuitContainer(this.graph);
        this.graph.setSelectionCell(newCell);
        this.mutateSequenceFeatureGlyph(newCell.data.partRole);
      } finally {
        this.graph.getModel().endUpdate();
      }
    }

  }

  /**
   * Sets up environment variables to make decoding new graph models from xml into memory
   */
  initDecodeEnv() {
    // stuff needed for decoding
    window['mxGraphModel'] = mx.mxGraphModel;
    window['mxGeometry'] = mx.mxGeometry;
    window['mxPoint'] = mx.mxPoint;
    window['mxCell'] = mx.mxCell;

    //mxGraph uses function.name which uglifyJS breaks on production
    // Glyph info decode/encode
    Object.defineProperty(GlyphInfo, "name", { configurable: true, value: "GlyphInfo" });
    const glyphInfoCodec = new mx.mxObjectCodec(new GlyphInfo());
    glyphInfoCodec.decode = function (dec, node, into) {
      const glyphData = new GlyphInfo();
      const meta = node;
      if (meta != null) {
        for (let i = 0; i < meta.attributes.length; i++) {
          const attrib = meta.attributes[i];
          if (attrib.specified == true && attrib.name != 'as') {
            glyphData[attrib.name] = attrib.value;
          }
        }
      }
      return glyphData;
    }
    glyphInfoCodec.encode = function (enc, object) {
      return object.encode(enc);
    }
    mx.mxCodecRegistry.register(glyphInfoCodec);
    window['GlyphInfo'] = GlyphInfo;

    // Interaction info encode/decode
    Object.defineProperty(InteractionInfo, "name", { configurable: true, value: "InteractionInfo" });
    const interactionInfoCodec = new mx.mxObjectCodec(new InteractionInfo());
    interactionInfoCodec.decode = function (dec, node, into) {
      const interactionData = new InteractionInfo();
      const meta = node;
      if (meta != null) {
        for (let i = 0; i < meta.attributes.length; i++) {
          const attrib = meta.attributes[i];
          if (attrib.specified == true && attrib.name != 'as') {
            interactionData[attrib.name] = attrib.value;
          }
        }
      }
      return interactionData;
    }
    interactionInfoCodec.encode = function (enc, object) {
      return object.encode(enc);
    }
    mx.mxCodecRegistry.register(interactionInfoCodec);
    window['InteractionInfo'] = InteractionInfo;

    // For circuitContainers, the order of the children matters.
    // We want it to match the order of the children's geometries
    const defaultDecodeCell = mx.mxCodec.prototype.decodeCell;
    mx.mxCodec.prototype.decodeCell = function (node, restoreStructures) {
      const cell = defaultDecodeCell.apply(this, arguments);

      // reconstruct the cell style
      if(cell && cell.id > 1 && (cell.style == null || cell.style.length == 0)){
        anyForeignCellsFound = true;
        if(cell.data instanceof GlyphInfo){
          if(cell.data.partType === 'DNA region'){
            // sequence feature
            cell.style = sequenceFeatureGlyphBaseStyleName+cell.data.partRole;
            cell.geometry.width = sequenceFeatureGlyphWidth;
            cell.geometry.height = sequenceFeatureGlyphHeight;
            cell.setCollapsed(true);
          }else{
            // molecular species
            cell.style = molecularSpeciesGlyphBaseStyleName+"macromolecule";
            cell.geometry.width = molecularSpeciesGlyphWidth;
            cell.geometry.height = molecularSpeciesGlyphHeight;
          }
        }else if(cell.data instanceof InteractionInfo){
          // interaction
          let name = cell.data.interactionType;
          if (name == "Biochemical Reaction" || name == "Non-Covalent Binding" || name == "Genetic Production") {
            name = "Process";
          }
          cell.style = interactionGlyphBaseStyleName+name;
        }
      }

      if (cell && cell.isSequenceFeatureGlyph()) {
        cell.parent.children.sort(function (cellA, cellB) {
          return cellA.getGeometry().x - cellB.getGeometry().x;
        });
      }
      return cell;
    }
  }

  /**
   * Gives mxCells new methods related to our circuit/backbone rules
   */
  initExtraCellMethods() {

    mx.mxCell.prototype.isStyle = function (styleName) {
      if (!this.style)
        return false;
      return this.style.includes(styleName);
    };

    mx.mxCell.prototype.isBackbone = function () {
      return this.isStyle(backboneStyleName);
    };

    mx.mxCell.prototype.isMolecularSpeciesGlyph = function () {
      return this.isStyle(molecularSpeciesGlyphBaseStyleName);
    };

    mx.mxCell.prototype.isCircuitContainer = function () {
      return this.isStyle(circuitContainerStyleName);
    };

    mx.mxCell.prototype.isSequenceFeatureGlyph = function () {
      return this.isStyle(sequenceFeatureGlyphBaseStyleName);
    };

    mx.mxCell.prototype.isScar = function () {
      return this.isStyle(scarStyleName);
    };

    mx.mxCell.prototype.isInteraction = function () {
      return this.isStyle(interactionGlyphBaseStyleName);
    }

    /**
     * Returns the id of the cell's highest ancestor
     * (or the cell's own id if it has no parent)
     */
    mx.mxCell.prototype.getRootId = function () {
      if (this.parent.parent.parent) {
        return this.parent.getRootId();
      } else {
        return this.getId();
      }
    }

    /**
     * Returns the backbone associated with this cell
     */
    mx.mxCell.prototype.getBackbone = function () {
      if (this.isSequenceFeatureGlyph()) {
        return this.getCircuitContainer().getBackbone();
      } else if (this.isBackbone()) {
        return this;
      } else if (!this.isCircuitContainer()) {
        return null;
      }

      for (let i = 0; i < this.children.length; i++) {
        if (this.children[i].isBackbone()) {
          return this.children[i]
        }
      }

      console.error("getBackbone(): No backbone found in circuit container!");
      return null;
    };

    mx.mxCell.prototype.getSequenceFeatureGlyph = function () {
      if (this.isSequenceFeatureGlyph()) {
        return this;
      }
      else if (this.isBackbone()) {
        return this.getParent().getSequenceFeatureGlyph();
      }
      else if (this.isCircuitContainer()) {
        if (this.getParent().isSequenceFeatureGlyph()) {
          return this.getParent();
        } else {
          // top level circuitContainers have no containing sequenceFeatureGlyph
          return null;
        }
      }

      return null;
    };

    /**
     * Positions and sizes the backbone associated with this cell
     */
    mx.mxCell.prototype.refreshBackbone = function (graph) {
      if (this.isBackbone()) {
        this.getCircuitContainer().refreshBackbone(graph);
        return;
      } else if (!this.isCircuitContainer()) {
        console.error("refreshBackbone: called on an invalid cell!");
        return;
      }
      // NOTE: 'this' is the circuitContainer, not the backbone
      // (for easier access to the list of glyphs)

      // width:
      let width = 0;
      for (let i = 0; i < this.children.length; i++) {
        if (this.children[i].isSequenceFeatureGlyph()) {
          width += this.children[i].getGeometry().width;
        }
      }
      if (width < sequenceFeatureGlyphWidth) {
        width = sequenceFeatureGlyphWidth;
      }

      // Shape is a line, not rectangle, so any non-zero height is fine
      let height = 1;

      this.getBackbone().replaceGeometry('auto', sequenceFeatureGlyphHeight / 2, width, height, graph);
    };

    mx.mxCell.prototype.refreshSequenceFeature = function (graph) {
      if (!this.isSequenceFeatureGlyph()) {
        console.error("refreshSequenceFeature: called on an invalid cell!");
        return;
      }

      // format our child circuitContainer (width, height, subcomponents)
      this.getCircuitContainer(graph).refreshCircuitContainer(graph);
    };

    /**
     * (Re)positions the glyphs inside the circuitContainer and
     * also refreshes the backbone.
     */
    mx.mxCell.prototype.refreshCircuitContainer = function (graph) {
      if (!this.isCircuitContainer()) {
        console.error("refreshCircuitContainer: called on an invalid cell!");
        return;
      }

      // Refresh all children sequence features
      for (let child of this.children) {
        if (child.isSequenceFeatureGlyph()) {
          child.refreshSequenceFeature(graph);
        }
      }

      // refresh backbone (width, height)
      this.refreshBackbone(graph);

      // verify own width, height
      this.replaceGeometry(
        'auto', 'auto', this.getBackbone().getGeometry().width, sequenceFeatureGlyphHeight, graph);

      // put the backbone first in the children array so it is drawn before glyphs
      // (meaning it appears behind them)
      if (!this.children[0].isBackbone())
        graph.getModel().add(this, this.getBackbone(), 0);

      // Layout all the glyphs in a horizontal line, while ignoring the backbone cell.
      const layout = new mx.mxStackLayout(graph, true);
      layout.resizeParent = true;
      layout.isVertexIgnored = function (vertex) {
        return vertex.isBackbone()
      };
      layout.execute(this);
    };

    /**
     * Returns the circuit container associated with this cell.
     */
    mx.mxCell.prototype.getCircuitContainer = function (graph) {
      if (this.isSequenceFeatureGlyph()) {
        const children = graph.getModel().getCell(this.value).children;
        for (let child of children) {
          if (child.isCircuitContainer()) {
            return child;
          }
        }
      } else if (this.isCircuitContainer()) {
        return this;
      } else if (this.isBackbone()) {
        return this.getParent();
      }

      return null;
    };

    /**
     * Replaces this cell's geometry in an undo friendly way
     * 'graph' must be a reference to the graph
     *
     * For any other value, pass the string 'auto' to use the
     * previous geometry's value.
     *
     * It is not necessary to wrap this in (begin/end)Update() calls.
     */
    mx.mxCell.prototype.replaceGeometry = function (x, y, width, height, graph) {
      const oldGeo = this.getGeometry();
      const newGeo = new mx.mxGeometry(oldGeo.x, oldGeo.y, oldGeo.width, oldGeo.height);

      if (x !== 'auto') {
        newGeo.x = x;
      }
      if (y !== 'auto') {
        newGeo.y = y;
      }
      if (width !== 'auto') {
        newGeo.width = width;
      }
      if (height !== 'auto') {
        newGeo.height = height;
      }

      // to save entries on undo stack, don't call setGeometry unless necessary
      if (oldGeo.x === newGeo.x && oldGeo.y === newGeo.y
        && oldGeo.width === newGeo.width && oldGeo.height === newGeo.height) {
        return;
      }

      graph.getModel().setGeometry(this, newGeo);
    };
  }

  /**
   * Sets up rules for circuits' grouping/selection behavior
   */
  initGroupingRules() {
    // Cells can be moved outside their parent's bounding box without being disowned
    mx.mxGraphHandler.prototype.setRemoveCellsFromParent(false);
    mx.mxGraph.prototype.setConstrainChildren(false);

    /**
     * Never act as though the backbone cell was clicked.
     * If it was, act like the circuitContainer was clicked instead.
     */
    const defaultGetInitialCellForEvent = mx.mxGraphHandler.prototype.getInitialCellForEvent;
    mx.mxGraphHandler.prototype.getInitialCellForEvent = function (me) {
      let cell = defaultGetInitialCellForEvent.apply(this, arguments);
      if (cell.isBackbone()) {
        cell = cell.getCircuitContainer();
      }
      return cell;
    }

    /**
     * For some reason, the above method doesn't work with alt-clicking.
     * This method covers that case.
     */
    const defaultSelectCellForEvent = mx.mxGraph.prototype.selectCellForEvent;
    mx.mxGraph.prototype.selectCellForEvent = function (cell, evt) {
      if (cell.isBackbone())
        cell = cell.getParent();

      defaultSelectCellForEvent.apply(this, [cell, evt]);
    };

    /**
     * Some methods of selecting cells don't involve clicking directly
     * on the cell at all (for example rubberband selection).
     * This to guarantees the backbone can never be selected, no matter what.
     *
     * (The previous two methods are still necessary, or clicking on the
     * backbone would select nothing, instead of passing the click
     * event up to the circuitContainer.)
     */
    mx.mxGraph.prototype.isCellSelectable = function (cell) {
      return !cell.isBackbone();
    }
  }

  /**
   * Sets up all the constant styles used by the graph.
   *
   * Can only be called before this.graph is initialized
   */
  initStyles() {
    // Main glyph settings. These are applied to sequence feature glyphs and molecular species glyphs
    this.baseMolecularSpeciesGlyphStyle = {};
    this.baseMolecularSpeciesGlyphStyle[mx.mxConstants.STYLE_FILLCOLOR] = '#ffffff';
    this.baseMolecularSpeciesGlyphStyle[mx.mxConstants.STYLE_STROKECOLOR] = '#000000';
    this.baseMolecularSpeciesGlyphStyle[mx.mxConstants.STYLE_NOLABEL] = true;
    this.baseMolecularSpeciesGlyphStyle[mx.mxConstants.STYLE_EDITABLE] = false;
    this.baseMolecularSpeciesGlyphStyle[mx.mxConstants.STYLE_RESIZABLE] = 0;
    this.baseMolecularSpeciesGlyphStyle[mx.mxConstants.STYLE_ROTATION] = 0;
    this.baseMolecularSpeciesGlyphStyle[mx.mxConstants.STYLE_STROKEWIDTH] = 2;
    //this.baseGlyphStyle[mx.mxConstants.DEFAULT_HOTSPOT] = 0;

    // Sequence features need almost the same styling as molecularSpecies
    this.baseSequenceFeatureGlyphStyle = mx.mxUtils.clone(this.baseMolecularSpeciesGlyphStyle);
    this.baseSequenceFeatureGlyphStyle[mx.mxConstants.STYLE_PORT_CONSTRAINT] = [mx.mxConstants.DIRECTION_NORTH, mx.mxConstants.DIRECTION_SOUTH];


    const textBoxStyle = {};
    textBoxStyle[mx.mxConstants.STYLE_SHAPE] = mx.mxConstants.SHAPE_LABEL;
    textBoxStyle[mx.mxConstants.STYLE_FILLCOLOR] = '#ffffff';
    textBoxStyle[mx.mxConstants.STYLE_STROKECOLOR] = '#000000';
    textBoxStyle[mx.mxConstants.STYLE_FONTCOLOR] = '#000000';
    this.graph.getStylesheet().putCellStyle(textboxStyleName, textBoxStyle);

    const circuitContainerStyle = {};
    circuitContainerStyle[mx.mxConstants.STYLE_SHAPE] = mx.mxConstants.SHAPE_RECTANGLE;
    circuitContainerStyle[mx.mxConstants.STYLE_STROKECOLOR] = 'none';
    circuitContainerStyle[mx.mxConstants.STYLE_FILLCOLOR] = 'none';
    circuitContainerStyle[mx.mxConstants.STYLE_RESIZABLE] = 0;
    circuitContainerStyle[mx.mxConstants.STYLE_EDITABLE] = false;
    circuitContainerStyle[mx.mxConstants.STYLE_PORT_CONSTRAINT] = [mx.mxConstants.DIRECTION_NORTH, mx.mxConstants.DIRECTION_SOUTH];
    this.graph.getStylesheet().putCellStyle(circuitContainerStyleName, circuitContainerStyle);

    const backboneStyle = {};
    backboneStyle[mx.mxConstants.STYLE_SHAPE] = mx.mxConstants.SHAPE_LINE;
    backboneStyle[mx.mxConstants.STYLE_STROKECOLOR] = '#000000';
    backboneStyle[mx.mxConstants.STYLE_STROKEWIDTH] = 2;
    backboneStyle[mx.mxConstants.STYLE_RESIZABLE] = 0;
    backboneStyle[mx.mxConstants.STYLE_EDITABLE] = false;
    this.graph.getStylesheet().putCellStyle(backboneStyleName, backboneStyle);

    // Interaction styles
    const baseInteractionGlyphStyle = {};
    baseInteractionGlyphStyle[mx.mxConstants.STYLE_STROKEWIDTH] = 2;
    baseInteractionGlyphStyle[mx.mxConstants.STYLE_ENDSIZE] = 10;
    baseInteractionGlyphStyle[mx.mxConstants.STYLE_STROKECOLOR] = '#000000';
    baseInteractionGlyphStyle[mx.mxConstants.STYLE_FILLCOLOR] = '#000000';
    baseInteractionGlyphStyle[mx.mxConstants.STYLE_EDITABLE] = false;
    baseInteractionGlyphStyle[mx.mxConstants.STYLE_EDGE] = mx.mxConstants.EDGESTYLE_ORTHOGONAL;
    baseInteractionGlyphStyle[mx.mxConstants.STYLE_ENDFILL] = 0;

    const interactionControlStyle = mx.mxUtils.clone(baseInteractionGlyphStyle); // Inherit from the interaction defaults.
    interactionControlStyle[mx.mxConstants.STYLE_ENDARROW] = mx.mxConstants.ARROW_DIAMOND;
    this.graph.getStylesheet().putCellStyle(interactionGlyphBaseStyleName + interactionControlName, interactionControlStyle);

    const interactionInhibitionStyle = mx.mxUtils.clone(baseInteractionGlyphStyle);
    interactionInhibitionStyle[mx.mxConstants.STYLE_ENDARROW] = interactionInhibitionName;
    interactionInhibitionStyle[mx.mxConstants.STYLE_ENDSIZE] = 15;
    this.graph.getStylesheet().putCellStyle(interactionGlyphBaseStyleName + interactionInhibitionName, interactionInhibitionStyle);

    const interactionStimulationStyle = mx.mxUtils.clone(baseInteractionGlyphStyle);
    interactionStimulationStyle[mx.mxConstants.STYLE_ENDARROW] = mx.mxConstants.ARROW_BLOCK;
    this.graph.getStylesheet().putCellStyle(interactionGlyphBaseStyleName + interactionStimulationName, interactionStimulationStyle);

    const interactionProcessStyle = mx.mxUtils.clone(baseInteractionGlyphStyle);
    interactionProcessStyle[mx.mxConstants.STYLE_ENDARROW] = mx.mxConstants.ARROW_BLOCK;
    interactionProcessStyle[mx.mxConstants.STYLE_ENDFILL] = 1;
    this.graph.getStylesheet().putCellStyle(interactionGlyphBaseStyleName + interactionProcessName, interactionProcessStyle);

    const interactionDegradationStyle = mx.mxUtils.clone(baseInteractionGlyphStyle);
    interactionDegradationStyle[mx.mxConstants.STYLE_ENDARROW] = interactionDegradationName;
    interactionDegradationStyle[mx.mxConstants.STYLE_ENDSIZE] = 20;
    this.graph.getStylesheet().putCellStyle(interactionGlyphBaseStyleName + interactionDegradationName, interactionDegradationStyle);
  }

  /**
   * Loads glyph stencils and their names from the glyphService, and
   * saves them to mxGraph's shape registry
   */
  initCustomShapes() {

    let stencils = this.glyphService.getSequenceFeatureGlyphs();

    for (const name in stencils) {
      // Create a new copy of the stencil for the graph.
      const stencil = stencils[name][0];
      const centered = stencils[name][1];
      let customStencil = new mx.mxStencil(stencil.desc); // Makes a deep copy

      // Change the copied stencil for mxgraph
      let origDrawShape = mx.mxStencil.prototype.drawShape;

      if (centered) {
        customStencil.drawShape = function (canvas, shape, x, y, w, h) {
          h /= 2;
          y += h / 2;
          origDrawShape.apply(this, [canvas, shape, x, y, w, h]);
        }
      } else {
        customStencil.drawShape = function (canvas, shape, x, y, w, h) {
          h = h / 2;
          origDrawShape.apply(this, [canvas, shape, x, y, w, h]);
        }
      }

      // Add the stencil to the registry and set its style.
      mx.mxStencilRegistry.addStencil(name, customStencil);

      const newGlyphStyle = mx.mxUtils.clone(this.baseSequenceFeatureGlyphStyle);
      newGlyphStyle[mx.mxConstants.STYLE_SHAPE] = name;
      this.graph.getStylesheet().putCellStyle(sequenceFeatureGlyphBaseStyleName + name, newGlyphStyle);
    }

    // molecularSpecies glyphs are simpler, since we don't have to morph
    // them to always be centred on the strand
    stencils = this.glyphService.getMolecularSpeciesGlyphs();
    for (const name in stencils) {
      const stencil = stencils[name][0];
      let customStencil = new mx.mxStencil(stencil.desc); // Makes of deep copy of the stencil.
      mx.mxStencilRegistry.addStencil(name, customStencil);

      const newGlyphStyle = mx.mxUtils.clone(this.baseMolecularSpeciesGlyphStyle);
      newGlyphStyle[mx.mxConstants.STYLE_SHAPE] = name;
      this.graph.getStylesheet().putCellStyle(molecularSpeciesGlyphBaseStyleName + name, newGlyphStyle);
    }

    // *** Define custom markers for edge endpoints ***

    /**
     * Returns a function that draws an Inhibition glyph
     * @param endPoint The connection's endpoint (ie the coordinate of the anchor it's attached to)
     * @param unitX The x part of a vector specifying the connection's direction
     * @param unitY The y part of a vector specifying the connection's direction
     * @param size The size of the connection head, directly from the connection's style
     * @param source Boolean, true if this is the source endpoint, false if it is the terminal endpoint
     * @param sw The stroke width
     * @param filled Boolean, false if the connection head should have any transparency in the middle, true otherwise
     */
    let inhibitionMarkerDrawFunction = function (canvas, shape, type, endPoint, unitX, unitY, size, source, sw, filled) {
      return function () {
        canvas.begin();
        canvas.moveTo(endPoint.x + (unitY * (size + sw) / 2), endPoint.y - (unitX * (size + sw) / 2));
        canvas.lineTo(endPoint.x - (unitY * (size + sw) / 2), endPoint.y + (unitX * (size + sw) / 2));
        canvas.stroke();
      };
    };
    mx.mxMarker.addMarker(interactionInhibitionName, inhibitionMarkerDrawFunction);

    /**
     * Returns a function that draws a Process glyph
     */
    let degradationMarkerDrawFunction = function (canvas, shape, type, endPoint, unitX, unitY, size, source, sw, filled) {
      const triangleTipX = endPoint.x - (unitX * (size + sw) / 2);
      const triangleTipY = endPoint.y - (unitY * (size + sw) / 2);

      const circleCenterX = endPoint.x - (unitX * size / 4);
      const circleCenterY = endPoint.y - (unitY * size / 4);

      const root2over2 = Math.sin(Math.PI / 4);

      // Changing the parameter controls how far the connection's stem is drawn
      endPoint.x = triangleTipX;
      endPoint.y = triangleTipY;

      return function () {

        // CIRCLE
        canvas.ellipse(circleCenterX - size / 4, circleCenterY - size / 4, size / 2, size / 2);
        canvas.stroke();

        // TRIANGLE
        canvas.begin();
        canvas.moveTo(triangleTipX, triangleTipY);
        canvas.lineTo(triangleTipX - (unitY * size / 4) - (unitX * size / 2), triangleTipY + (unitX * size / 4) - (unitY * size / 2));
        canvas.lineTo(triangleTipX + (unitY * size / 4) - (unitX * size / 2), triangleTipY - (unitX * size / 4) - (unitY * size / 2));
        canvas.close();
        canvas.fillAndStroke();

        // SLASH (line through the circle)
        canvas.begin();
        canvas.moveTo(circleCenterX + root2over2 * size / 4, circleCenterY - root2over2 * size / 4);
        canvas.lineTo(circleCenterX - root2over2 * size / 4, circleCenterY + root2over2 * size / 4);
        canvas.stroke();
        // This code makes the line rotate, but it makes more sense to always slash the same way
        // canvas.moveTo(circleCenterX + (unitY * root2over2 * size / 4) + (unitX * root2over2 * size / 4),
        //   circleCenterY - (unitX * root2over2 * size / 4) + (unitY * root2over2 * size / 4));
        // canvas.lineTo(circleCenterX - (unitX * root2over2 * size / 4) - (unitY * root2over2 * size / 4),
        //   circleCenterY + (unitX * root2over2 * size / 4) - (unitY * root2over2 * size / 4));
      };
    };
    mx.mxMarker.addMarker(interactionDegradationName, degradationMarkerDrawFunction);

  }

  /**
   * Sets up logic for handling sequenceFeatureGlyph movement
   */
  initSequenceFeatureGlyphMovement() {
    this.graph.addListener(mx.mxEvent.MOVE_CELLS, mx.mxUtils.bind(this, function (sender, evt) {
      // sender is the graph

      let movedCells = evt.getProperty("cells");
      // important note: if a parent cell is moving, none of its children
      // can appear here (even if they were also selected)

      // sort cells: processing order is important
      movedCells = movedCells.sort(function (cellA, cellB) {
        if (cellA.getRootId() !== cellB.getRootId()) {
          // cells are not related: choose arbitrary order (but still group by root)
          return cellA.getRootId() < cellB.getRootId() ? -1 : 1;
        } else {
          // cells are in the same circuitContainer:
          // must be in sequence order
          let aIndex = cellA.getCircuitContainer().getIndex(cellA);
          let bIndex = cellB.getCircuitContainer().getIndex(cellB);

          return aIndex - bIndex;
        }
      });

      // If two adjacent sequenceFeatureGlyphs were moved, they should be adjacent after the move.
      // This loop finds all such sets of glyphs (relying on the sorted order) and sets them to
      // have the same x position so there is no chance of outside glyphs sneaking in between
      let streak;
      for (let i = 0; i < movedCells.length; i += streak) {
        streak = 1;
        if (!movedCells[i].isSequenceFeatureGlyph()) {
          continue;
        }
        // found a sequenceFeature glyph. A streak might be starting...
        const baseX = movedCells[i].getGeometry().x;
        const rootId = movedCells[i].getRootId();
        let streakWidth = movedCells[i].getGeometry().width;

        while (i + streak < movedCells.length
          && movedCells[i + streak].isSequenceFeatureGlyph()
          && rootId === movedCells[i + streak].getRootId()) {
          let xToContinueStreak = baseX + streakWidth;
          if (xToContinueStreak === movedCells[i + streak].getGeometry().x) {
            // The next cell continues the streak
            movedCells[i + streak].replaceGeometry(baseX, 'auto', 'auto', 'auto', sender);

            streakWidth += movedCells[i + streak].getGeometry().width;
            streak++;
          } else {
            // the next cell breaks the streak
            break;
          }
        }
      }

      // now all sequence feature glyphs are sorted by x position in the order
      // they should be when the move finishes.
      // (equal x position means they should stay in the order they were previously in)
      let cells = sender.getChildVertices(sender.getDefaultParent());
      for (let circuitContainer of cells.filter(cell => cell.isCircuitContainer())) {
        this.horizontalSortBasedOnPosition(circuitContainer);
      }

      // finallly, another special case: if a circuitContainer only has one sequenceFeatureGlyph,
      // moving the glyph should move the circuitContainer
      for (const cell of movedCells) {
        if (cell.isSequenceFeatureGlyph() && cell.getParent().children.length === 2) {
          const x = cell.getParent().getGeometry().x + evt.getProperty("dx");
          const y = cell.getParent().getGeometry().y + evt.getProperty("dy");
          cell.getParent().replaceGeometry(x, y, 'auto', 'auto', sender);
        }
      }

      evt.consume();
    }));
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
