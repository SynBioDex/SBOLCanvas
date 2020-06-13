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

    protected async updateSelectedGlyphInfo(this: GraphService, info: GlyphInfo) {
        this.graph.getModel().beginUpdate();
        try {
            let selectedCells = this.graph.getSelectionCells();
            if (selectedCells.length > 1 || selectedCells.length == 0) {
                console.error("Trying to change info on too many or too few cells!");
                return;
            }
            let selectedCell = selectedCells[0];

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
                // if the uri changed, that means it could cause a cycle
                if (this.checkCycleUp(selectedCell, newGlyphURI)) {
                    // Tell the user a cycle isn't allowed
                    this.dialog.open(ErrorComponent, { data: "ComponentInstance objects MUST NOT form circular reference chains via their definition properties and parent ComponentDefinition objects." });
                    return;
                }

                let shouldDecouple = false;
                const coupledCells = this.getCoupledGlyphs(oldGlyphURI);
                const coupledContainers = this.getCoupledCircuitContainers(oldGlyphURI, true);
                // lots of cases to deal with
                let promptDecouple = false;
                for (let coupledCell of coupledCells) {
                    if (coupledCell != selectedCell && this.getParentInfo(coupledCell) && this.getParentInfo(selectedCell) &&
                        this.getParentInfo(coupledCell).getFullURI() != this.getParentInfo(selectedCell).getFullURI()) {
                        promptDecouple = true;
                    }
                }
                for (let coupledContainer of coupledContainers) {
                    if (coupledContainer != selectedCell && this.getParentInfo(coupledContainer) && this.getParentInfo(selectedCell) &&
                        this.getParentInfo(coupledContainer).getFullURI() != this.getParentInfo(selectedCell).getFullURI()) {
                        promptDecouple = true;
                    }
                }
                if (promptDecouple) {
                    // decoupleResult will be "Yes" if they should still be coupled, "No" if not
                    let decoupleResult = await this.promptDeCouple();
                    if (decoupleResult === "Yes") {
                        shouldDecouple = false;
                    } else if (decoupleResult === "No") {
                        shouldDecouple = true;
                    } else {
                        return;
                    }
                }

                let shouldCouple = false;
                let keepSubstructure = false;
                const conflictViewCell = this.graph.getModel().getCell(newGlyphURI);
                const conflictContainers = this.getCoupledCircuitContainers(newGlyphURI, true);
                if (conflictViewCell != null || conflictContainers.length > 0) {
                    // CoupleResult will be "Keep" if the current substructure should be kept, "Update" if the new substructure should be inherited
                    let coupleResult = await this.promptCouple();
                    shouldCouple = true;
                    if (coupleResult === "Keep") {
                        keepSubstructure = true;
                    } else if (coupleResult === "Update") {
                        keepSubstructure = false;
                    } else {
                        return;
                    }
                }

                if (shouldCouple && keepSubstructure && this.checkCycleDown(selectedCell, newGlyphURI)) {
                    // Tell the user a cycle isn't allowed
                    this.dialog.open(ErrorComponent, { data: "ComponentInstance objects MUST NOT form circular reference chains via their definition properties and parent ComponentDefinition objects." });
                    return;
                }

                // update the glyphDictionary
                if (!shouldDecouple) {
                    // we don't want to remove the old one if it will still be in use
                    this.removeFromGlyphDict(oldGlyphURI);
                }
                if (shouldCouple && keepSubstructure) {
                    // we need to remove the new one if we want to replace it with ours
                    this.removeFromGlyphDict(newGlyphURI);
                }
                if (!shouldCouple || keepSubstructure) {
                    // we only don't want to add if we are updating substructure
                    this.addToGlyphDict(info);
                }

                // update view cell and glyph/s
                let glyphZoomed;
                if (selectedCell.isCircuitContainer()) {
                    if (this.graph.getCurrentRoot().isComponentView()) {
                        // default case (we're zoomed into a component view)
                        glyphZoomed = this.selectionStack[this.selectionStack.length - 1];
                        this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));
                    } else {
                        // edge case (we're in a module view, and there is no view cell to update)
                        this.graph.getModel().setValue(selectedCell, newGlyphURI);
                    }
                }

                let viewCell = this.graph.getModel().getCell(oldGlyphURI);
                // if we're decoupling create a clone
                if (shouldDecouple) {
                    viewCell = this.graph.getModel().cloneCell(viewCell);
                }
                if (shouldCouple) {
                    if (keepSubstructure) {
                        // if we're coupling and keeping substructure, remove the conflict
                        // if we're in a module, the viewcell might not exist
                        if (viewCell) {
                            this.graph.getModel().remove(conflictViewCell);
                            this.updateViewCell(viewCell, newGlyphURI);
                        }
                    } else {
                        // if we're coupling and updating, remove the current substructure
                        this.graph.getModel().remove(viewCell);
                    }
                } else {
                    // otherwise update the view cell
                    this.updateViewCell(viewCell, newGlyphURI);
                }

                // update the selected glyph value
                if (!shouldDecouple) {
                    // if we were coupled, and don't want to decouple, update all coupled cells
                    const graph = this.graph;
                    coupledCells.forEach(function (cell) {
                        graph.getModel().setValue(cell, newGlyphURI);
                    });
                    coupledContainers.forEach(function (cell) {
                        graph.getModel().setValue(cell, newGlyphURI);
                    });
                    if (glyphZoomed) {
                        this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), glyphZoomed, this));
                    }
                } else if (glyphZoomed) {
                    // we came from a circuit container, so update the view cell, and zoom back in
                    this.graph.getModel().setValue(glyphZoomed, newGlyphURI);
                    this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), glyphZoomed, this));
                } else {
                    // if we want to decouple, just set the current cell
                    this.graph.getModel().setValue(selectedCell, newGlyphURI);
                }

                // update the glyph graphics
                let newCoupledCells = this.getCoupledGlyphs(newGlyphURI);
                info = this.getFromGlyphDict(newGlyphURI);
                this.mutateSequenceFeatureGlyph(info.partRole, newCoupledCells, this.graph);

                // sync the circuitcontainers
                if (selectedCell.isCircuitContainer()) {
                    if (!shouldCouple || keepSubstructure) {
                        this.syncCircuitContainer(selectedCell);
                    } else {
                        // we need to sync the conflicting container
                        if (conflictViewCell) {
                            // pull the circuit container out of the view cell
                            for (let circuitContainer of conflictViewCell.children) {
                                if (!circuitContainer.isCircuitContainer())
                                    continue;
                                this.syncCircuitContainer(circuitContainer);
                            }
                        } else {
                            // there was no view cell, so just take it from the list
                            this.syncCircuitContainer(conflictContainers[0]);
                        }
                    }
                } else {
                    viewCell = this.graph.getModel().getCell(newGlyphURI);
                    if (!viewCell)
                        viewCell = this.createViewCell(newGlyphURI);
                    if (!shouldCouple || keepSubstructure) {
                        // keeping substructure
                        for (let circuitContainer of viewCell.children) {
                            if (!circuitContainer.isCircuitContainer())
                                continue;
                            this.syncCircuitContainer(circuitContainer);
                        }
                    } else {
                        // replacing it, we need to find a circuit container that isn't from it's view cell
                        const cell1 = this.graph.getModel().getCell("1");
                        let circuitContainer = null;
                        for (let viewCell of cell1.children) {
                            if (viewCell.getId() != newGlyphURI) {
                                for (let viewChild of viewCell.children) {
                                    if (!viewChild.isCircuitContainer())
                                        continue;
                                    if (viewChild.getValue() === newGlyphURI) {
                                        circuitContainer = viewChild;
                                        break;
                                    }
                                }
                                if (circuitContainer)
                                    break;
                            }
                        }
                        this.syncCircuitContainer(circuitContainer);
                    }
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
            this.mutateSequenceFeatureGlyph(this.getFromGlyphDict(selectedCell.value).partRole, this.getCoupledGlyphs(selectedCell.value));

            // change the ownership
            this.changeOwnership(selectedCell.getValue());

            // update the view
            this.updateAngularMetadata(this.graph.getSelectionCells());
        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    protected async updateSelectedMolecularSpecies(this: GraphService, info: GlyphInfo){
        this.graph.getModel().beginUpdate();
        try {
            let selectedCells = this.graph.getSelectionCells();
            if (selectedCells.length > 1 || selectedCells.length == 0) {
                console.error("Trying to change info on too many or too few cells!");
                return;
            }
            let selectedCell = selectedCells[0];

            let oldGlyphURI = "";
            oldGlyphURI = selectedCell.value;
            info.uriPrefix = GlyphInfo.baseURI;
            let newGlyphURI = info.getFullURI();

            // check for ownership prompt
            let oldGlyphInfo = this.getFromGlyphDict(oldGlyphURI);
            if (oldGlyphInfo.uriPrefix != GlyphInfo.baseURI && !await this.promptMakeEditableCopy(oldGlyphInfo.displayID)) {
                return;
            }

            let shouldDecouple = false;
            if (oldGlyphURI != newGlyphURI) {
                let coupledMolecSpec = this.getCoupledMolecularSpecies(selectedCell.getValue());
                if(coupledMolecSpec.length > 1){
                    // decoupleResult will be "Yes" if they should still be coupled, "No" if not
                    let decoupleResult = await this.promptDeCouple();
                    if (decoupleResult === "Yes") {
                        shouldDecouple = false;
                    } else if (decoupleResult === "No") {
                        shouldDecouple = true;
                    } else {
                        return;
                    }
                }

                let shouldCouple = false;
                let keepSubstructure = false;
                let conflictMolecSpec = this.getCoupledMolecularSpecies(newGlyphURI);
                if (conflictMolecSpec.length > 0) {
                    // CoupleResult will be "Keep" if the current substructure should be kept, "Update" if the new substructure should be inherited
                    let coupleResult = await this.promptCouple();
                    shouldCouple = true;
                    if (coupleResult === "Keep") {
                        keepSubstructure = true;
                    } else if (coupleResult === "Update") {
                        keepSubstructure = false;
                    } else {
                        return;
                    }
                }

                if(!shouldDecouple){
                    this.removeFromGlyphDict(oldGlyphURI);
                }
                if(shouldCouple && keepSubstructure){
                        this.removeFromGlyphDict(newGlyphURI);
                        this.addToGlyphDict(info);
                }
                if (!shouldCouple || keepSubstructure) {
                    // we only don't want to add if we are updating substructure
                    this.addToGlyphDict(info);
                }

                if(shouldDecouple){
                    this.graph.getModel().setValue(selectedCell, newGlyphURI);
                }else{
                    for(let cell of coupledMolecSpec){
                        this.graph.getModel().setValue(cell, newGlyphURI);
                    }
                }

            }else{
                this.updateGlyphDict(info);
            }
        }finally{
            this.graph.getModel().endUpdate();
        }
    }

    /**
     * Call after any change to a circuit container to make sure module level strands are synced with their view cells.
     * I had hoped to avoid this with view cells, but because module containers can be aliased, a change in one should update the other.
     * @param cell The circuit container you need to keep in sync.
     */
    protected syncCircuitContainer(cell: mxCell) {
        let toReplace = [];
        const cell1 = this.graph.getModel().getCell("1");
        // find all the circuit containers
        for (let viewChild of cell1.children) {
            for (let containerChild of viewChild.children) {
                if (containerChild.isCircuitContainer() && containerChild.getId() != cell.getId() && containerChild.getValue() === cell.getValue()) {
                    toReplace.push(containerChild);
                }
            }
        }

        // copy the geometry into the clone and replace it
        for (let circuitContainer of toReplace) {
            let cellClone = this.graph.getModel().cloneCell(cell);
            let originalParent = circuitContainer.getParent();
            // copy the geometry
            cellClone.geometry = circuitContainer.geometry;

            // move the edges
            for (let glyph of circuitContainer.children) {
                if (!glyph.edges) {
                    continue;
                }
                let glyphIndex = circuitContainer.getIndex(glyph);
                for (let edge of glyph.edges) {

                    if (edge.source == glyph) {
                        this.graph.getModel().setTerminal(edge, cellClone.children[glyphIndex], true);
                    }
                    if (edge.target == glyph) {
                        this.graph.getModel().setTerminal(edge, cellClone.children[glyphIndex], false);
                    }
                }
            }
            this.graph.getModel().remove(circuitContainer);
            let cellAdded = this.graph.getModel().add(originalParent, cellClone);
            cellAdded.refreshCircuitContainer(this.graph);
        }
    }

    protected async promptCouple(): Promise<String> {
        // a cell with this display ID already exists prompt user if they want to couple them
        const confirmRef = this.dialog.open(ConfirmComponent, { data: { message: "A component with this URI already exists. Would you like to couple them and keep the current substructure, or update it?", options: ["Keep", "Update", "Cancel"] } });
        return await confirmRef.afterClosed().toPromise();
    }

    protected async promptDeCouple(): Promise<String> {
        // prompt the user if they want to keep the cells coupled
        const confirmRef = this.dialog.open(ConfirmComponent, { data: { message: "Other components are coupled with this one. Would you like to keep them coupled?", options: ["Yes", "No", "Cancel"] } });
        return confirmRef.afterClosed().toPromise();
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
                name = GraphBase.STYLE_INTERACTION + name;

                // Modify the style string
                let styleString = selectedCell.style.slice();
                if (!styleString.includes(';')) {
                    // nothing special needed, the original style only had the glyphStyleName
                    styleString = name;
                } else {
                    // the string is something like "strokecolor=#000000;interactionStyleName;fillcolor=#ffffff;etc;etc;"
                    // we only want to replace the 'glyphStyleName' bit
                    let startIdx = styleString.indexOf(GraphBase.STYLE_INTERACTION);
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
            let newStyleName = GraphBase.STYLE_SEQUENCE_FEATURE + name;

            // if there's no style for the partRole, use noGlyphAssigned
            let cellStyle = graph.getStylesheet().getCellStyle(newStyleName);
            // if there is no registered style for the newStyleName, getCellStyle returns an empty object.
            // all of our registered styles have several fields, use fillcolor as an example to check
            if (!cellStyle.fillColor)
                newStyleName = GraphBase.STYLE_SEQUENCE_FEATURE + GraphBase.STYLE_NGA;

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
                        let startIdx = styleString.indexOf(GraphBase.STYLE_SEQUENCE_FEATURE);
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

        console.debug("Undo manager: ");
        console.debug(this.editor.undoManager);

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
        let coupledCells = this.getCoupledGlyphs(root.getId());
        while (coupledCells.length > 0) {
            root = coupledCells[0].getParent().getParent();
            coupledCells = this.getCoupledGlyphs(root.getId());
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

    protected getCoupledGlyphs(glyphURI: string): mxCell[] {
        const coupledCells = [];
        for (let key in this.graph.getModel().cells) {
            const cell = this.graph.getModel().cells[key];
            if (cell.value === glyphURI && cell.isSequenceFeatureGlyph()) {
                coupledCells.push(cell);
            }
        }
        return coupledCells;
    }

    protected getCoupledCircuitContainers(glyphURI: string, onlyModuleContainers: boolean = false): mxCell[] {
        const coupledCells = [];
        const cell1 = this.graph.getModel().getCell("1");
        for (let viewCell of cell1.children) {
            if (onlyModuleContainers && viewCell.isComponentView())
                continue;
            for (let circuitContainer of viewCell.children) {
                if (!circuitContainer.isCircuitContainer())
                    continue;
                if (circuitContainer.value === glyphURI)
                    coupledCells.push(circuitContainer);
            }
        }
        return coupledCells;
    }

    protected getCoupledMolecularSpecies(glyphURI: string){
        const coupledCells = [];
        const cell1 = this.graph.getModel().getCell("1");
        for(let viewCell of cell1.children){
            if(viewCell.isComponentView())
                continue;
            for(let viewChild of viewCell.children){
                if(!viewChild.isMolecularSpeciesGlyph())
                    continue;
                if(viewChild.value === glyphURI)
                    coupledCells.push(viewChild);
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
        if (!cell || !cell.isViewCell()) {
            console.error("updateViewCell called on a non viewCell!");
            return;
        }
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
        if (!viewCell || viewCell.isViewCell()) {
            console.debug("Tried to remove a view cell that isn't a view cell!");
            return;
        }
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

    protected createViewCell(uri: string): mxCell {
        // construct the view cell
        const cell1 = this.graph.getModel().getCell(1);
        const childViewCell = this.graph.insertVertex(cell1, uri, '', 0, 0, 0, 0, GraphBase.STYLE_COMPONENT_VIEW);

        // add the backbone to the view cell
        const childCircuitContainer = this.graph.insertVertex(childViewCell, null, uri, 0, 0, 0, 0, GraphBase.STYLE_CIRCUIT_CONTAINER);
        const childCircuitContainerBackbone = this.graph.insertVertex(childCircuitContainer, null, '', 0, 0, 0, 0, GraphBase.STYLE_BACKBONE);

        childCircuitContainerBackbone.setConnectable(false);
        childCircuitContainer.setConnectable(false);

        return childViewCell;
    }
}
