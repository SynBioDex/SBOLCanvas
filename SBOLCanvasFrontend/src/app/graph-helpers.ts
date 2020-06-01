/// <reference path="./graph-base.ts"/>

import { GlyphService } from './glyph.service';
import { GraphEdits } from './graph-edits';
import { GlyphInfo } from './glyphInfo';
import * as mxCell from 'mxgraph';
import * as mxDragSource from 'mxgraph';
import * as mxGraph from 'mxgraph';
import { ConfirmComponent } from './confirm/confirm.component';
import { MatDialog } from '@angular/material';
import { GraphBase, mx } from './graph-base';
import { GraphService } from './graph.service';
import { MetadataService } from './metadata.service';
import { StyleInfo } from './style-info';
import { ErrorComponent } from './error/error.component';

/**
 * Extension of the graph base that should contain helper methods to be used in the GraphService.
 * These methods should (in theory) not be used outside of the GraphService. If you make a helper
 * that needs one of the methods in the GraphService, add "this: GraphService" as the first argument.
 * Note that doing so will make the helper only usable in the GraphService.
 */
export class GraphHelpers extends GraphBase {

    constructor(public dialog: MatDialog, protected metadataService: MetadataService, glyphService: GlyphService) {
        super(glyphService);

        this.initLabelDrawing();
    }

    protected getParentInfo(cell: mxCell): GlyphInfo {
        let glyphInfo;
        if (cell.isCircuitContainer()) {
            if (this.viewStack.length > 1) {
                // has a parent that might need to change
                glyphInfo = this.getFromGlyphDict(this.selectionStack[this.selectionStack.length - 1].getParent().getValue());
            }
            //TODO come back to me when module definitions will need to be updated
        } else {
            glyphInfo = this.getFromGlyphDict(cell.getParent().getValue());
        }
        return glyphInfo;
    }

    protected checkCurrentOwnership(cell: mxCell): boolean {
        return false;
    }

