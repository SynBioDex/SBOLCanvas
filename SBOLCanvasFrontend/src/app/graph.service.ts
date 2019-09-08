/*
 * GraphService
 *
 * This service handles interactions with the mxGraph library
 */

import {Injectable} from '@angular/core';
import * as mxEditor from 'mxgraph';
import * as mxGraph from 'mxgraph';
import * as mxDragSource from 'mxgraph';
import * as mxCell from 'mxgraph';
import {GlyphInfo} from './glyphInfo';
import {MetadataService} from './metadata.service';
import {mapChildrenIntoArray} from "@angular/router/src/url_tree";

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

  baseGlyphStyle;

  constructor(private metadataService: MetadataService) {
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
    this.graph.addListener(mx.mxEvent.CLICK, (sender, event) => this.handleClickEvent(sender, event));

    this.initStyles();
    this.initCustomGlyphs();
  }

  addNewBackbone(element) {

    // TODO: Make drag element outline have same shape as backbone.
    const insertGlyph = (graph, evt, target, x, y) => {
      // When executed, 'this' is the dragSource, not the graphService

      graph.getModel().beginUpdate();
      try {
        const circuitContainer = graph.insertVertex(graph.getDefaultParent(), null, '', x, y, defaultBackboneWidth, glyphHeight, circuitContainerStyleName);
        const backbone = graph.insertVertex(circuitContainer, null, '', 0, glyphHeight/2, defaultBackboneWidth, defaultBackboneHeight, backboneStyleName);

        backbone.refreshBackbone();

        circuitContainer.setConnectable(false);
        backbone.setConnectable(false);
        // TODO: glyphCell.data = new GlyphInfo();

      } finally {
        graph.getModel().endUpdate();
      }
    };

    const ds: mxDragSource = mx.mxUtils.makeDraggable(element, this.graph, insertGlyph, this.glyphDragPreviewElt);

    ds.isGridEnabled = function() {
      return this.currentGraph.graphHandler.guidesEnabled;
    };
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
   * Drops a new glyph onto the current backbone
   */
  dropNewGlyph(element) {
    let circuitContainer = this.getSelectionContainer();
    if (circuitContainer != null) {
      this.graph.getModel().beginUpdate();
      try {
        // Insert new glyph
        const glyphCell = this.graph.insertVertex(circuitContainer, null, '', 0, 0, glyphWidth, glyphHeight, glyphBaseStyleName + 'customShape');
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
    const selectedCell = this.graph.getSelectionCell();

    if (selectedCell != null) {
      const cellGroup = this.getCellColorGroup(selectedCell);

      this.graph.getModel().beginUpdate();
      this.graph.setCellStyles(mx.mxConstants.STYLE_FILLCOLOR, color, cellGroup);
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Find the selected cell, and it there is a glyph selected, update its metadata.
   */
  updateSelectedCellInfo(glyphInfo: GlyphInfo) {
    const selectedCell = this.graph.getSelectionCell();

    if (selectedCell != null && selectedCell.isVertex()) {
      const cellData = this.getCellData(selectedCell);
      if (cellData != null) {
        // cellData is null if selectedCell is a textbox
        cellData.copyDataFrom(glyphInfo);
      }
    }
  }

  /**
   * Handles a click event in the graph.
   */
  handleClickEvent(sender, event) {
    const cell = event.getProperty('cell');

    if (cell == null || cell.isEdge()) {
      this.metadataService.setColor(null);
      this.metadataService.setSelectedGlyphInfo(null);
      return;
    }
    // Eventually we'll want to allow recoloring edges too

    // this is the same for ports, glyphs and text boxes
    const color = this.graph.getCellStyle(cell)['fillColor'];
    this.metadataService.setColor(color);

    if (this.getCellData(cell) == null) {
      // text box
      this.metadataService.setSelectedGlyphInfo(null);
    } else {
      // port or glyph
      const glyphInfo = this.getCellData(cell);
      this.metadataService.setSelectedGlyphInfo(glyphInfo.makeCopy());
    }

  }

  /**
   * Returns the GlyphInfo associated with the given cell
   * cell must be a vertex, not an edge
   */
  getCellData(cell: mxCell) {
    const defaultParent = this.graph.getDefaultParent();
    if (cell.getParent() === defaultParent) {
      return cell.data;
    } else {
      return cell.getParent().data;
    }
  }

  /**
   * Returns a list of cells that should be the same color as the given one
   * ie, a glyph and its ports
   */
  getCellColorGroup(cell: mxCell) {
    if (cell.isEdge()) {
      return [cell];
    }

    let cells;

    const defaultParent = this.graph.getDefaultParent();
    if (cell.getParent() !== defaultParent) {
      // port
      cells = this.getCellColorGroup(cell.getParent());
    } else if (this.getCellData(cell) == null) {
      // text
      cells = [cell];
    } else {
      // glyph
      cells = [cell];
      for (const c of cell.children) {
        cells.push(c);
      }
    }

    return cells;
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
        console.error("getBackbone: called on an invalid cell");
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
    mx.mxCell.prototype.refreshBackbone = function() {
      if (this.isGlyph() || this.isBackbone()) {
        this.getParent().refreshBackbone();
        return;
      } else if (!this.isCircuitContainer()) {
        console.error("refreshBackbone: called on an invalid cell!");
        return;
      }

      let backbone = this.getBackbone();

      // Paranoia
      backbone.geometry.x = 0;
      backbone.geometry.y = (glyphHeight / 2) - (defaultBackboneHeight / 2);
      backbone.geometry.height = defaultBackboneHeight;

      // width:
      let glyphCount = this.getChildCount() - 1;
      if (glyphCount == 0) {
        backbone.geometry.width = defaultBackboneWidth;
      } else {
        backbone.geometry.width = glyphCount * glyphWidth;
      }
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

      // Layout all the glyphs in a horizontal line, while ignoring the backbone cell.
      var layout = new mx.mxStackLayout(graph, true);
      layout.resizeParent = true;
      layout.isVertexIgnored = function (vertex)
      {
        return vertex.isBackbone()
      }
      layout.execute(this);

      // resize the backbone
      this.refreshBackbone();
    }

    /**
     * Returns the circuit container associated with this cell.
     */
    mx.mxCell.prototype.getCircuitContainer = function () {
      if (this.isGlyph() || this.isBackbone()) {
        return this.getParent();
      } else if (!this.isCircuitContainer()) {
        console.error("getCircuitContainer: This cell has no circuit container!");
        return null;
      }

      return this;
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
    mx.mxGraphHandler.prototype.mouseUp = function(sender, me) {
      defaultMouseUp.apply(this, arguments);

      if (movingGlyph != null &&
        (movingGlyph.geometry.x != oldX || movingGlyph.geometry.y != oldY))
      {
        console.log("Detected");
        console.log("old x = " + oldX + ", old y = " + oldY);
        console.log("x = " + movingGlyph.geometry.x + ", y = " + movingGlyph.geometry.y);

        let circuitContainer = movingGlyph.getCircuitContainer();
        let movingGlyphChildIndex = circuitContainer.getIndex(movingGlyph);

        let children = circuitContainer.children;
        children.splice(movingGlyphChildIndex, 1);

        var insertIndex = null;
        for (let i = 0; i < children.length; i++) {
          if (children[i].geometry.x > movingGlyph.geometry.x) {
            insertIndex = i;
            break;
          }
        }
        if (insertIndex == null) {
          insertIndex = children.length;
        }

        children.splice(insertIndex, 0, movingGlyph);

        circuitContainer.refreshCircuitContainer(this.graph);
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
    this.graph.getStylesheet().putCellStyle(textboxStyleName, textBoxStyle);

    const circuitContainerStyle = {};  // TODO: figure out how to eliminate border of circuit container to render circuit container invisible.
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
    function StupidDNAThing()
    {
      mx.mxShape.call(this);
    };
    mx.mxUtils.extend(StupidDNAThing, mx.mxShape);
    StupidDNAThing.prototype.paintBackground = function(c, x, y, w, h)
    {
      h = h / 2;
      c.translate(x, y);

      c.begin();
      c.moveTo(w / 4, 0);
      c.lineTo(3 * w / 4, 0);
      c.lineTo(3 * w / 4, h / 3);
      c.lineTo(w / 2, h / 2);
      c.lineTo(w / 4, h / 3);
      c.close();
      c.end();
      c.fillAndStroke();

      c.begin();
      c.moveTo(w / 2, h / 2);
      c.lineTo(w / 2, h);
      c.close();
      c.stroke(); // me so hard........
    }

    mx.mxCellRenderer.registerShape('customShape', StupidDNAThing);

    const newGlyphStyle = mx.mxUtils.clone(this.baseGlyphStyle);
    newGlyphStyle[mx.mxConstants.STYLE_SHAPE] = 'customShape';
    this.graph.getStylesheet().putCellStyle(glyphBaseStyleName + 'customShape', newGlyphStyle);
  }
}
