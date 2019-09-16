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

declare var require: any;
const mx = require('mxgraph')({
  mxImageBasePath: 'mxgraph/images',
  mxBasePath: 'mxgraph'
});

// Constants
const glyphWidth = 52;
const glyphHeight = 104;

const defaultTextWidth = 120;
const defaultTextHeight = 80;

const circuitContainerStyleName = 'circuitContainer';
const backboneStyleName = 'backbone';
const textboxStyleName = 'textBox';
const glyphBaseStyleName = 'glyph';

const defaultBackboneWidth = glyphWidth;
const defaultBackboneHeight = 4;

@Injectable({
  providedIn: 'root'
})
export class GraphService {

  graph: mxGraph;
  editor: mxEditor;
  graphContainer: HTMLElement;
  glyphDragPreviewElt: HTMLElement;
  textBoxDragPreviewElt: HTMLElement;

  baseGlyphStyle: any;

  constructor(private metadataService: MetadataService, private glyphService: GlyphService) {
    // constructor code is divided into helper methods for oranization,
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

    // mxEditor is kind of a parent to mxGraph
    // it's used mainly for 'actions', which for now means delete, later will mean undoing
    this.editor = new mx.mxEditor();
    this.graph = this.editor.graph;
    this.editor.setGraphContainer(this.graphContainer);

    this.graph.setConnectable(true);
    this.graph.allowDanglingEdges = false;

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
    this.initCustomGlyphs();
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
    else if (cells.length == 1) {
      let cell = cells[0];

      if (cell.isGlyph()) {

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

  // TODO: this is code for making a dragsource (instead of a button as it is now)
  // addNewBackbone(element) {
  //
  //   // TODO: Make drag element outline have same shape as backbone.
  //   const insertGlyph = (graph, evt, target, x, y) => {
  //     // When executed, 'this' is the dragSource, not the graphService
  //
  //     graph.getModel().beginUpdate();
  //     try {
  //       const circuitContainer = graph.insertVertex(graph.getDefaultParent(), null, '', x, y, defaultBackboneWidth, glyphHeight, circuitContainerStyleName);
  //       const backbone = graph.insertVertex(circuitContainer, null, '', 0, glyphHeight/2, defaultBackboneWidth, defaultBackboneHeight, backboneStyleName);
  //
  //       backbone.refreshBackbone(graph);
  //
  //       circuitContainer.setConnectable(false);
  //       backbone.setConnectable(false);
  //       // TODO: glyphCell.data = new GlyphInfo();
  //
  //       const selection = graph.getSelectionModel();
  //       selection.clear();
  //       selection.addCell(circuitContainer);
  //     } finally {
  //       graph.getModel().endUpdate();
  //     }
  //   };
  //
  //   const ds: mxDragSource = mx.mxUtils.makeDraggable(element, this.graph, insertGlyph, this.glyphDragPreviewElt);
  //
  //   ds.isGridEnabled = function() {
  //     return this.currentGraph.graphHandler.guidesEnabled;
  //   };
  // }

  addNewBackbone() {
    this.graph.getModel().beginUpdate();
    try {
      const circuitContainer = this.graph.insertVertex(this.graph.getDefaultParent(), null, '', 0, 0, defaultBackboneWidth, glyphHeight, circuitContainerStyleName);
      const backbone = this.graph.insertVertex(circuitContainer, null, '', 0, glyphHeight/2, defaultBackboneWidth, defaultBackboneHeight, backboneStyleName);

      backbone.refreshBackbone(this.graph);

      circuitContainer.setConnectable(false);
      backbone.setConnectable(false);

      const selection = this.graph.getSelectionModel();
      selection.clear();
      selection.addCell(circuitContainer);
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
    this.editor.execute('delete');
  }

  /**
   * Undoes the most recent changes encapsulated by a begin/end update
   */
  undo() {
    this.editor.execute('undo');
    this.simplifySelection();
  }

  /**
   * Redoes the most recent changes encapsulated by a begin/end update
   */
  redo() {
    this.editor.execute('redo');
    this.simplifySelection();
  }

  /**
   * Simplifies the graph's selection model and makes sure it follows our selection rules
   * Intended for use after undo or redo
   */
  simplifySelection() {
    const messySelection = this.graph.getSelectionCells();
    const cleanSelection = [];
    for (let i = 0; i < messySelection.length; i++) {
      const cell = messySelection[i];
      const circuit = cell.getCircuitContainer();

      if (circuit == null || !cleanSelection.includes(circuit)) {
        cleanSelection.push(circuit);
      }
    }

    const selMod = this.graph.getSelectionModel();
    selMod.clear();
    selMod.addCells(cleanSelection);
  }

  /**
   * Drops a new glyph onto the selected backbone
   */
  dropNewGlyph(name) {
    let circuitContainer = this.getSelectionContainer();
    if (circuitContainer != null) {
      this.graph.getModel().beginUpdate();
      try {
        // Insert new glyph
        const glyphCell = this.graph.insertVertex(circuitContainer, null, '', 0, 0, glyphWidth, glyphHeight, glyphBaseStyleName + name);
        glyphCell.data = new GlyphInfo();
        glyphCell.setConnectable(false);

        circuitContainer.refreshCircuitContainer(this.graph);
      } finally {
        this.graph.getModel().endUpdate();
      }
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
    else if (selection.isGlyph()) {
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
      const glyphCell = this.graph.insertVertex(this.graph.getDefaultParent(), null, 'Sample Text', 0, 0, defaultTextWidth, defaultTextHeight, textboxStyleName);
      glyphCell.setConnectable(false);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Find the selected cell, and if there is a cell selected, update its color.
   */
  updateSelectedCellColor(color: string) {
    const selectedCell = this.graph.getSelectionCells();

    if (selectedCell != null) {

      this.graph.getModel().beginUpdate();
      this.graph.setCellStyles(mx.mxConstants.STYLE_STROKECOLOR, color, selectedCell);
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Find the selected cell, and it there is a glyph selected, update its metadata.
   */
  updateSelectedCellInfo(glyphInfo: GlyphInfo) {
    const selectedCell = this.graph.getSelectionCell();

    if (selectedCell != null && selectedCell.isGlyph()) {
      const cellData = selectedCell.getGlyphMetadata();
      if (cellData != null) {
        cellData.copyDataFrom(glyphInfo);
      }
    }
  }

  /**
   * Encodes the graph to a string (xml) representation
   */
  graphToString(): string {
    const encoder = new mx.mxCodec();
    const result = encoder.encode(this.graph.getModel());
    return mx.mxUtils.getXml(result);
  }

  /**
   * Decodes the given string (xml) representation of a graph and uses it to replace the current graph
   */
  stringToGraph(graphString: string) {
    // Creates the graph inside the given container
    this.graph.getModel().clear();
    const doc = mx.mxUtils.parseXml(graphString);
    const codec = new mx.mxCodec(doc);
    codec.decode(doc.documentElement, this.graph.getModel());
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
    mx.mxCodecRegistry.register(glyphInfoCodec);
    window['GlyphInfo'] = GlyphInfo;
  }

  /**
   * Gives mxCells new methods related to our circuit/backbone rules
   */
  initExtraCellMethods() {

    mx.mxCell.prototype.isBackbone = function() {
      return this.style.includes(backboneStyleName);
    }

    mx.mxCell.prototype.isGlyph = function() {
      return this.style.includes(glyphBaseStyleName);
    }

    mx.mxCell.prototype.isCircuitContainer = function() {
      return this.style.includes(circuitContainerStyleName);
    }

    /**
     * Returns the backbone associated with this cell
     */
    mx.mxCell.prototype.getBackbone = function() {
      if (this.isGlyph()) {
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
    }

    /**
     * Positions and sizes the backbone associated with this cell
     */
    mx.mxCell.prototype.refreshBackbone = function(graph) {
      if (this.isGlyph() || this.isBackbone()) {
        this.getParent().refreshBackbone(graph);
        return;
      } else if (!this.isCircuitContainer()) {
        console.error("refreshBackbone: called on an invalid cell!");
        return;
      }

      const backbone = this.getBackbone();

      // put it first in the children array so it is drawn before glyphs
      // (meaning it appears behind them)
      const oldIdx = this.children.indexOf(backbone);
      this.children.splice(oldIdx, 1);
      this.children.splice(0, 0, backbone);

      const geo = new mx.mxGeometry(0,0,0,0);
      // Paranoia
      geo.x = 0;
      geo.y = (glyphHeight / 2) - (defaultBackboneHeight / 2);
      geo.height = defaultBackboneHeight;

      // width:
      let glyphCount = this.getChildCount() - 1;
      if (glyphCount == 0) {
        geo.width = defaultBackboneWidth;
      } else {
        geo.width = glyphCount * glyphWidth;
      }

      graph.getModel().setGeometry(backbone,geo);

    }

    /**
     * (Re)positions the glyphs inside the circuit containter and
     * also refreshes the backbone.
     */
    mx.mxCell.prototype.refreshCircuitContainer = function(graph) {
      if (this.isGlyph() || this.isBackbone()) {
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
      }
      layout.execute(this);
    }

    /**
     * Returns the circuit container associated with this cell.
     */
    mx.mxCell.prototype.getCircuitContainer = function () {
      if (this.isGlyph() || this.isBackbone()) {
        return this.getParent();
      } else if (!this.isCircuitContainer()) {
        return null;
      }

      return this;
    }

    /**
     * Returns the metadata associated with this cell.
     * Usually this cell will be a glyph.
     */
    mx.mxCell.prototype.getGlyphMetadata = function() {
      if (this.isGlyph()) {
        return this.data;
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
     * Choose which cell should be selected on mouse down
     * Functionality: when clicking part of a circuit, select the circuitContainer
     *    instead of the individual piece selected (unless the individual piece was
     *    already selected separately)
     * TODO generalize for more than 1 level of nested cells
     */
    const defaultGetInitialCellForEvent = mx.mxGraphHandler.prototype.getInitialCellForEvent;
    mx.mxGraphHandler.prototype.getInitialCellForEvent = function(evt)
    {
      const clickedCell = defaultGetInitialCellForEvent.apply(this, arguments);
      const selMod = this.graph.getSelectionModel();
      const currentlySelectedCell = this.graph.getSelectionCell();

      // TODO: special case: If we already have a glyph clicked and are clicking on a different one within the same strand,
      // TODO: we want to unselect the selected glyph, and select the new one.

      if (selMod.isSelected((clickedCell)) || clickedCell.getParent() == this.graph.getDefaultParent()) {

        return clickedCell;
      }
      else {
        return clickedCell.getParent();
      }
    };

    /**
     * Chooses whether or not to delay selection change until after mouse up
     * Functionality: If the user has a circuitContainer selected, then clicks down,
     *    the circuitContainer must stay selected so they can click-and-drag to move
     *    the whole circuit. However, if they click and release without dragging,
     *    the selection should change from the circuitContainer to the specific cell clicked.
     *    That means the selection change should happen on mouse-up instead of mouse-down
     *    (a delayed selection).
     *   This method detects the above situation and enables delayedSelection for the event.
     *   Note: even if delayedSelection is enabled, if the user clicks-and-drags there will be
     *    no selection change on mouse-up (ie selectDelayed, below, won't be called).
     * TODO generalize for more than 1 level of nested cells
     */
    const defaultIsDelayedSelection = mx.mxGraphHandler.prototype.isDelayedSelection;
    mx.mxGraphHandler.prototype.isDelayedSelection = function(cellForEvent)
    {
      // Note: cellForEvent is the cell chosen by getInitialCellForEvent (above)
      // not the actual cell that was clicked

      const defaultResult = defaultIsDelayedSelection.apply(this, arguments);
      const selMod = this.graph.getSelectionModel();

      if (selMod.isSelected(cellForEvent))
        return true;
      else
        return defaultResult;
    };

    /**
     * Implements delayed selection changes if they are enabled by isDelayedSelection (above)
     */
    mx.mxGraphHandler.prototype.selectDelayed = function(evt)
    {
      const clickedCell = evt.getCell();
      if (clickedCell) {
        if (clickedCell.isBackbone()) {
          this.graph.selectCellForEvent(clickedCell.getParent());
        } else {
          this.graph.selectCellForEvent(clickedCell);
        }
      }
    };

    // Used for tracking glyph movement for moving the position of
    // a glyph in a circuit.
    let movingGlyph;
    let oldX;
    let oldY;

    const defaultMouseDown = mx.mxGraphHandler.prototype.mouseDown;
    mx.mxGraphHandler.prototype.mouseDown = function(sender, me) {
      defaultMouseDown.apply(this, arguments);

      if (this.isEnabled() && this.graph.isEnabled() &&
        me.getState() != null && !mx.mxEvent.isMultiTouchEvent(me.getEvent()))
      {

        let clickedCell = this.getInitialCellForEvent(me);
        let selMod = this.graph.getSelectionModel();

        if (clickedCell && clickedCell.isGlyph() && selMod.isSelected(clickedCell) && selMod.cells.length == 1) {
          movingGlyph = clickedCell;
          oldX = clickedCell.geometry.x;
          oldY = clickedCell.geometry.y;
        } else {
          movingGlyph = null;
        }
      }
    }

    const defaultMouseUp = mx.mxGraphHandler.prototype.mouseUp;
    const service = this;
    mx.mxGraphHandler.prototype.mouseUp = function(sender, me) {
      defaultMouseUp.apply(this, arguments);

      if (movingGlyph != null &&
        (movingGlyph.geometry.x != oldX || movingGlyph.geometry.y != oldY))
      {
        // Debugging glyph telemetry.
        console.debug("Detected");
        console.debug("old x = " + oldX + ", old y = " + oldY);
        console.debug("x = " + movingGlyph.geometry.x + ", y = " + movingGlyph.geometry.y);

        // The graph already moved the cell and registered it as an undoable edit.
        // We need to refine the position and formatting in another undoable edit,
        // but at the end there should only be one action on the undo stack.
        // To fix that, undo to get rid of the graph's action (but remember the x
        // position for later)
        let newx = movingGlyph.geometry.x;
        service.editor.execute('undo');

        // What we do here is get the circuit container, figure out what
        // the index of the moving glyph is, take that glyph out of the list
        // of glyphs that are in the circuit container, and reinsert the moving
        // glyph into the list based on its x coordinates.
        this.graph.getModel().beginUpdate();
        let circuitContainer = movingGlyph.getCircuitContainer();
        let movingGlyphChildIndex = circuitContainer.getIndex(movingGlyph);

        let children = circuitContainer.children;
        children.splice(movingGlyphChildIndex, 1);

        var insertIndex = null;
        for (let i = 0; i < children.length; i++) {
          if (children[i].geometry.x > newx) {
            insertIndex = i;
            break;
          }
        }
        if (insertIndex == null) {
          insertIndex = children.length;
        }

        children.splice(insertIndex, 0, movingGlyph);

        circuitContainer.refreshCircuitContainer(this.graph);
        this.graph.getModel().endUpdate();
      }
    }
  }

  /**
   * Sets up all the constant styles used by the graph.
   *
   * Can only be called before this.graph is initialized
   */
  initStyles() {
    // A dummy element used for previewing glyphs as they are dragged onto the graph
    this.glyphDragPreviewElt = document.createElement('div');
    this.glyphDragPreviewElt.style.border = 'dashed black 1px';
    this.glyphDragPreviewElt.style.width = glyphWidth + 'px';
    this.glyphDragPreviewElt.style.height = glyphHeight + 'px';

    this.textBoxDragPreviewElt = document.createElement('div');
    this.textBoxDragPreviewElt.style.border = 'dashed black 1px';
    this.textBoxDragPreviewElt.style.width = defaultTextWidth + 'px';
    this.textBoxDragPreviewElt.style.height = defaultTextHeight + 'px';

    this.baseGlyphStyle = {};
    this.baseGlyphStyle[mx.mxConstants.STYLE_FILLCOLOR] = '#ffffff';
    this.baseGlyphStyle[mx.mxConstants.STYLE_STROKECOLOR] = '#000000';
    this.baseGlyphStyle[mx.mxConstants.STYLE_NOLABEL] = true;
    this.baseGlyphStyle[mx.mxConstants.STYLE_EDITABLE] = false;
    this.baseGlyphStyle[mx.mxConstants.STYLE_RESIZABLE] = 0;

    const textBoxStyle = {};
    textBoxStyle[mx.mxConstants.STYLE_SHAPE] = mx.mxConstants.SHAPE_LABEL;
    textBoxStyle[mx.mxConstants.STYLE_FILLCOLOR] = '#ffffff';
    textBoxStyle[mx.mxConstants.STYLE_STROKECOLOR] = '#000000';
    this.graph.getStylesheet().putCellStyle(textboxStyleName, textBoxStyle);

    const circuitContainerStyle = {};
    circuitContainerStyle[mx.mxConstants.STYLE_SHAPE] = mx.mxConstants.SHAPE_RECTANGLE;
    circuitContainerStyle[mx.mxConstants.STYLE_STROKECOLOR] = 'none';
    circuitContainerStyle[mx.mxConstants.STYLE_FILLCOLOR] = 'none';
    circuitContainerStyle[mx.mxConstants.STYLE_RESIZABLE] = 0;
    circuitContainerStyle[mx.mxConstants.STYLE_EDITABLE] = false;
    this.graph.getStylesheet().putCellStyle(circuitContainerStyleName, circuitContainerStyle);

    const backboneStyle = {};
    backboneStyle[mx.mxConstants.STYLE_SHAPE] = mx.mxConstants.SHAPE_RECTANGLE;
    backboneStyle[mx.mxConstants.STYLE_FILLCOLOR] = '#000000';
    backboneStyle[mx.mxConstants.STYLE_RESIZABLE] = 0;
    backboneStyle[mx.mxConstants.STYLE_EDITABLE] = false;
    this.graph.getStylesheet().putCellStyle(backboneStyleName, backboneStyle);

    const style = this.graph.getStylesheet().getDefaultEdgeStyle();
    style[mx.mxConstants.STYLE_ROUNDED] = true;
    style[mx.mxConstants.STYLE_EDGE] = mx.mxEdgeStyle.ElbowConnector;
  }

  initCustomGlyphs() {
    const stencils = this.glyphService.getStencils();

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

      mx.mxStencilRegistry.addStencil(name, customStencil);

      const newGlyphStyle = mx.mxUtils.clone(this.baseGlyphStyle);
      newGlyphStyle[mx.mxConstants.STYLE_SHAPE] = name;
      this.graph.getStylesheet().putCellStyle(glyphBaseStyleName + name, newGlyphStyle);
    }
  }
}
