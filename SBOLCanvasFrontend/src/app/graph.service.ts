/*
* GraphService
*
* This service controls the main editing canvas
*/

///// <reference path="./graph-base.ts"/>

import { Injectable } from '@angular/core';
import * as mxCell from 'mxgraph';
import { GlyphInfo } from './glyphInfo';
import { MetadataService } from './metadata.service';
import { GlyphService } from './glyph.service';
import { InteractionInfo } from './interactionInfo';
import { environment } from 'src/environments/environment';
import { MatDialog } from '@angular/material';
import { GraphEdits } from './graph-edits';
import { GraphBase, mx } from './graph-base';
import { GraphHelpers } from './graph-helpers';
import { StyleInfo } from './style-info';
import { ModuleInfo } from './moduleInfo';
import { Info } from './info';
import { CombinatorialInfo } from './combinatorialInfo';
import { EmbeddedService } from './embedded.service';
import { FilesService } from './files.service';

@Injectable({
    providedIn: 'root'
})
export class GraphService extends GraphHelpers {

    constructor(dialog: MatDialog, metadataService: MetadataService, glyphService: GlyphService, embeddedService: EmbeddedService, fileService: FilesService) {
        super(dialog, metadataService, glyphService);

        this.graph.getSelectionModel().addListener(mx.mxEvent.CHANGE, mx.mxUtils.bind(this, this.handleSelectionChange));


        // --- For when SBOLCanvas is embedded in another app ---

        // send changes in mxgraph model to parent
        this.graph.getModel().addListener(mx.mxEvent.CHANGE, mx.mxUtils.bind(this, () => {
            if (embeddedService.isAppEmbedded()) {
                console.debug('[GraphService] Model changed. Sending to parent.')
                fileService.exportDesignToString({}, 'SBOL2', this.getGraphXML()).subscribe(sbol => {
                    embeddedService.postMessage({ sbol })
                })
            }
        }))

        // observe changes in parent SBOL
        embeddedService.sbol.subscribe(sbolContent => {
            console.debug('[GraphService] Loading SBOL from external message...')
            fileService.convertToMxGraph(sbolContent).subscribe(result => {
                this.setGraphToXML(result)
                console.debug('[GraphService] Done.')

                // post message back letting parent know it loaded
                embeddedService.postMessage('graphServiceLoadedSBOL')
            })
        })
    }

    isSelectedAGlyph(): boolean {
        let selected = this.graph.getSelectionCells();
        if (selected.length != 1) {
            return false;
        }
        return selected[0].isSequenceFeatureGlyph();
    }

    isRootAComponentView(): boolean {
        return this.viewStack[0].isComponentView();
    }

    isComposite(sequenceFeature): boolean {
        if (!sequenceFeature || !sequenceFeature.isSequenceFeatureGlyph()) {
            return false;
        }
        return sequenceFeature.getCircuitContainer(this.graph).children.length > 1;
    }

    isVariant(sequenceFeature): boolean {
        if (!sequenceFeature || !sequenceFeature.isSequenceFeatureGlyph()) {
            return false;
        }
        let combinatorial = this.getCombinatorialWithTemplate(sequenceFeature.getParent().value);
        if (!combinatorial)
            return false;
        return combinatorial.getVariableComponentInfo(sequenceFeature.getId());
    }

    /**
     * Given the interaction type, checks the selected cells source and target to see if it's allowed.
     * @param interactionType 
     * @returns 
     */
    isInteractionTypeAllowed(interactionType: string): boolean {
        let selected = this.graph.getSelectionCells();
        if (selected.length > 1 || selected.length == 0 || (!selected[0].isInteraction() && !selected[0].isInteractionNode)) {
            return false;
        }

        if (selected[0].isInteraction()) {
            let result = this.validateInteraction(interactionType, selected[0].source, selected[0].target);
            if (result == null || result == '') {
                return true;
            } else {
                return false;
            }
        }

        if (selected[0].isInteractionNode()) {
            return interactionType == "Biochemical Reaction" || interactionType == "Dissociation" || interactionType == "Genetic Production" || interactionType == "Non-Covalent Binding";
        }

        return false;
    }

    isSelectedTargetEdge(): boolean {
        let selected = this.graph.getSelectionCells();
        if (selected.lengh > 1 || selected.length == 0 || !selected[0].isInteraction()) {
            return false;
        }

        return selected[0].target == null || !selected[0].target.isInteractionNode();
    }

    isSelectedSourceEdge(): boolean {
        let selected = this.graph.getSelectionCells();
        if (selected.lengh > 1 || selected.length == 0 || !selected[0].isInteraction()) {
            return false;
        }

        return selected[0].source == null || !selected[0].source.isInteractionNode();
    }

