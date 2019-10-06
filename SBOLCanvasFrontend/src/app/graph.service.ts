/*
 * GraphService
 *
 * This service controls the main editing canvas
 */

import {Injectable} from '@angular/core';
import * as mxEditor from 'mxgraph';
import * as mxGraph from 'mxgraph';
import * as mxDragSource from 'mxgraph';
import * as mxCell from 'mxgraph';
import {GlyphInfo} from './glyphInfo';
import {MetadataService} from './metadata.service';
import {GlyphService} from './glyph.service';
import {forEach} from "@angular/router/src/utils/collection";

declare var require: any;
const mx = require('mxgraph')({
  mxImageBasePath: 'mxgraph/images',
  mxBasePath: 'mxgraph'
});

// Constants
const sequenceFeatureGlyphWidth   = 50;
const sequenceFeatureGlyphHeight  = 100;

const molecularSpeciesGlyphWidth  = 50;
const molecularSpeciesGlyphHeight = 50;

const defaultTextWidth            = 120;
const defaultTextHeight           = 80;

const circuitContainerStyleName           = 'circuitContainer';
const backboneStyleName                   = 'backbone';
const textboxStyleName                    = 'textBox';
const scarStyleName                       = 'Scar (Assembly Scar)';
const sequenceFeatureGlyphBaseStyleName   = 'sequenceFeatureGlyph';
const molecularSpeciesGlyphBaseStyleName  = 'molecularSpeciesGlyph';

@Injectable({
  providedIn: 'root'
})
export class GraphService {

  graph: mxGraph;
  editor: mxEditor;
  graphContainer: HTMLElement;
  glyphDragPreviewElt: HTMLElement;
  textBoxDragPreviewElt: HTMLElement;

  // string[0] is the XML representing an mxGraph model. string[1] is the ID of the cell
  // that was zoomed in on when the 'frame' was created.
  zoomStack: Array<[string, string]>;

  // Boolean for keeping track of whether we are showing scars or not in the graph.
  showingScars: boolean;

  baseGlyphStyle: any;
  collapsedGlyphStyle: any;

  constructor(private metadataService: MetadataService, private glyphService: GlyphService) {
    this.zoomStack = new Array<[string, string]>();
    this.showingScars = true;

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

    mx.mxGraphHandler.prototype.guidesEnabled = true;

    mx.mxShape.prototype.svgStrokeTolerance = 20;

    // mxEditor is kind of a parent to mxGraph
    // it's used mainly for 'actions', which for now means delete, later will mean undoing
    this.editor = new mx.mxEditor();
    this.graph = this.editor.graph;
    this.editor.setGraphContainer(this.graphContainer);

    this.graph.setConnectable(true);
    this.graph.setAllowDanglingEdges(false);
    this.graph.setCellsCloneable(false);

    // Enables rubberband selection
    // tslint:disable-next-line:no-unused-expression
    new mx.mxRubberband(this.graph);

    // Sets the graph container and configures the editor

    // without this, an option appears to collapse glyphs, which hides their ports
    this.graph.isCellFoldable = function(cell) {
      return false;
    };

    // Add event listeners to the graph. NOTE: MUST USE THE '=>' WAY FOR THIS TO WORK.
    // Doing it this way enables the function to keep accessing 'this' from inside.
    this.graph.getSelectionModel().addListener(mx.mxEvent.CHANGE, (sender, event) => this.handleSelectionChange(sender, event));

    this.initStyles();
    this.initCustomShapes();
    this.initSequenceFeatureGlyphMovement();
  }

  handleSelectionChange(sender, evt) {

    // Cells that are being removed from the selection.
    // No idea why it is backwards...
    var cellsRemoved = evt.getProperty('added');
    var cellsAdded = evt.getProperty('removed');

    console.debug("----handleSelectionChange-----");

    console.debug("cells removed: ");
    if (cellsRemoved) {
      for (var i = 0; i < cellsRemoved.length; i++) {
        console.debug(cellsRemoved[i]);
      }
    }

    // Cells that are being added to the selection.
    console.debug("cells added: ");
    if (cellsAdded) {
      for (var i = 0; i < cellsAdded.length; i++) {
        console.debug(cellsAdded[i]);
      }
    }

    this.updateAngularMetadata(cellsAdded);
  }

