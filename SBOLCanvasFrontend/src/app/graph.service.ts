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
const interactionPortWidth        = 10;

const molecularSpeciesGlyphWidth  = 50;
const molecularSpeciesGlyphHeight = 50;

const defaultTextWidth            = 120;
const defaultTextHeight           = 80;

const circuitContainerStyleName           = 'circuitContainer';
const backboneStyleName                   = 'backbone';
const textboxStyleName                    = 'textBox';
const scarStyleName                       = 'Scar (Assembly Scar)';
const interactionPortStyleName            = 'interactionPort';
const molecularSpeciesGlyphBaseStyleName  = 'molecularSpeciesGlyph';
const sequenceFeatureGlyphBaseStyleName   = 'sequenceFeatureGlyph';
const interactionGlyphBaseStyleName       = 'interactionGlyph';


@Injectable({
  providedIn: 'root'
})
export class GraphService {

  graph: mxGraph;
  editor: mxEditor;
  graphContainer: HTMLElement;
  glyphDragPreviewElt: HTMLElement;
  textBoxDragPreviewElt: HTMLElement;

  // Boolean for keeping track of whether we are showing scars or not in the graph.
  showingScars: boolean = true;

  // counter for keeping track of how many times the user drilled into a glyph
  drillDepth: number = 0;

  baseGlyphStyle: any;
  collapsedGlyphStyle: any;