    /**
     * Recursively checks that all leaf children have sequences
     * @param sequenceFeature A cell representing a sequence feature
     */
    hasSequence(sequenceFeature): boolean {
        if (!sequenceFeature || !sequenceFeature.isSequenceFeatureGlyph()) {
            return false;
        }
        // check if the child view has more than just a backbone
        let circuitContainer = sequenceFeature.getCircuitContainer(this.graph);
        if (circuitContainer.children.length > 1) {
            for (let child of circuitContainer.children) {
                if (child.isSequenceFeatureGlyph() && !this.hasSequence(child)) {
                    return false;
                }
            }
            return true;
        }
        // no children? we must be a leaf node, check for a sequence
        let glyphInfo = (<GlyphInfo>this.getFromInfoDict(sequenceFeature.getValue()));
        if (!glyphInfo || !glyphInfo.sequence || glyphInfo.sequence.length <= 0) {
            return false;
        }
        return true;
    }

    /**
     * Forces the graph to redraw
     */
    repaint() {
        this.graph.refresh();
    }

    getSelectedCellID(): string {
        let selected = this.graph.getSelectionCells();
        if (selected.length != 1) {
            return null;
        }
        return selected[0].getId();
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
     * Changes all scars in a circuit container.
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
        let parentInfos = new Set<GlyphInfo>();
        for (let cell of selectionCells) {
            if (cell.isSequenceFeatureGlyph()) {
                // add the item to check ownership
                parentInfos.add(this.getParentInfo(cell));
            }
        }
        for (let parentInfo of Array.from(parentInfos.values())) {
            if (parentInfo.uriPrefix != environment.baseURI && !await this.promptMakeEditableCopy(parentInfo.displayID)) {
                return;
            }
        }

        try {
            this.graph.getModel().beginUpdate();

            for (let cell of selectionCells) {
                if (cell.isSequenceFeatureGlyph()) {

                    // Make the cell face east/west
                    let direction = this.graph.getCellStyle(cell)[mx.mxConstants.STYLE_DIRECTION];
                    console.debug("current glyph direction setting = " + direction);

                    if (direction == undefined) {
                        console.warn("direction style undefined. Assuming east, and turning to west");
                        this.graph.setCellStyles(mx.mxConstants.STYLE_DIRECTION, "west", [cell]);
                    } else if (direction === "east") {
                        this.graph.setCellStyles(mx.mxConstants.STYLE_DIRECTION, "west", [cell]);
                        console.debug("turning west");
                    } else if (direction == "west") {
                        this.graph.setCellStyles(mx.mxConstants.STYLE_DIRECTION, "east", [cell]);
                        console.debug("turning east");
                    }
                } else if (cell.isInteraction()) {
                    this.flipInteractionEdge(cell);
                } else if (cell.isInteractionNode()) {
                    let edges = this.graph.getModel().getEdges(cell);
                    for (let edge of edges) {
                        this.flipInteractionEdge(edge);
                    }
                }
            }

            // sync circuit containers
            let circuitContainers = [];
            for (let cell of selectionCells) {
                if (cell.isSequenceFeatureGlyph()) {
                    this.syncCircuitContainer(cell.getParent());
                }
            }

            for (let parentInfo of Array.from(parentInfos.values())) {
                // change the owner
                this.changeOwnership(parentInfo.getFullURI());
            }

        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    /**
     * "Drills in" to replace the canvas with the selected glyph's component/module view
     */
    enterGlyph() {
        let selection = this.graph.getSelectionCells();
        if (selection.length != 1) {
            return;
        }

        if (!selection[0].isSequenceFeatureGlyph() && !selection[0].isModule()) {
            return;
        }

        this.graph.getModel().beginUpdate();
        try {
            let viewCell = this.graph.getModel().getCell(selection[0].getValue());
            // doing this in the graph edit breaks things in the undo, so we put it here
            viewCell.refreshViewCell(this.graph);
            let zoomEdit = new GraphEdits.zoomEdit(this.graph.getView(), selection[0], this);
            this.graph.getModel().execute(zoomEdit);
        } finally {
            this.graph.getModel().endUpdate();
        }
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
                super.addToInfoDict(glyphInfo);
            } else {
                glyphInfo = this.getFromInfoDict(this.graph.getCurrentRoot().getId());
            }
            const circuitContainer = this.graph.insertVertex(this.graph.getDefaultParent(), null, glyphInfo.getFullURI(), x, y, GraphBase.sequenceFeatureGlyphWidth, GraphBase.sequenceFeatureGlyphHeight, GraphBase.STYLE_CIRCUIT_CONTAINER);
            const backbone = this.graph.insertVertex(circuitContainer, null, '', 0, GraphBase.sequenceFeatureGlyphHeight / 2, GraphBase.sequenceFeatureGlyphWidth, 1, GraphBase.STYLE_BACKBONE);

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
                    glyphInfo = this.getFromInfoDict(this.graph.getCurrentRoot().getId());
                } else {
                    glyphInfo = this.getFromInfoDict(container);
                }
                if (ownershipPrompt && glyphInfo.uriPrefix != environment.baseURI && !await this.promptMakeEditableCopy(glyphInfo.displayID)) {
                    return;
                }
            }
        }

        this.graph.getModel().beginUpdate();
        try {
            let circuitContainers = [];
            for (let cell of selectedCells) {
                if (cell.isSequenceFeatureGlyph()) {
                    circuitContainers.push(cell.getParent());

                    // if it's a sequence feature and it has a combinatorial, remove the variable component
                    if (cell.isSequenceFeatureGlyph()) {
                        let combinatorial = this.getCombinatorialWithTemplate(cell.getParent().getValue());
                        // TODO make this undoable
                        if (combinatorial)
                            combinatorial.removeVariableComponentInfo(cell.getId());
                    }
                } else if (cell.isCircuitContainer() && this.graph.getCurrentRoot() && this.graph.getCurrentRoot().isComponentView())
                    circuitContainers.push(cell);
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
                    } else {
                        let circuitContainer;
                        if (cell.isBackbone()) {
                            circuitContainer = cell.getParent();
                        } else if (cell.isCircuitContainer()) {
                            circuitContainer = cell;
                        }

                        // If we find a backbone is selected, add all it's children
                        if (circuitContainer.children) {
                            for (let child of circuitContainer.children) {
                                if (!child.isBackbone()) {
                                    newSelection.push(child);
                                }
                            }
                        }
                    }
                }
                this.graph.setSelectionCells(newSelection);
            }



            // remove interactions with modules if the item it connects to is being removed
            for (let selectedCell of selectedCells) {
                if (selectedCell.isCircuitContainer() || selectedCell.isMolecularSpeciesGlyph()) {
                    this.updateInteractions(selectedCell.getValue() + "_" + selectedCell.getId(), null);
                }
            }

            this.editor.execute('delete');

            this.trimUnreferencedCells();
            this.trimUnreferencedCombinatorials();
            this.trimUnreferencedInfos();

            // sync circuit containers
            for (let circuitContainer of circuitContainers) {
                this.syncCircuitContainer(circuitContainer);
            }

            // obtain ownership
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

        // clearing the selection avoids a lot of exceptions from mxgraph code for some reason.
        this.graph.clearSelection();
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

        this.graph.clearSelection();
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
                glyphInfo = this.getFromInfoDict(this.graph.getCurrentRoot().getId());
            } else if (this.atLeastOneCircuitContainerInGraph()) {
                // edge case that we're adding to a container in a module view
                if (!circuitContainer) {
                    circuitContainer = this.getClosestCircuitContainerToPoint(x, y);
                }
                glyphInfo = this.getFromInfoDict(circuitContainer.getValue());
            }
            if (glyphInfo && glyphInfo.uriPrefix != environment.baseURI && !await this.promptMakeEditableCopy(glyphInfo.displayID)) {
                return;
            }
        }

        this.graph.getModel().beginUpdate();
        try {
            // Make sure scars are/become visible if we're adding one
            if (name.includes(GraphBase.STYLE_SCAR) && !this.showingScars) {
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
            this.addToInfoDict(glyphInfo);

            // Insert new glyph and its components
            const sequenceFeatureCell = this.graph.insertVertex(circuitContainer, null, glyphInfo.getFullURI(), x, y, GraphBase.sequenceFeatureGlyphWidth, GraphBase.sequenceFeatureGlyphHeight, GraphBase.STYLE_SEQUENCE_FEATURE + name);

            this.createViewCell(glyphInfo.getFullURI());
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
                    glyphInfo = this.getFromInfoDict(this.graph.getCurrentRoot().getId());
                } else {
                    // edge case that we're adding to a container in a module view
                    glyphInfo = this.getFromInfoDict(circuitContainer.getValue());
                }
                if (glyphInfo.uriPrefix != environment.baseURI) {
                    this.changeOwnership(glyphInfo.getFullURI());
                }
            }

            // synchronize circuit containers
            this.syncCircuitContainer(circuitContainer);
        } finally {
            this.graph.getModel().endUpdate();
        }
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
            proteinInfo.partType = this.moleculeNameToType(name);
            this.addToInfoDict(proteinInfo);

            const molecularSpeciesGlyph = this.graph.insertVertex(this.graph.getDefaultParent(), null, proteinInfo.getFullURI(), x, y,
                GraphBase.molecularSpeciesGlyphWidth, GraphBase.molecularSpeciesGlyphHeight, GraphBase.STYLE_MOLECULAR_SPECIES + name);
            molecularSpeciesGlyph.setConnectable(true);

            // The new glyph should be selected
            this.graph.clearSelection();
            this.graph.setSelectionCell(molecularSpeciesGlyph);
        } finally {
            this.graph.getModel().endUpdate();
        }

        console.log(this.graph.getModel().cells);
    }

    makeInteractionNodeDragsource(element, stylename) {
        const insertGlyph = mx.mxUtils.bind(this, function (graph, evt, target, x, y) {
            this.addInteractionNodeAt(stylename, x - GraphBase.interactionNodeGlyphWidth / 2, y - GraphBase.interactionNodeGlyphHeight / 2);
        });
        this.makeGeneralDragsource(element, insertGlyph);
    }

    addInteractionNode(name) {
        const pt = this.getDefaultNewCellCoords();
        this.addInteractionNodeAt(name, pt.x, pt.y);
    }

    addInteractionNodeAt(name: string, x, y) {
        this.graph.getModel().beginUpdate();
        try {
            let interactionInfo = new InteractionInfo();
            const interactionNodeGlyph = this.graph.insertVertex(this.graph.getDefaultParent(), null, interactionInfo.getFullURI(), x, y,
                GraphBase.interactionNodeGlyphWidth, GraphBase.interactionNodeGlyphHeight, GraphBase.STYLE_INTERACTION_NODE + name);
            interactionInfo.interactionType = this.interactionNodeNametoType(name);
            this.addToInteractionDict(interactionInfo);
            interactionNodeGlyph.setConnectable(true);

            // The new glyph should be selected
            this.graph.clearSelection();
            this.graph.setSelectionCell(interactionNodeGlyph);
        } finally {
            this.graph.getModel().endUpdate();
        }
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
        const selectionCells = this.graph.getSelectionCells();
        if (selectionCells.length > 0 && selectionCells.length < 3) {
            let selectedCell = selectionCells[0];
            const selectedParent = selectedCell.getParent();
            if (selectedParent.geometry && !selectedParent.isViewCell()) {
                this.addInteractionAt(name, selectedParent.geometry.x + selectedCell.geometry.x + (selectedCell.geometry.width / 2),
                    selectedParent.geometry.y);
            } else {
                this.addInteractionAt(name, selectedCell.geometry.x + (selectedCell.geometry.width / 2),
                    selectedCell.geometry.y);
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
    async addInteractionAt(name: string, x, y) {
        let cell;

        this.graph.getModel().beginUpdate();
        try {
            let addToDictionary = true;
            let interactionInfo = new InteractionInfo();
            cell = new mx.mxCell(interactionInfo.getFullURI(), new mx.mxGeometry(x, y, 0, 0), GraphBase.STYLE_INTERACTION + name);

            const selectionCells = this.graph.getSelectionCells();
            if (selectionCells.length == 1) {

                // one cell is selected, set the edges source
                const selectedCell = this.graph.getSelectionCell();
                // check for any restrictions on valid edges
                let error = this.graph.getEdgeValidationError(cell, selectedCell, null);
                if (error) {
                    this.showError(error);
                    return;
                }
                if (selectedCell.isModule()) {
                    // if the cell is a module, we need to prompt what subpart we want to connect to
                    let result = await this.promptChooseFunctionalComponent(selectedCell, true);
                    if (!result)
                        return;
                    interactionInfo.fromURI[this.graph.getModel().nextId] = result;
                } else if (selectedCell.isInteractionNode()) {
                    // if the source is a interaction node, we want to inherit it's information
                    cell.value = selectedCell.value;
                    addToDictionary = false;
                    interactionInfo = this.getFromInteractionDict(selectedCell.value).makeCopy()
                }
                cell.geometry.setTerminalPoint(new mx.mxPoint(x, y - GraphBase.defaultInteractionSize), false);
                cell.edge = true;
                this.graph.addEdge(cell, this.graph.getCurrentRoot(), selectedCell, null);

            } else if (selectionCells.length == 2) {

                // two cells were selected, set the first one as the source, and the second as the target
                const sourceCell = selectionCells[0];
                const destCell = selectionCells[1];
                // check for restrictions on the edge
                let error = this.graph.getEdgeValidationError(cell, sourceCell, destCell);
                if (error) {
                    this.showError(error);
                    return;
                }
                // check source or target are interaction nodes to couple with them before making modifications to the interaction
                // don't worry, edge validation rules prevent both from being interaction nodes.
                if (sourceCell.isInteractionNode()) {
                    // inherit the information 
                    cell.value = sourceCell.value;
                    addToDictionary = false;
                    interactionInfo = this.getFromInteractionDict(sourceCell.value).makeCopy();
                }
                if (destCell.isInteractionNode()) {
                    // inherit the information
                    cell.value = destCell.value;
                    addToDictionary = false;
                    interactionInfo = this.getFromInteractionDict(destCell.value).makeCopy();
                }

                if (sourceCell.isModule()) {
                    // prompt for the subpart to keep track of
                    let result = await this.promptChooseFunctionalComponent(sourceCell, true);
                    if (!result)
                        return;
                    interactionInfo.fromURI[this.graph.getModel().nextId] = result;
                }
                if (destCell.isModule()) {
                    // prompt for the subpart to keep track of
                    let result = await this.promptChooseFunctionalComponent(destCell, false);
                    if (!result)
                        return;
                    interactionInfo.toURI[this.graph.getModel().nextId] = result;
                }
                cell.edge = true;
                this.graph.addEdge(cell, this.graph.getCurrentRoot(), sourceCell, destCell);

            } else {
                cell.geometry.setTerminalPoint(new mx.mxPoint(x, y + GraphBase.defaultInteractionSize), true);
                cell.geometry.setTerminalPoint(new mx.mxPoint(x + GraphBase.defaultInteractionSize, y), false);
                cell.edge = true;
                this.graph.addEdge(cell, this.graph.getCurrentRoot(), null, null);
            }


            // Default name for a process interaction
            if (name == "Process") {
                name = "Genetic Production"
            }

            if (addToDictionary) {
                interactionInfo.interactionType = name;
                this.addToInteractionDict(interactionInfo);
            } else {
                this.updateInteractionDict(interactionInfo);
                this.mutateInteractionGlyph(interactionInfo.interactionType, cell);
            }

            // The new glyph should be selected
            this.graph.clearSelection();
            this.graph.setSelectionCell(cell);
        } finally {
            this.graph.getModel().endUpdate();
        }

        return cell;
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
            const cell = this.graph.insertVertex(this.graph.getDefaultParent(), null, 'Sample Text', x, y, GraphBase.defaultTextWidth, GraphBase.defaultTextHeight, GraphBase.STYLE_TEXTBOX);
            cell.setConnectable(false);

            // The new cell should be selected
            this.graph.clearSelection();
            this.graph.setSelectionCell(cell);
        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    makeModuleDragsource(element) {
        const insert = mx.mxUtils.bind(this, function (graph, evt, target, x, y) {
            this.addModuleAt(x - GraphBase.defaultModuleWidth / 2, y - GraphBase.defaultModuleHeight / 2);
        });
        this.makeGeneralDragsource(element, insert);
    }

    addModule() {
        const pt = this.getDefaultNewCellCoords();
        this.addModuleAt(pt.x, pt.y);
    }

    addModuleAt(x, y) {
        this.graph.getModel().beginUpdate();
        try {
            let moduleInfo = new ModuleInfo();
            this.addToInfoDict(moduleInfo);

            const moduleCell = this.graph.insertVertex(this.graph.getDefaultParent(), null, moduleInfo.getFullURI(), x, y, GraphBase.defaultModuleWidth, GraphBase.defaultModuleHeight, GraphBase.STYLE_MODULE);
            moduleCell.setConnectable(true);

            this.createViewCell(moduleInfo.getFullURI(), true);

            this.graph.clearSelection();
            this.graph.setSelectionCell(moduleCell);
        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    /**
     * Find the selected cell, and if there is a glyph selected, update its metadata.
     */
    async setSelectedCellInfo(info: Info) {
        const selectedCell = this.graph.getSelectionCell();

        this.graph.getModel().beginUpdate();
        try {
            // figure out which type of info object it is
            if (info instanceof ModuleInfo && (!selectedCell || selectedCell.isModule())) {
                this.updateSelectedModuleInfo(info);
                return;
            }

            if (info instanceof GlyphInfo && (!selectedCell || selectedCell.isSequenceFeatureGlyph() || selectedCell.isCircuitContainer() || selectedCell.isMolecularSpeciesGlyph())) {
                if (!selectedCell || !selectedCell.isMolecularSpeciesGlyph()) {
                    // The logic for updating the glyphs was getting a bit big, so I moved it into it's own method
                    this.updateSelectedGlyphInfo(info);
                } else {
                    this.updateSelectedMolecularSpecies(info);
                }
                return;
            }

            if (info instanceof InteractionInfo && (selectedCell.isInteraction() || selectedCell.isInteractionNode())) {
                this.updateSelectedInteractionInfo(info);
            }

        } finally {
            this.graph.getModel().endUpdate();
            this.graph.refresh(selectedCell);
            //this.updateAngularMetadata(this.graph.getSelectionCells());
        }
    }

    /**
     * Sets the combinatorial info associated to the selected cell
     * @param info 
     * @param prevURI 
     */
    setSelectedCombinatorialInfo(info: CombinatorialInfo, prevURI?: string) {
        const selectedCell = this.graph.getSelectionCell();

        this.graph.getModel().beginUpdate();
        try {
            if (info instanceof CombinatorialInfo && selectedCell.isSequenceFeatureGlyph()) {
                if (!prevURI) {
                    prevURI = info.getFullURI();
                }
                this.updateSelectedCombinatorialInfo(info, prevURI);
            }
        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    setSelectedCellStyle(styleInfo: StyleInfo) {
        this.graph.getModel().beginUpdate();
        try {
            let selectedCells = this.graph.getSelectionCells().slice();
            // filter out the circuit containers
            for (let i = 0; i < selectedCells.length; i++) {
                if (selectedCells[i].isCircuitContainer()) {
                    selectedCells[i] = selectedCells[i].getBackbone();
                }
            }
            for (let key in styleInfo.styles) {
                this.graph.setCellStyles(key, styleInfo.styles[key], selectedCells);
            }

            // sync circuit containers
            let circuitContainers = new Set<mxCell>();
            for (let cell of selectedCells) {
                if (cell.isSequenceFeatureGlyph() || cell.isBackbone()) {
                    circuitContainers.add(cell.getParent());
                }
            }
            for (let circuitContainer of Array.from(circuitContainers.values())) {
                this.syncCircuitContainer(circuitContainer);
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
        GraphBase.unFormatedCells.clear();
        this.graph.home();
        this.graph.getModel().clear();

        const doc = mx.mxUtils.parseXml(graphString);
        const codec = new mx.mxCodec(doc);
        codec.decode(doc.documentElement, this.graph.getModel());

        // The child of cell 1 that isn't a view cell points to the root view
        const cell1 = this.graph.getModel().getCell("1");
        let viewCells = this.graph.getModel().getChildren(cell1);
        let rootViewCell;
        for (let child of viewCells) {
            if (!child.isViewCell()) {
                rootViewCell = this.graph.getModel().getCell(child.getValue());
                this.graph.getModel().remove(child);
                break;
            }
        }
        this.graph.enterGroup(rootViewCell);
        this.viewStack = [];
        this.viewStack.push(rootViewCell);
        this.selectionStack = [];

        let children = this.graph.getModel().getChildren(this.graph.getDefaultParent());
        if (children) {
            children.forEach(element => {
                if (element.isCircuitContainer())
                    element.refreshCircuitContainer(this.graph);
            });
        }

        if (GraphBase.unFormatedCells.size > 0) {
            console.log("FORMATTING !!!!!!!!!!!!!!!!");
            this.autoFormat(GraphBase.unFormatedCells);
            GraphBase.unFormatedCells.clear();
        }

        this.fitCamera();

        this.metadataService.setComponentDefinitionMode(this.graph.getCurrentRoot().isComponentView());

        // top level compDefs may not have cells referencing them, but they still end up with view cells for other reasons
        this.trimUnreferencedCells();

        this.editor.undoManager.clear();

        this.graph.refresh(); // for some reason unformatted edges don't render correctly the first time without this
    }

    /**
     * Decodes the given string (xml) representation of a cell
     * and uses it ot replace the currently selected cell
     * @param cellString
     */
    async setSelectedToXML(cellString: string) {
        const selectionCells = this.graph.getSelectionCells();

        if (selectionCells.length == 0 || (selectionCells.length == 1 && (selectionCells[0].isSequenceFeatureGlyph() || selectionCells[0].isCircuitContainer() || selectionCells[0].isModule()))) {
            // We're making a new cell to replace the selected one
            let selectedCell;
            if (selectionCells.length > 0) {
                selectedCell = selectionCells[0];
            } else {
                // nothing selected means we're replacing the view cell
                selectedCell = this.graph.getCurrentRoot();
            }

            this.graph.getModel().beginUpdate();
            try {
                let inModuleView = this.graph.getCurrentRoot().isModuleView();

                // prompt ownership change
                let parentInfo = this.getParentInfo(selectedCell);
                if (parentInfo && parentInfo.uriPrefix != environment.baseURI && !await this.promptMakeEditableCopy(parentInfo.displayID)) {
                    return;
                }

                // change ownership
                if (parentInfo) {
                    if (selectedCell.isViewCell()) {
                        this.changeOwnership(parentInfo.getFullURI());
                        selectedCell = this.graph.getCurrentRoot();
                    } else if (selectedCell.isCircuitContainer() || selectedCell.isModule()) {
                        let selectedIndex = selectedCell.getParent().getIndex(selectedCell);
                        this.changeOwnership(parentInfo.getFullURI());
                        selectedCell = this.graph.getCurrentRoot().children[selectedIndex];
                    } else {
                        let parentIndex = this.graph.getCurrentRoot().getIndex(selectedCell.getParent());
                        let selectedIndex = selectedCell.getParent().getIndex(selectedCell);
                        this.changeOwnership(parentInfo.getFullURI());
                        selectedCell = this.graph.getCurrentRoot().children[parentIndex].children[selectedIndex];
                    }
                }

                // if we're in a non top level circuit container, module, or view cell zoom out to make things easier
                let zoomOut = false;
                if (((selectedCell.isCircuitContainer() || selectedCell.isComponentView()) && this.graph.getCurrentRoot().isComponentView() && this.viewStack.length > 1) ||
                    ((selectedCell.isModule() || selectedCell.isModuleView()) && this.viewStack.length > 1)) {
                    zoomOut = true;
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
                    if (this.getCoupledGlyphs(selectedCell.value).length < 2) {
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
                } else if (selectedCell.isModule()) {
                    // store old cell's parent
                    origParent = selectedCell.getParent();

                    // generated cells don't have a proper geometry
                    newCell.setStyle(selectedCell.getStyle());
                    this.graph.getModel().setGeometry(newCell, selectedCell.geometry);

                    // add new cell to the graph
                    this.graph.getModel().add(origParent, newCell, origParent.getIndex(selectedCell));

                    // remove the old cell's view cell if it doesn't have any references
                    if (this.getCoupledModules(selectedCell.value).length < 2) {
                        this.removeViewCell(this.graph.getModel().getCell(selectedCell.value));
                    }

                    // remove the old cell
                    this.graph.getModel().remove(selectedCell);
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
                    if (this.getFromInfoDict(viewCells[i].getId()) != null) {
                        this.removeFromInfoDict(viewCells[i].getId());
                    }
                    this.addToInfoDict(subGlyphDict[GraphBase.INFO_DICT_INDEX][viewCells[i].getId()]);

                    // add any molecular species or interactions to the info dict
                    for (let child of viewClone.children) {
                        if (child.isMolecularSpeciesGlyph()) {
                            if (this.getFromInfoDict(child.value) != null) {
                                this.removeFromInfoDict(child.value);
                            }
                            this.addToInfoDict(subGlyphDict[GraphBase.INFO_DICT_INDEX][child.value]);
                        } else if (child.isInteractionNode()) {
                            if (this.getFromInteractionDict(child.value) != null) {
                                this.removeFromInteractionDict(child.value);
                            }
                            this.addToInteractionDict(subGlyphDict[GraphBase.INTERACTION_DICT_INDEX][child.value]);
                        } else if (child.isInteraction()) {
                            // if either end is an interaction node, we don't need to bother
                            if ((child.source && child.source.isInteractionNode()) || (child.target && child.target.isInteractionNode())) {
                                continue;
                            }
                            if (this.getFromInteractionDict(child.value) != null) {
                                this.removeFromInteractionDict(child.value);
                            }
                            this.addToInteractionDict(subGlyphDict[GraphBase.INTERACTION_DICT_INDEX][child.value]);
                        }
                    }
                }

                // relink the interactions now that their ID's have likely changed
                for (let i = 1; i < viewCells.length; i++) {
                    let viewClone = this.graph.getModel().getCell(viewCells[i].getId());
                    for (let j = 0; j < viewClone.children.length; j++) {
                        // for now it seems that cloning the cell keeps the child order in tact
                        let child = viewClone.children[j];
                        let originalChild = viewCells[i].children[j];
                        if (child.isInteractionNode()) {
                            // copy to new dict as new id's may conflict with old
                            let newTo = []
                            let newFrom = []
                            let newSource = []
                            let newTarget = []
                            let infoCopy = this.getFromInteractionDict(child.value).makeCopy();
                            for (let k = 0; k < child.edges.length; k++) {
                                let edge = child.edges[k];
                                let originalEdge = originalChild.edges[k];
                                if (infoCopy.toURI[originalEdge.getId()]) {
                                    // find the original cell
                                    let cellRef = infoCopy.toURI[originalEdge.getId()];
                                    let oldCell = subGraph.getModel().getCell(cellRef.substring(cellRef.lastIndexOf("_") + 1));
                                    let oldParentView = oldCell.getParent();
                                    let newParentView = this.graph.getModel().getCell(oldParentView.getId());
                                    // replace with the new id
                                    newTo[edge.getId()] = cellRef.substring(0, cellRef.lastIndexOf("_") + 1) + newParentView.children[oldParentView.getIndex(oldCell)].getId();
                                }
                                if (infoCopy.fromURI[originalEdge.getId()]) {
                                    // find the original cell
                                    let cellRef = infoCopy.fromURI[originalEdge.getId()];
                                    let oldCell = subGraph.getModel().getCell(cellRef.substring(cellRef.lastIndexOf("_") + 1));
                                    let oldParentView = oldCell.getParent();
                                    let newParentView = this.graph.getModel().getCell(oldParentView.getId());
                                    // replace with the new id
                                    newFrom[edge.getId()] = cellRef.substring(0, cellRef.lastIndexOf("_") + 1) + newParentView.children[oldParentView.getIndex(oldCell)].getId();
                                }
                                if (infoCopy.sourceRefinement[originalEdge.getId()]) {
                                    newSource[edge.getId()] = infoCopy.sourceRefinement[originalEdge.getId()];
                                }
                                if (infoCopy.targetRefinement[originalEdge.getId()]) {
                                    newTarget[edge.getId()] = infoCopy.targetRefinement[originalEdge.getId()];
                                }
                            }
                            infoCopy.toURI = newTo;
                            infoCopy.fromURI = newFrom;
                            infoCopy.sourceRefinement = newSource;
                            infoCopy.targetRefinement = newTarget;
                            this.updateInteractionDict(infoCopy);
                        }
                        if (child.isInteraction()) {
                            // skip edges connected to interaction nodes
                            if ((child.source && child.source.isInteractionNode()) || (child.target && child.target.isInteractionNode())) {
                                continue;
                            }
                            let infoCopy = this.getFromInteractionDict(child.value).makeCopy();
                            if (infoCopy.fromURI[originalChild.getId()]) {
                                let cellRef = infoCopy.fromURI[originalChild.getId()];
                                delete infoCopy.fromURI[originalChild.getId()];
                                let oldCell = subGraph.getModel().getCell(cellRef.substring(cellRef.lastIndexOf("_") + 1));
                                let oldParentView = oldCell.getParent();
                                let newParentView = this.graph.getModel().getCell(oldParentView.getId());
                                infoCopy.fromURI[child.getId()] = cellRef.substring(0, cellRef.lastIndexOf("_") + 1) + newParentView.children[oldParentView.getIndex(oldCell)].getId();;
                            }
                            if (infoCopy.toURI[originalChild.getId()]) {
                                let cellRef = infoCopy.toURI[originalChild.getId()];
                                delete infoCopy.toURI[originalChild.getId()];
                                let oldCell = subGraph.getModel().getCell(cellRef.substring(cellRef.lastIndexOf("_") + 1));
                                let oldParentView = oldCell.getParent();
                                let newParentView = this.graph.getModel().getCell(oldParentView.getId());
                                infoCopy.toURI[child.getId()] = cellRef.substring(0, cellRef.lastIndexOf("_") + 1) + newParentView.children[oldParentView.getIndex(oldCell)].getId();;
                            }
                            if (infoCopy.sourceRefinement[originalChild.getId()]) {
                                let value = infoCopy.sourceRefinement[originalChild.getId()];
                                delete infoCopy.sourceRefinement[originalChild.getId()];
                                infoCopy.sourceRefinement[child.getId()] = value;
                            }
                            if (infoCopy.targetRefinement[originalChild.getId()]) {
                                let value = infoCopy.targetRefinement[originalChild.getId()];
                                delete infoCopy.targetRefinement[originalChild.getId()];
                                infoCopy.targetRefinement[child.getId()] = value;
                            }
                            this.updateInteractionDict(infoCopy);
                        }
                    }
                }

                if (selectedCell.isSequenceFeatureGlyph()) {
                    origParent.refreshCircuitContainer(this.graph);
                    this.graph.setSelectionCell(newCell);
                    this.mutateSequenceFeatureGlyph((<GlyphInfo>this.getFromInfoDict(newCell.value)).partRole);
                }

                // if we zoomed out zoom back in
                if (zoomOut) {
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
                            if (this.getCoupledGlyphs(newRootView.getId()).length < 1)
                                // we don't need the root view if nothing references it, we only need it's circuit container
                                this.graph.getModel().remove(newRootView);
                            circuitContainer = this.graph.getModel().add(selectedCell.getParent(), circuitContainer);
                            this.graph.getModel().remove(selectedCell);
                            circuitContainer.refreshCircuitContainer(this.graph);
                        } else {
                            // at the root, just zoom back in
                            this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), newRootView, this));
                            circuitContainer.refreshCircuitContainer(this.graph);
                        }
                    }
                }

                // root cells won't be zoomed out, so just zoom into the correct one, and remove the old one
                if (selectedCell.isViewCell()) {
                    let newViewId = newCell.getValue();
                    const newView = this.graph.getModel().getCell(newViewId);
                    this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));
                    this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), newView, this));
                    this.removeViewCell(selectedCell);
                }

                // top level circuit containers need to be synced to get the changes before the trim
                if (selectedCell.isCircuitContainer()) {
                    let previousReference = selectedCell.getValue() + "_" + selectedCell.getId();
                    let selectedParent = selectedCell.getParent();
                    let selectedIndex = selectedParent.getIndex(selectedCell);
                    this.graph.getModel().setValue(selectedCell, newCell.getValue());
                    const viewCell = this.graph.getModel().getCell(newCell.getValue());
                    if (viewCell.children) {
                        for (let viewChild of viewCell.children) {
                            if (viewChild.isCircuitContainer()) {
                                this.syncCircuitContainer(viewChild);
                                break;
                            }
                        }
                    }
                    selectedCell = selectedParent.children[selectedIndex];
                    this.updateInteractions(previousReference, newCell.getValue() + "_" + selectedCell.getId());
                }

                if (GraphBase.unFormatedCells.size > 0) {
                    console.log("FORMATTING !!!!!!!!!!!!!!!!");
                    this.autoFormat(GraphBase.unFormatedCells);
                    GraphBase.unFormatedCells.clear();
                }

                // sync circuit containers
                if (origParent) {
                    this.syncCircuitContainer(origParent);
                }

                this.trimUnreferencedCells();
            } finally {
                this.graph.getModel().endUpdate();
            }
        }
    }

    resetGraph(moduleMode: boolean = true) {
        this.graph.home();
        this.graph.getModel().clear();

        this.viewStack = [];
        this.selectionStack = [];

        // initalize the GlyphInfoDictionary
        const cell0 = this.graph.getModel().getCell(0);
        const infoDict = [];
        const combinatorialDict = [];
        var dataContainer = [];
        dataContainer[GraphBase.INFO_DICT_INDEX] = infoDict;
        dataContainer[GraphBase.COMBINATORIAL_DICT_INDEX] = combinatorialDict;
        this.graph.getModel().setValue(cell0, dataContainer);

        const cell1 = this.graph.getModel().getCell(1);
        let rootViewCell;

        // initalize the root view cell of the graph
        if (moduleMode) {
            let rootModuleInfo = new ModuleInfo();
            this.addToInfoDict(rootModuleInfo);
            rootViewCell = this.graph.insertVertex(cell1, rootModuleInfo.getFullURI(), "", 0, 0, 0, 0, GraphBase.STYLE_MODULE_VIEW);
            this.graph.enterGroup(rootViewCell);
            this.viewStack.push(rootViewCell);
        } else {
            let info = new GlyphInfo();
            this.addToInfoDict(info);
            rootViewCell = this.graph.insertVertex(cell1, info.getFullURI(), "", 0, 0, 0, 0, GraphBase.STYLE_COMPONENT_VIEW);
            this.graph.enterGroup(rootViewCell);
            this.viewStack.push(rootViewCell);
            this.addBackbone();
        }

        this.metadataService.setComponentDefinitionMode(!moduleMode);

        this.updateAngularMetadata(this.graph.getSelectionCells());

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


    public lookupInfo(glyphURI: string) {
        return this.getFromInfoDict(glyphURI) as GlyphInfo
    }

    public getCurrentRoot() {
        return this.graph.getCurrentRoot()
    }

}