  /**
   * Updates the data in the metadata service according to the cells properties
   */
  updateAngularMetadata(cells) {

    if (cells == null) {
      this.nullifyMetadata();
      return;
    }
    // If we're only selecting one cell, then we can
    // show some info about it.
    if (cells.length < 1) {
      // Null the info out
      this.nullifyMetadata()
    }
    else if (cells.length == 1) { // If there is only one cell selected
      let cell = cells[0];

      if (cell.isSequenceFeatureGlyph()) { // If it's a sequence feature.

        let color = this.graph.getCellStyle(cell)['strokeColor'];
        this.metadataService.setColor(color);

        const glyphInfo = cell.getGlyphMetadata();
        if(glyphInfo) {
          this.metadataService.setSelectedGlyphInfo(glyphInfo.makeCopy());
        } else {
          this.metadataService.setSelectedGlyphInfo(null);
        }

      }
      else { // Not a glyph
        this.nullifyMetadata()
      }
    }
    else { // We have some group selection going on here...
      this.nullifyMetadata()
    }
  }

  nullifyMetadata() {
    this.metadataService.setColor(null);
    this.metadataService.setSelectedGlyphInfo(null);
  }

  addInteraction() {

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
    try {
      this.graph.getModel().beginUpdate()
      let selectionCells = this.graph.getSelectionCells();
      let circuitContainer = selectionCells[0].getCircuitContainer();
      let children = circuitContainer.children;
      for (let i = 0; i < children.length; i++) {
        if (children[i].isScar()) {
          console.debug("scar found");
          let child = children[i];
          const geo = new mx.mxGeometry(0,0,0,0);
          geo.x = 0;
          geo.y = 0;
          geo.height = sequenceFeatureGlyphHeight;

          if (this.showingScars) {
            geo.width = sequenceFeatureGlyphWidth;
          }
          else {
            geo.width = 0;
          }
          this.graph.getModel().setGeometry(child,geo);
        }
      }
      circuitContainer.refreshCircuitContainer(this.graph)
    } finally {
      this.graph.getModel().endUpdate();
    }
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
   * 'Zooms in' to view the component definition of the currently selected glyph.
   * This changes which component definition is displayed on the canvas,
   * not the canvas's scale.
   */
  zoom() {
    let selectionCells = this.graph.getSelectionCells();

    // If we have a single sequence feature glyph selected, zoom in on it. Otherwise do nothing.
    if (selectionCells.length == 1) {
      if (selectionCells[0].isSequenceFeatureGlyph()) {
        this.zoomStack.push([this.getModelXML(), selectionCells[0].getId()]);
        this.setModelWithXML(selectionCells[0].data.model);

        // We have to do a few things here. Since component definitions can only have 1
        // DNA strand, we must drop a new DNA backbone if there is not one.
        // We also have to notify the metadata service that we are now in component definition
        // mode.

        // Now that we are in a new model, lets check if we have a circuit container yet.
        if (!this.modelHasAtLeastOneCircuitContainer()) {
          this.addNewBackbone();
        }

        // Now we notify the metadata service that we are in component definition mode. The
        // metadata service will then notify the UI components so they can disable certain
        // features.
        this.metadataService.setComponentDefinitionMode(true);
      }
    }

    // Making undos work with zooming would be hard, for now just nuke undo stack
    this.editor.undoManager.clear();
  }

  /**
   * 'Zooms out' to view a higher level of the sbol document.
   * This changes which component definition is displayed on the canvas,
   * not the canvas's scale.
   */
  unzoom() {

    // If we are not at the top level, then we pop the frame stack.
    if (this.zoomStack.length > 0) {
      let newFrame = this.zoomStack.pop();

      // If we are now at the top of the frame stack. This means we are no longer
      // in component definition mode, so we need to notify the metadata service
      // so it can notify the UI components.
      if (this.zoomStack.length == 0) {
        this.metadataService.setComponentDefinitionMode(false);
      }

      let oldFrame = this.getModelXML();
      this.setModelWithXML(newFrame[0]);
      let selectedCell = this.graph.getModel().getCell(newFrame[1]);
      selectedCell.data.model = oldFrame;

      const selMod = this.graph.getSelectionModel();
      selMod.clear();
      selMod.addCell(selectedCell);
    }

    // Making undos work with zooming would be hard, for now just nuke undo stack
    this.editor.undoManager.clear();
  }

  /**
   * This checks if there is a circuit container in the current graph model.
   * This tells us whether there is a component definition already present.
   */
  modelHasAtLeastOneCircuitContainer(): boolean {
    let cells = this.graph.getChildVertices(this.graph.getDefaultParent());

    for (let i = 0; i < cells.length; i++) {
      if (cells[i].isCircuitContainer()) {
        return true;
      }
    }

    return false;
  }

  addNewBackbone() {
    this.graph.getModel().beginUpdate();
    try {
      const circuitContainer = this.graph.insertVertex(this.graph.getDefaultParent(), null, '', 0, 0, sequenceFeatureGlyphWidth, sequenceFeatureGlyphHeight, circuitContainerStyleName);
      const backbone = this.graph.insertVertex(circuitContainer, null, '', 0, sequenceFeatureGlyphHeight/2, sequenceFeatureGlyphWidth, 1, backboneStyleName);

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
    this.graph.getModel().beginUpdate();
    try {
      const selectedCells = this.graph.getSelectionCells();
      let circuitContainers = [];
      for (let cell of selectedCells) {
        if (cell.isSequenceFeatureGlyph())
          circuitContainers.push(cell.getCircuitContainer());
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
   * Undoes the most recent changes encapsulated by a begin/end update
   */
  undo() {
    this.editor.execute('undo');
  }

  /**
   * Redoes the most recent changes encapsulated by a begin/end update
   */
  redo() {
    this.editor.execute('redo');
  }

  /**
   * Drops a new glyph onto the selected backbone
   */
  addSequenceFeatureGlyph(name) {
    // Don't do anything if it is a scar and were not showing them.
    if (name.includes(scarStyleName) && !this.showingScars) { this.toggleScars(); }

    let circuitContainer = this.getSelectionContainer();
    if (circuitContainer != null) {
      this.graph.getModel().beginUpdate();
      try {
        // Insert new glyph
        const glyphCell = this.graph.insertVertex(circuitContainer, null, '', 0, 0,
          sequenceFeatureGlyphWidth, sequenceFeatureGlyphHeight, sequenceFeatureGlyphBaseStyleName + name);
        glyphCell.data = new GlyphInfo();
        glyphCell.data.partRole = name;
        glyphCell.setConnectable(false);

        circuitContainer.refreshCircuitContainer(this.graph);

        // The new glyph should be selected
        this.graph.clearSelection();
        this.graph.setSelectionCell(glyphCell);
      } finally {
        this.graph.getModel().endUpdate();
      }
    }
  }

  /**
   * Drops a new floating element on the canvas
   */
  addMolecularSpeciesGlyph(name) {
    this.graph.getModel().beginUpdate();
    try {
      const glyphCell = this.graph.insertVertex(this.graph.getDefaultParent(), null, '', 0, 0,
        molecularSpeciesGlyphWidth, molecularSpeciesGlyphHeight, molecularSpeciesGlyphBaseStyleName + name);
      glyphCell.setConnectable(false);

      // The new glyph should be selected
      this.graph.clearSelection();
      this.graph.setSelectionCell(glyphCell);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Based on the selected cell(s) chooses a location to drop a new glyph.
   * Returns a backbone cell marking the target location.
   *
   * If there is no suitable location (for example, nothing is selected),
   * returns null.
   */
  getSelectionContainer(): any {
    // TODO smart location choice using getSelectionCells
    // but for now just let the graph choose an arbitrary one from the selection
    const selection = this.graph.getSelectionCell();

    if (selection == null) {
      return null;
    }

    if (selection.isCircuitContainer()) {
      return selection;
    }
    else if (selection.isBackbone()) {
      return selection.getParent();
    }
    else if (selection.isSequenceFeatureGlyph()) {
      return selection.getParent();
    }
    else {
      return null;
    }
  }

  /**
   * Puts a textbox in the graph's origin
   */
  addTextBox() {
    this.graph.getModel().beginUpdate();
    try {
      const cell = this.graph.insertVertex(this.graph.getDefaultParent(), null, 'Sample Text', 0, 0, defaultTextWidth, defaultTextHeight, textboxStyleName);
      cell.setConnectable(false);

      // The new cell should be selected
      this.graph.clearSelection();
      this.graph.setSelectionCell(cell);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Find the selected cell, and if there is a cell selected, update its color.
   */
  setSelectedCellColor(color: string) {
    const selectedCells = this.graph.getSelectionCells();

    // changing style of circuitContainers changes the backbone instead
    for (let i = 0; i < selectedCells.length; i++) {
      const cell = selectedCells[i];
      if (cell.isCircuitContainer()) {
        selectedCells.splice(i, 1, cell.getBackbone());
      }
    }

    if (selectedCells != null) {
      this.graph.getModel().beginUpdate();
      this.graph.setCellStyles(mx.mxConstants.STYLE_STROKECOLOR, color, selectedCells);
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Find the selected cell, and it there is a glyph selected, update its metadata.
   */
  setSelectedCellInfo(glyphInfo: GlyphInfo) {
    const selectedCell = this.graph.getSelectionCell();

    if (selectedCell != null && selectedCell.isSequenceFeatureGlyph()) {
      const cellData = selectedCell.getGlyphMetadata();
      if (cellData != null) {
        cellData.copyDataFrom(glyphInfo);
      }
    }
  }

  /**
   * Encodes the current graph (at its current "zoom layer")
   * to a string (xml) representation
   */
  getModelXML(): string {
    const encoder = new mx.mxCodec();
    const result = encoder.encode(this.graph.getModel());
    return mx.mxUtils.getXml(result);
  }

  /**
   * Decodes the given string (xml) representation of a graph
   * and uses it to replace the current graph
   */
  setModelWithXML(graphString: string) {
    // Creates the graph inside the given container
    this.graph.getModel().clear();
    const doc = mx.mxUtils.parseXml(graphString);
    const codec = new mx.mxCodec(doc);
    codec.decode(doc.documentElement, this.graph.getModel());
  }

  /**
   * Replaces the entire graph with the given xml.
   * This forgets all information of the previous diagram, including
   * "zoom layers" other than the one currently viewed
   */
  setTopLevelModelWithXML(graphString: string){
    this.zoomStack = new Array<[string, string]>();
    this.setModelWithXML(graphString);

    this.editor.undoManager.clear();
  }

  /**
   * Encodes the entire diagram, including "zoom layers" other
   * than the one currently viewed, to an xml string
   */
  getTopLevelXML(): string {
    const encoder = new mx.mxCodec();

    let model = this.graph.getModel();
    for (let i = this.zoomStack.length - 1; i >= 0; i--) {
      const xmlString = mx.mxUtils.getXml(encoder.encode(model));

      const doc = mx.mxUtils.parseXml(this.zoomStack[i][0])
      const codec = new mx.mxCodec(doc);
      model = codec.decode(doc.documentElement, model);

      let cell = model.getCell(this.zoomStack[i][1])
      cell.data.model = xmlString
    }

    return mx.mxUtils.getXml(encoder.encode(model));
  }

  /**
   * Sets up environment variables to make decoding new graph models from xml into memory
   */
  initDecodeEnv() {
    // stuff needed for decoding
    window['mxGraphModel'] = mx.mxGraphModel;
    window['mxGeometry'] = mx.mxGeometry;
    window['mxPoint'] = mx.mxPoint;
    const glyphInfoCodec = new mx.mxObjectCodec(new GlyphInfo());
    glyphInfoCodec.decode = function(dec, node, into) {
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
    };
    glyphInfoCodec.encode = function(enc, object){
      return object.encode(enc);
    }
    mx.mxCodecRegistry.register(glyphInfoCodec);
    window['GlyphInfo'] = GlyphInfo;
  }

  /**
   * Gives mxCells new methods related to our circuit/backbone rules
   */
  initExtraCellMethods() {

    mx.mxCell.prototype.isBackbone = function() {
      return this.style.includes(backboneStyleName);
    };

    mx.mxCell.prototype.isSequenceFeatureGlyph = function() {
      return this.style.includes(sequenceFeatureGlyphBaseStyleName);
    };

    mx.mxCell.prototype.isMolecularSpeciesGlyph = function() {
      return this.style.includes(molecularSpeciesGlyphBaseStyleName);
    };

    mx.mxCell.prototype.isCircuitContainer = function() {
      return this.style.includes(circuitContainerStyleName);
    };

    mx.mxCell.prototype.isScar = function() {
      return this.style.includes(scarStyleName);
    };

    /**
     * Returns the id of the cell's highest ancestor
     * (or the cell's own id if it has no parent)
     */
    mx.mxCell.prototype.getRootId = function() {
      if (this.parent.parent.parent) {
        return this.parent.getRootId();
      } else {
        return this.getId();
      }
    }

    /**
     * Returns the backbone associated with this cell
     */
    mx.mxCell.prototype.getBackbone = function() {
      if (this.isSequenceFeatureGlyph()) {
        return this.getParent().getBackbone();
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

    /**
     * Positions and sizes the backbone associated with this cell
     */
    mx.mxCell.prototype.refreshBackbone = function(graph) {
      if (this.isSequenceFeatureGlyph() || this.isBackbone()) {
        this.getParent().refreshBackbone(graph);
        return;
      } else if (!this.isCircuitContainer()) {
        console.error("refreshBackbone: called on an invalid cell!");
        return;
      }

      const backbone = this.getBackbone();

      // put it first in the children array so it is drawn before glyphs
      // (meaning it appears behind them)
      graph.getModel().add(this, backbone, 0);

      const geo = new mx.mxGeometry(0,0,0,0);
      // Paranoia
      geo.x = 0;
      geo.y = sequenceFeatureGlyphHeight / 2;
      geo.height = 1;

      // width:
      let width = 0;
      let cc = backbone.getCircuitContainer();
      let children = cc.children;
      for (let i = 0; i < children.length; i++) {
        if (children[i].isSequenceFeatureGlyph()) {
          width += children[i].getGeometry().width;
        }
      }
      if (width < sequenceFeatureGlyphWidth) {
        width = sequenceFeatureGlyphWidth;
      }
      geo.width = width;

      graph.getModel().setGeometry(backbone,geo);
    };

    /**
     * (Re)positions the glyphs inside the circuit containter and
     * also refreshes the backbone.
     */
    mx.mxCell.prototype.refreshCircuitContainer = function(graph) {
      if (this.isSequenceFeatureGlyph() || this.isBackbone()) {
        this.getParent().refreshCircuitContainer()
      } else if (!this.isCircuitContainer()) {
        console.error("refreshCircuitContainer: called on an invalid cell!");
        return;
      }

      // resize the backbone
      this.refreshBackbone(graph);

      // Layout all the glyphs in a horizontal line, while ignoring the backbone cell.
      const layout = new mx.mxStackLayout(graph, true);
      layout.resizeParent = true;
      layout.isVertexIgnored = function (vertex)
      {
        return vertex.isBackbone()
      };
      layout.execute(this);
    };

    /**
     * Returns the circuit container associated with this cell.
     */
    mx.mxCell.prototype.getCircuitContainer = function () {
      if (this.isSequenceFeatureGlyph() || this.isBackbone()) {
        return this.getParent();
      } else if (!this.isCircuitContainer()) {
        return null;
      }

      return this;
    };

    /**
     * Returns the metadata associated with this cell.
     * Usually this cell will be a glyph.
     */
    mx.mxCell.prototype.getGlyphMetadata = function() {
      if (this.isSequenceFeatureGlyph()) {
        return this.data;
      }
    }

    /**
     * This method callsRefreshCircuitContainer on every
     * circuitContainer in the graph.
     */
    mx.mxGraph.prototype.refreshAllCircuitContainers = function() {
      let cells = this.getChildVertices(this.getDefaultParent());

      for (let cell of cells) {
        if (cell.isCircuitContainer()) {
          cell.refreshCircuitContainer(this);
        }
      }
    }
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
    mx.mxGraph.prototype.selectCellForEvent = function(cell, evt)
    {
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
    mx.mxGraph.prototype.isCellSelectable = function(cell) {
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
    this.baseGlyphStyle = {};
    this.baseGlyphStyle[mx.mxConstants.STYLE_FILLCOLOR] = '#ffffff';
    this.baseGlyphStyle[mx.mxConstants.STYLE_STROKECOLOR] = '#000000';
    this.baseGlyphStyle[mx.mxConstants.STYLE_NOLABEL] = true;
    this.baseGlyphStyle[mx.mxConstants.STYLE_EDITABLE] = false;
    this.baseGlyphStyle[mx.mxConstants.STYLE_RESIZABLE] = 0;
    this.baseGlyphStyle[mx.mxConstants.STYLE_ROTATION] = 0;

    // Collapsed glyph settings.
    this.collapsedGlyphStyle = {};
    this.collapsedGlyphStyle[mx.mxConstants.STYLE_FILLCOLOR] = '#ffffff';

    // Text box settings.
    const textBoxStyle = {};
    textBoxStyle[mx.mxConstants.STYLE_SHAPE] = mx.mxConstants.SHAPE_LABEL;
    textBoxStyle[mx.mxConstants.STYLE_FILLCOLOR] = '#ffffff';
    textBoxStyle[mx.mxConstants.STYLE_STROKECOLOR] = '#000000';
    this.graph.getStylesheet().putCellStyle(textboxStyleName, textBoxStyle);

    // Circuit container settings.
    const circuitContainerStyle = {};
    circuitContainerStyle[mx.mxConstants.STYLE_SHAPE] = mx.mxConstants.SHAPE_RECTANGLE;
    circuitContainerStyle[mx.mxConstants.STYLE_STROKECOLOR] = 'none';
    circuitContainerStyle[mx.mxConstants.STYLE_FILLCOLOR] = 'none';
    circuitContainerStyle[mx.mxConstants.STYLE_RESIZABLE] = 0;
    circuitContainerStyle[mx.mxConstants.STYLE_EDITABLE] = false;
    this.graph.getStylesheet().putCellStyle(circuitContainerStyleName, circuitContainerStyle);

    // Backbone settings.
    const backboneStyle = {};
    backboneStyle[mx.mxConstants.STYLE_SHAPE] = mx.mxConstants.SHAPE_LINE;
    backboneStyle[mx.mxConstants.STYLE_STROKECOLOR] = '#000000';
    backboneStyle[mx.mxConstants.STYLE_STROKEWIDTH] = 2;
    backboneStyle[mx.mxConstants.STYLE_RESIZABLE] = 0;
    backboneStyle[mx.mxConstants.STYLE_EDITABLE] = false;
    this.graph.getStylesheet().putCellStyle(backboneStyleName, backboneStyle);

    // Edge settings.
    const style = this.graph.getStylesheet().getDefaultEdgeStyle();
    style[mx.mxConstants.STYLE_ROUNDED] = true;
    style[mx.mxConstants.STYLE_EDGE] = mx.mxEdgeStyle.ElbowConnector;
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
      let customStencil = new mx.mxStencil(stencil.desc);

      // Change the copied stencil for mxgraph
      let origDrawShape = mx.mxStencil.prototype.drawShape;

      if (centered) {
        customStencil.drawShape = function (canvas, shape, x, y, w, h) {
          h /= 2;
          y += h/2;
          origDrawShape.apply(this, [canvas, shape, x, y, w, h]);
        }
      } else {
        customStencil.drawShape = function (canvas, shape, x, y, w, h) {
          h = h/2;
          origDrawShape.apply(this, [canvas, shape, x, y, w, h]);
        }
      }

      // Add the stencil to the registry and set its style.
      mx.mxStencilRegistry.addStencil(name, customStencil);

      const newGlyphStyle = mx.mxUtils.clone(this.baseGlyphStyle);
      newGlyphStyle[mx.mxConstants.STYLE_SHAPE] = name;
      this.graph.getStylesheet().putCellStyle(sequenceFeatureGlyphBaseStyleName + name, newGlyphStyle);
    }

    // molecularSpecies glyphs are simpler, since we don't have to morph
    // them to always be centred on the strand
    stencils = this.glyphService.getMolecularSpeciesGlyphs();
    for (const name in stencils) {
      const stencil = stencils[name][0];
      let customStencil = new mx.mxStencil(stencil.desc);
      mx.mxStencilRegistry.addStencil(name, customStencil);

      const newGlyphStyle = mx.mxUtils.clone(this.baseGlyphStyle);
      newGlyphStyle[mx.mxConstants.STYLE_SHAPE] = name;
      this.graph.getStylesheet().putCellStyle(molecularSpeciesGlyphBaseStyleName + name, newGlyphStyle);
    }
  }

  /**
   * Sets up logic for handling sequenceFeatureGlyph movement
   */
  initSequenceFeatureGlyphMovement() {
    this.graph.addListener(mx.mxEvent.MOVE_CELLS, function (sender, evt) {
      // sender is the graph

      let movedCells = evt.getProperty("cells");
      // important note: if a parent cell is moving, none of its children
      // can appear here (even if they were also selected)

      // sort cells: processing order is important
      movedCells = movedCells.sort(function(cellA, cellB) {
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
      for (let i = 0; i < movedCells.length; i+=streak) {
        streak = 1;
        if (!movedCells[i].isSequenceFeatureGlyph()) {
          continue;
        }
        // found a sequenceFeature glyph. A streak might be starting...
        const baseX = movedCells[i].getGeometry().x;
        const rootId = movedCells[i].getRootId();
        let streakWidth = movedCells[i].getGeometry().width;

        while (i + streak < movedCells.length
        && movedCells[i+streak].isSequenceFeatureGlyph()
        && rootId === movedCells[i+streak].getRootId()) {
          let xToContinueStreak = baseX + streakWidth;
          if (xToContinueStreak === movedCells[i+streak].getGeometry().x) {
            // The next cell continues the streak
            const oldGeo = movedCells[i+streak].getGeometry();
            const newGeo = new mx.mxGeometry(oldGeo.x, oldGeo.y, oldGeo.width, oldGeo.height);
            newGeo.x = baseX;
            sender.getModel().setGeometry(movedCells[i+streak],newGeo);

            streakWidth += movedCells[i+streak].getGeometry().width;
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
      // So for each circuitContainer (optimized me: only do this for affected ones)...
      let cells = this.getChildVertices(this.getDefaultParent());
      for (let circuitContainer of cells.filter(cell => cell.isCircuitContainer())) {
        // ...sort the children...
        let childrenCopy = circuitContainer.children.slice();
        childrenCopy.sort(function(cellA, cellB) {
          return cellA.getGeometry().x - cellB.getGeometry().x;
        });
        // ...and have the model reflect the sort in an undoable way
        for (let i = 0; i < childrenCopy.length; i++) {
          const child = childrenCopy[i];
          sender.getModel().add(circuitContainer, child, i);
        }

        circuitContainer.refreshCircuitContainer(this);
      }

      evt.consume();
    });
  }
}