    protected promptCouple(this: GraphService, conflictViewCell: mxCell, selectedCells: mxCell[], info: GlyphInfo, newGlyphURI: string, oldGlyphURI: string) {
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

    protected promptDeCouple(this: GraphService, selectedCell: mxCell, coupledCells: mxCell[], info: GlyphInfo, newGlyphURI: string, oldGlyphURI: string) {
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
   * Returns an mxPoint specifying coordinates suitable for a new cell
   */
    protected getDefaultNewCellCoords() {
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
       * Changes the selected interaction's style based on the
       * one selected in the info menu
       * @param name
       */
    protected mutateInteractionGlyph(name: string) {
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
       * Changes the selected sequence feature's style based on the one selected in the info menu.
       */
    protected mutateSequenceFeatureGlyph(name: string);
    protected mutateSequenceFeatureGlyph(name: string, cells: mxCell);
    protected mutateSequenceFeatureGlyph(name: string, cells: mxCell, graph: mxGraph);
    protected mutateSequenceFeatureGlyph(name: string, cells?: mxCell, graph?: mxGraph) {
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

    protected makeGeneralDragsource(element, insertFunc) {
        const xOffset = -1 * element.getBoundingClientRect().width / 2;
        const yOffset = -1 * element.getBoundingClientRect().height / 2;

        const ds: mxDragSource = mx.mxUtils.makeDraggable(element, this.graph, insertFunc, null, xOffset, yOffset);
        ds.isGridEnabled = function () {
            return this.graph.graphHandler.guidesEnabled;
        };
    }

    protected getScarsVisible() {
        // empty graph case
        if (!this.graph.getDefaultParent().children) {
            return true;
        }

        // normal case
        let allGraphCells = this.graph.getDefaultParent().children;
        for (let i = 0; i < allGraphCells.length; i++) {
            if (allGraphCells[i].children) {
                for (let j = 0; j < allGraphCells[i].children.length; j++) {
                    if (allGraphCells[i].children[j].isScar()) {
                        if (allGraphCells[i].children[j].getGeometry().width > 0)
                            return true;
                    }
                }
            }
        }
        return false;
    }

    protected handleSelectionChange(sender, evt) {
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
    protected updateAngularMetadata(cells) {
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
       * Attempts some auto formatting on the graph.
       * Only affects the current "drill level," ie children cells are not affected.
       *
       * This generally does a bad job. Only use this for outside files with no
       * position information at all.
       */
    protected autoFormat(this: GraphService) {
        var first = new mx.mxStackLayout(this.graph, false, 20);
        var second = new mx.mxFastOrganicLayout(this.graph);

        var layout = new mx.mxCompositeLayout(this.graph, [first, second], first);
        layout.execute(this.graph.getDefaultParent());

        this.fitCamera();
    }

    /**
       * Returns the circuitContainer that is closest to the given point.
       *
       * Considers only the canvas's current "drill level," ie, circuitContainers
       * inside of SequenceFeatureGlyphs aren't considered.
       */
    protected getClosestCircuitContainerToPoint(x, y) {
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
       * 
       */
    protected async promptMakeEditableCopy(partName: string): Promise<boolean> {
        const confirmRef = this.dialog.open(ConfirmComponent, { data: { message: "The part '" + partName + "' is not owned by you and cannot be edited.\n Do you want to create an editable copy of this part and save your changes?", options: ["OK", "Cancel"] } });
        let result = await confirmRef.afterClosed().toPromise();
        return result === "OK";
    }

    /**
     * Goes through all the cells (starting at the root) and removes any cells that can't be reached.
     */
    protected trimUnreferencedCells() {
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

    protected getCoupledCells(glyphURI: string): mxCell[] {
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
    protected updateViewCell(cell: mxCell, newGlyphURI: string) {
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

    protected removeViewCell(viewCell: mxCell) {
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
     * Changes the uriPrefix of the passed in cell's glyph info, and any of it's parents.
     * @param this Must be called from the graph service, as it uses public methods.
     * @param glyphURI The cell to change ownership for.
     * @param fullCheck Stops at currently owned objects if false, continues until the root if true.
     */
    protected changeOwnership(this: GraphService, glyphURI: string, fullCheck: boolean = false) {

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

    /**
   * Only the currently viewable layer should be allowed to have selections
   */
    protected filterSelectionCells() {
        const selectionCells = this.graph.getSelectionCells();
        const newSelectionCells = [];
        for (let i = 0; i < selectionCells.length; i++) {
            if (selectionCells[i].getParent() && selectionCells[i].getParent().getParent() === this.viewStack[this.viewStack.length - 1]) {
                newSelectionCells.push(selectionCells[i]);
            }
        }
        this.graph.setSelectionCells(newSelectionCells);
    }

    /**
       * URI's must not form a circular reference. This method checks for any cycles 
       * that would be created if the cell's parents have the same glyphURI that's passed in.
       * @param cell The cell to check upward from.
       * @param glyphURI The URI you would like to set the current cell to.
       */
    protected checkCycleUp(cell: mxCell, glyphURI: string) {
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
    protected checkCycleDown(cell: mxCell, glyphURI: string) {
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
      * Returns true if there is at least 1 circuit container on the current
      * view
      */
    protected atLeastOneCircuitContainerInGraph() {
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
           * Updates a GlyphInfo
           * NOTE: Should only be used if the glyphURI is the same
           */
    protected updateGlyphDict(info: GlyphInfo) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.glyphInfoEdit(cell0, info, cell0.value[info.getFullURI()]));
    }

    /**
     * Remove a GlyphInfo object from the dictionary
     */
    protected removeFromGlyphDict(glyphURI: string) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.glyphInfoEdit(cell0, null, cell0.value[glyphURI]));
    }

    /**
     * Add a GlyphInfo object to the dictionary
     */
    protected addToGlyphDict(info: GlyphInfo) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.glyphInfoEdit(cell0, info, null));
    }

    /**
     * Get the GlyphInfo with the given glyphURI from the dictionary
     */
    protected getFromGlyphDict(glyphURI: string): GlyphInfo {
        const cell0 = this.graph.getModel().getCell(0);
        return cell0.value[glyphURI];
    }

    protected initLabelDrawing() {
        // label drawing
        let graphService = this;
        this.graph.convertValueToString = function (cell) {
            if (cell.isSequenceFeatureGlyph() || cell.isMolecularSpeciesGlyph()) {
                let info = graphService.getFromGlyphDict(cell.value);
                if (!info) {
                    return cell.value;
                } else if (info.name != null && info.name != '') {
                    return info.name;
                } else {
                    return info.displayID;
                }
            } else if (cell.isCircuitContainer()) {
                return '';
            } else {
                return cell.value;
            }
        }

        // label truncation
        this.graph.getLabel = function (cell) {
            let label = this.convertValueToString(cell);
            if (label) {
                let geometry = graphService.graph.getModel().getGeometry(cell);
                let fontSize = graphService.graph.getCellStyle(cell)[mx.mxConstants.STYLE_FONTSIZE];
                let max = geometry.width / (fontSize * 0.7);

                if (max < label.length) {
                    return label.substring(0, max) + '...';
                }
            }
            return label;
        }

        let mxGraphViewGetPerimeterPoint = mx.mxGraphView.prototype.getPerimeterPoint;
        mx.mxGraphView.prototype.getPerimeterPoint = function (terminal, next, orthogonal, border) {
            let point = mxGraphViewGetPerimeterPoint.apply(this, arguments);
            if (point != null) {
                let perimeter = this.getPerimeterFunction(terminal);

                if (terminal.text != null && terminal.text.boundingBox != null) {
                    let b = terminal.text.boundingBox.clone();
                    b.grow(3);

                    if (mx.mxUtils.rectangleIntersectsSegment(b, point, next)) {
                        point = perimeter(b, terminal, next, orthogonal);
                    }
                }
            }

            return point;
        }
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