  constructor(private metadataService: MetadataService, private glyphService: GlyphService) {
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

    //mx.mxGraphHandler.prototype.guidesEnabled = true;
    //mx.mxConnectionHandler.prototype.outlineConnect = false; // Doesn't see to do anything

    // mxEditor is kind of a parent to mxGraph
    // it's used mainly for 'actions', which for now means delete, later will mean undoing
    this.editor = new mx.mxEditor();
    this.graph = this.editor.graph;
    this.editor.setGraphContainer(this.graphContainer);

    this.graph.setConnectable(true);
    this.graph.setCellsCloneable(false);
    // This allows us to drag the ends of edges wherever we want when it is set to true.
    // Also, for some reason if this is set to false, we cannot connect edges to
    // stencils (glyphs).
    this.graph.setAllowDanglingEdges(true);
    this.graph.setTolerance(20);


    // Enables rubberband selection
    // tslint:disable-next-line:no-unused-expression
    new mx.mxRubberband(this.graph);

    // Sets the graph container and configures the editor

    // without this, an option appears to collapse glyphs, which hides their ports
    this.graph.isCellFoldable = function(cell) {
      return false; //cell.isSequenceFeatureGlyph();
    };

    // Add event listeners to the graph. NOTE: MUST USE THE '=>' WAY FOR THIS TO WORK.
    // Doing it this way enables the function to keep accessing 'this' from inside.
    this.graph.getSelectionModel().addListener(mx.mxEvent.CHANGE, (sender, event) => this.handleSelectionChange(sender, event));

    this.initStyles();
    this.initCustomShapes();
    this.initSequenceFeatureGlyphMovement();
    this.initConnectionSettings();
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
        console.log(cellsAdded[i]);
      }
    }

    this.updateAngularMetadata(cellsAdded);
  }

  /**
   * Updates the data in the metadata service according to the cells properties
   */
  updateAngularMetadata(cells) {

    // Start with null data.
    this.nullifyMetadata()

    if (!cells || cells.length != 1) {
      // no selection? multiple selections? can't display metadata
      return;
    }
    else {
      let cell = cells[0];

      if (cell.isSequenceFeatureGlyph() || cell.isMolecularSpeciesGlyph()) {
        let color = this.graph.getCellStyle(cell)['strokeColor'];
        this.metadataService.setColor(color);

        const glyphInfo = cell.data;
        if(glyphInfo) {
          this.metadataService.setSelectedGlyphInfo(glyphInfo.makeCopy());
        }
      }
      else if (cell.isInteraction()) {
        let color = this.graph.getCellStyle(cell)['strokeColor'];
        this.metadataService.setColor(color);

        let interactionInfo = cell.data
        if (interactionInfo) {
          this.metadataService.setSelectedInteractionInfo(interactionInfo);
        }
      }
    }
  }

  nullifyMetadata() {
    this.metadataService.setColor(null);
    this.metadataService.setSelectedGlyphInfo(null);
    this.metadataService.setSelectedInteractionInfo(null);
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

  /**
   * Sets all scars in the current view
   * @param isCollapsed
   */
  setAllScars(isCollapsed: boolean) {
    try {
      this.graph.getModel().beginUpdate();
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
        this.setScars(children[i].getCircuitContainer(), isCollapsed);
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
   * 'Zooms in' to view the component definition of the currently selected glyph.
   * This changes which component/module definition is displayed on the canvas,
   * not the canvas's scale.
   */
  zoom() {
    let selection = this.graph.getSelectionCells();
    if (selection.length != 1) {
      return;
    }

    if (!selection[0].isSequenceFeatureGlyph()) {
      return;
    }

    this.editor.execute('enterGroup');
    this.drillDepth++;

    // Broadcast to the UI that we are now in component definition mode
    this.metadataService.setComponentDefinitionMode(true);
  }

  /**
   * 'Zooms out' to view a higher level of the sbol document.
   * This changes which component/module definition is displayed on the canvas,
   * not the canvas's scale.
   */
  unzoom() {
    if (this.drillDepth > 0) {
      // Exit twice: the first only gets you to the circuitContainer
      this.editor.execute('exitGroup');
      this.editor.execute('exitGroup');
      this.drillDepth--;

      // We call this here when we zoom out to synchronize
      // the current graph vertices with the showing scars setting
      this.setAllScars(this.showingScars);
    }

    // Broadcast to the UI that we are no longer in component definition mode
    if (this.drillDepth < 1) {
      this.metadataService.setComponentDefinitionMode(false);
    }
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
          circuitContainers.push(cell.getParent());
      }

      this.editor.execute('delete');

      for (let cell of circuitContainers) {
        cell.refreshSequenceFeature(this.graph);
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
  addSequenceFeature(name) {
    // Don't do anything if it is a scar and were not showing them.
    if (name.includes(scarStyleName) && !this.showingScars) { this.toggleScars(); }

    let parentCircuitContainer = this.getSelectionContainer();

    if (parentCircuitContainer != null) {
      this.graph.getModel().beginUpdate();
      try {
        // Insert new glyph and its components
        const sequenceFeatureCell = this.graph.insertVertex(parentCircuitContainer, null, '', 0, 0, sequenceFeatureGlyphWidth, sequenceFeatureGlyphHeight, sequenceFeatureGlyphBaseStyleName + name);
        const childCircuitContainer = this.graph.insertVertex(sequenceFeatureCell, null, '', 0, 0, 0, 0, circuitContainerStyleName);
        const childCircuitContainerBackbone = this.graph.insertVertex(childCircuitContainer, null, '', 0, 0, 0, 0, backboneStyleName);

        sequenceFeatureCell.data = new GlyphInfo();
        sequenceFeatureCell.data.partRole = name;

        sequenceFeatureCell.setCollapsed(true);

        childCircuitContainerBackbone.setConnectable(false);
        childCircuitContainer.setConnectable(false);
        sequenceFeatureCell.setConnectable(true);

        // Refreshes the parent
        parentCircuitContainer.refreshCircuitContainer(this.graph);

        // The new glyph should be selected
        this.graph.clearSelection();
        this.graph.setSelectionCell(sequenceFeatureCell);
      } finally {
        this.graph.getModel().endUpdate();
      }
    }
  }

  /**
   * Drops a new floating element on the canvas
   */
  addMolecularSpecies(name) {
    this.graph.getModel().beginUpdate();
    try {
      const molecularSpeciesGlyph = this.graph.insertVertex(this.graph.getDefaultParent(), null, '', 0, 0,
        molecularSpeciesGlyphWidth, molecularSpeciesGlyphHeight, molecularSpeciesGlyphBaseStyleName + name);
      molecularSpeciesGlyph.setConnectable(true);

      molecularSpeciesGlyph.data = new GlyphInfo();

      // The new glyph should be selected
      this.graph.clearSelection();
      this.graph.setSelectionCell(molecularSpeciesGlyph);
    } finally {
      this.graph.getModel().endUpdate();
    }
  }

  /**
   * Drops a new interaction edge onto the canvas
   * @param name
   */
  addInteraction(name: string) {
    let cell = new mx.mxCell('your text', new mx.mxGeometry(0, 0, 50, 50), interactionGlyphBaseStyleName + 'control');
    cell.geometry.setTerminalPoint(new mx.mxPoint(50, 150), true);
    cell.geometry.setTerminalPoint(new mx.mxPoint(150, 50), false);
    cell.edge = true;
    this.graph.addEdge(cell);
  }


  /**
   * Based on the selected cell(s) chooses a location to drop a new glyph.
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

    if (selection.isSequenceFeatureGlyph()) {
      // if a sequenceFeatureGlyph is selected, new glyph should go along side,
      // not inside
      return selection.getParent();
    } else {
      return selection.getCircuitContainer();
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
      const cellData = selectedCell.data;
      if (cellData != null) {
        cellData.copyDataFrom(glyphInfo);
      }
    }
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
    // Creates the graph inside the given container
    this.graph.getModel().clear();
    const doc = mx.mxUtils.parseXml(graphString);
    const codec = new mx.mxCodec(doc);
    codec.decode(doc.documentElement, this.graph.getModel());

    this.editor.undoManager.clear();
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

    mx.mxCell.prototype.isStyle = function(styleName) {
      if (!this.style)
        return false;
      return this.style.includes(styleName);
    };

    mx.mxCell.prototype.isBackbone = function() {
      return this.isStyle(backboneStyleName);
    };

    mx.mxCell.prototype.isMolecularSpeciesGlyph = function() {
      return this.isStyle(molecularSpeciesGlyphBaseStyleName);
    };

    mx.mxCell.prototype.isCircuitContainer = function() {
      return this.isStyle(circuitContainerStyleName);
    };

    mx.mxCell.prototype.isSequenceFeatureGlyph = function() {
      return this.isStyle(sequenceFeatureGlyphBaseStyleName);
    };

    mx.mxCell.prototype.isScar = function() {
      return this.isStyle(scarStyleName);
    };

    mx.mxCell.prototype.isInteractionPort = function() {
      return this.isStyle(interactionPortStyleName);
    };

    mx.mxCell.prototype.isInteraction = function() {
      return this.isStyle(interactionGlyphBaseStyleName);
    }

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

    mx.mxCell.prototype.getSequenceFeatureGlyph = function() {
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
    mx.mxCell.prototype.refreshBackbone = function(graph) {
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

      this.getBackbone().replaceGeometry('auto', sequenceFeatureGlyphHeight/2, width, height, graph);
    };

    mx.mxCell.prototype.refreshSequenceFeature = function(graph) {
      if (!this.isSequenceFeatureGlyph()) {
        console.error("refreshSequenceFeature: called on an invalid cell!");
        return;
      }

      // format our child circuitContainer (width, height, subcomponents)
      this.getCircuitContainer().refreshCircuitContainer(graph);
    };

    /**
     * (Re)positions the glyphs inside the circuitContainer and
     * also refreshes the backbone.
     */
    mx.mxCell.prototype.refreshCircuitContainer = function(graph) {
      if (!this.isCircuitContainer()) {
        console.error("refreshCircuitContainer: called on an invalid cell!");
        return;
      }

      // Refresh all children sequence features and their respective interaction ports
      let portCount = 0;
      for (let child of this.children) {
        if (child.isSequenceFeatureGlyph()) {
          child.refreshSequenceFeature(graph);
        }
        else if (child.isInteractionPort()) {

        }
      }

      // refresh backbone (width, height)
      this.refreshBackbone(graph);

      // verify own width, height
      this.replaceGeometry(
        'auto', 'auto', this.getBackbone().getGeometry().width, sequenceFeatureGlyphHeight, graph);

      // put the backbone first in the children array so it is drawn before glyphs
      // (meaning it appears behind them)
      graph.getModel().add(this, this.getBackbone(), 0);

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
    mx.mxCell.prototype.getCircuitContainer = function() {
      if (this.isSequenceFeatureGlyph()) {
        for (let child of this.children) {
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

    mx.mxCell.prototype.getParentCircuitContainer = function() {
      if (this.isSequenceFeatureGlyph()) {
        return this.getParent();
      } else {
        return null;
      }
    };

    /**
     * Replaces this cell's geometry in an undo friendly way
     * 'graph' must be a reference to the graph
     *
     * For any other value, pass the string 'auto' to use the
     * previous geometry's value.
     */
    mx.mxCell.prototype.replaceGeometry = function(x, y, width, height, graph) {
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

      graph.getModel().setGeometry(this, newGeo);
    };

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
    this.baseGlyphStyle[mx.mxConstants.STYLE_BACK] = '#ffffff';
    this.baseGlyphStyle[mx.mxConstants.STYLE_NOLABEL] = true;
    this.baseGlyphStyle[mx.mxConstants.STYLE_EDITABLE] = false;
    this.baseGlyphStyle[mx.mxConstants.STYLE_RESIZABLE] = 0;
    this.baseGlyphStyle[mx.mxConstants.STYLE_ROTATION] = 0;
    //this.baseGlyphStyle[mx.mxConstants.DEFAULT_HOTSPOT] = 0; // globally...
    //this.baseGlyphStyle[mx.mxConstants.STYLE_PERIMETER] = 'orthogonalPerimeter'; // puts connection constraints in exact middle of cell...
    //this.baseGlyphStyle[mx.mxConstants.ACTIVE_REGION] = 1;

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

    // Interaction styles
    const interactionControlSpecification = {};
    interactionControlSpecification[mx.mxConstants.STYLE_ENDARROW] = mx.mxConstants.ARROW_DIAMOND;
    interactionControlSpecification[mx.mxConstants.STYLE_EDGE] = mx.mxConstants.EDGESTYLE_ORTHOGONAL;
    this.graph.getStylesheet().putCellStyle(interactionGlyphBaseStyleName + 'control', interactionControlSpecification);

    // Interaction Port style
    const interactionPortStyle = {};
    interactionPortStyle[mx.mxConstants.STYLE_FILLCOLOR] = '#ffffff';
    this.graph.getStylesheet().putCellStyle(interactionPortStyleName, interactionPortStyle);
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

      // Defines the connection constraints for all sequence features
      customStencil.constraints = [
        new mx.mxConnectionConstraint(new mx.mxPoint(0.5, 0), true),
        new mx.mxConnectionConstraint(new mx.mxPoint(0.5, 1), true)
      ];

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

      // Defines the default constraints for all molecular species
      customStencil.constraints = [
        new mx.mxConnectionConstraint(new mx.mxPoint(0.5, 0), true),
        new mx.mxConnectionConstraint(new mx.mxPoint(0.5, 1), true),
        new mx.mxConnectionConstraint(new mx.mxPoint(0, .5), true),
        new mx.mxConnectionConstraint(new mx.mxPoint(1, .5), true)
      ];
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
            movedCells[i+streak].replaceGeometry(baseX, 'auto', 'auto', 'auto', sender);

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

  initConnectionSettings() {

    // Overrides highlight shape for connection points
    mx.mxConstraintHandler.prototype.createHighlightShape = function () {
      var hl = new mx.mxEllipse(null, this.highlightColor, this.highlightColor, 0);
      hl.opacity = mx.mxConstants.HIGHLIGHT_OPACITY;

      return hl;
    };

    // Overriding this method makes it so connection constraints on sequence features
    // stay visible when trying to create an interaction.
    let origIsKeepFocusEvent = mx.mxConstraintHandler.prototype.isKeepFocusEvent;
    mx.mxConstraintHandler.prototype.isKeepFocusEvent = function (me) {

      // Ignore circuit containers and backbones so that the focus stays
      // on the sequence feature, and thus the anchor points stay visible.
      if (me.state != undefined && me.state.cell != undefined) {
        if (me.state.cell.isCircuitContainer() || me.state.cell.isBackbone()) {
          console.debug("mx.mxConstraintHandler.prototype.isKeepFocusEvent: Keeping focus.")
          return true;
        }
      }

      return origIsKeepFocusEvent.apply(this, arguments);
    };

    let mxConnectionHandlerInsertEdge = mx.mxConnectionHandler.prototype.insertEdge;
    mx.mxConnectionHandler.prototype.insertEdge = function(parent, id, value, source, target, style)
    {
      value = 'Test';
      style = this.graph.getStylesheet().getCellStyle(interactionGlyphBaseStyleName + 'control');

      return mxConnectionHandlerInsertEdge.apply(this, [parent, id, value, source, target, style]);
    };
  }
}
