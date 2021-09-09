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
import { environment } from 'src/environments/environment';
import { Info } from './info';
import { ModuleInfo } from './moduleInfo';
import { FuncCompSelectorComponent } from './func-comp-selector/func-comp-selector.component';
import { CombinatorialInfo } from './combinatorialInfo';
import { VariableComponentInfo } from './variableComponentInfo';
import { IdentifiedInfo } from './identifiedInfo';
import { InteractionInfo } from './interactionInfo';
import { SystemJsNgModuleLoader } from '@angular/core';

/**
 * Extension of the graph base that should contain helper methods to be used in the GraphService.
 * These methods should (in theory) not be used outside of the GraphService. If you make a helper
 * that needs one of the methods in the GraphService, add "this: GraphService" as the first argument.
 * Note that doing so will make the helper only usable in the GraphService.
 */
export class GraphHelpers extends GraphBase {

    constructor(public dialog: MatDialog, protected metadataService: MetadataService, glyphService: GlyphService) {
        super(glyphService);

        // initalize the GlyphInfoDictionary
        const cell0 = this.graph.getModel().getCell(0);
        const infoDict = [];
        const combinatorialDict = [];
        const interactionDict = [];
        var dataContainer = [];
        dataContainer[GraphBase.INFO_DICT_INDEX] = infoDict;
        dataContainer[GraphBase.COMBINATORIAL_DICT_INDEX] = combinatorialDict;
        dataContainer[GraphBase.INTERACTION_DICT_INDEX] = interactionDict;
        this.graph.getModel().setValue(cell0, dataContainer);

        // initalize the root view cell of the graph
        const cell1 = this.graph.getModel().getCell(1);
        const rootModuleInfo = new ModuleInfo();
        this.addToInfoDict(rootModuleInfo);
        const rootViewCell = this.graph.insertVertex(cell1, rootModuleInfo.getFullURI(), "", 0, 0, 0, 0, GraphBase.STYLE_MODULE_VIEW);
        this.graph.enterGroup(rootViewCell);
        this.viewStack = [];
        this.viewStack.push(rootViewCell);
        this.selectionStack = [];


        // don't let any of the setup be on the undo stack
        this.editor.undoManager.clear();

        this.updateAngularMetadata(this.graph.getSelectionCells());

        this.initLabelDrawing();
    }

    protected getParentInfo(cell: mxCell): GlyphInfo {
        let glyphInfo;
        if (cell.isCircuitContainer() || cell.isModule()) {
            glyphInfo = this.getFromInfoDict(cell.getParent().getId());
        } else if (cell.isViewCell()) {
            if (this.viewStack.length > 1) {
                // has a parent that might need to change
                glyphInfo = this.getFromInfoDict(this.selectionStack[this.selectionStack.length - 1].getParent().getValue());
            }
        } else {
            glyphInfo = this.getFromInfoDict(cell.getParent().getValue());
        }
        return glyphInfo;
    }

    protected async updateSelectedGlyphInfo(this: GraphService, info: GlyphInfo) {
        this.graph.getModel().beginUpdate();
        try {
            let selectedCells = this.graph.getSelectionCells();
            if (selectedCells.length > 1 || selectedCells.length < 0) {
                console.error("Trying to change info on too many or too few cells!");
                return;
            }
            let selectedCell;
            if (selectedCells.length == 0) {
                selectedCell = this.graph.getCurrentRoot();
            } else {
                selectedCell = selectedCells[0];
            }

            let oldGlyphURI;
            if (selectedCell.isViewCell()) {
                oldGlyphURI = selectedCell.getId();
            } else {
                oldGlyphURI = selectedCell.value;
            }
            info.uriPrefix = environment.baseURI;
            let newGlyphURI = info.getFullURI();

            // check for ownership prompt
            let oldGlyphInfo = this.getFromInfoDict(oldGlyphURI);
            if (oldGlyphInfo.uriPrefix != environment.baseURI && !await this.promptMakeEditableCopy(oldGlyphInfo.displayID)) {
                return;
            }

            if (oldGlyphURI != newGlyphURI) {
                // check for module definition conflict
                if (this.isDuplicateURI(newGlyphURI, true)) {
                    return;
                }

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
                    if (coupledCell != selectedCell && (selectedCell.isSequenceFeatureGlyph() ||
                        ((selectedCell.isCircuitContainer() || selectedCell.isViewCell()) && this.selectionStack.length > 0 && coupledCell != this.selectionStack[this.selectionStack.length - 1]))) {
                        promptDecouple = true;
                        break;
                    }
                }
                if (!promptDecouple) {
                    for (let coupledContainer of coupledContainers) {
                        if (coupledContainer != selectedCell && this.getParentInfo(coupledContainer) && this.getParentInfo(selectedCell) &&
                            this.getParentInfo(coupledContainer).getFullURI() != this.getParentInfo(selectedCell).getFullURI()) {
                            promptDecouple = true;
                            break;
                        }
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
                    this.removeFromInfoDict(oldGlyphURI);
                }
                if (shouldCouple && keepSubstructure) {
                    // we need to remove the new one if we want to replace it with ours
                    this.removeFromInfoDict(newGlyphURI);
                }
                if (!shouldCouple || keepSubstructure) {
                    // we only don't want to add if we are updating substructure
                    this.addToInfoDict(info);
                }

                // update view cell and glyph/s
                let glyphZoomed;
                if (selectedCell.isCircuitContainer() || selectedCell.isViewCell()) {
                    if (this.graph.getCurrentRoot().isComponentView()) {
                        if (this.selectionStack.length > 0) {
                            // default case (we're zoomed into a component view)
                            glyphZoomed = this.selectionStack[this.selectionStack.length - 1];
                        } else {
                            // top level container
                            glyphZoomed = selectedCell;
                        }
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

                    // also move any combinatorials over to it
                    this.updateCombinatorialTemplate(oldGlyphURI, newGlyphURI);
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
                        if (glyphZoomed.isViewCell()) {
                            let newViewCell = this.graph.getModel().getCell(newGlyphURI);
                            this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), newViewCell, this));
                        } else {
                            this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), glyphZoomed, this));
                        }
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
                info = <GlyphInfo>this.getFromInfoDict(newGlyphURI);
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
                        if (circuitContainer != null) {
                            this.syncCircuitContainer(circuitContainer);
                        }
                    }
                }

                this.updateInteractions(oldGlyphURI + "_" + selectedCell.getId(), newGlyphURI + "_" + selectedCell.getId());

                // remove the old combinatorial if oldURI no longer points to anything
                this.trimUnreferencedCombinatorials();

                // update the ownership
                if (selectedCell.isCircuitContainer() || selectedCell.isViewCell()) {
                    this.changeOwnership(newGlyphURI, true)
                } else {
                    this.changeOwnership(selectedCell.getValue(), true);
                }
                return;
            }

            //let glyphEdit = new GraphService.glyphEdit(info);
            this.updateInfoDict(info);

            // there may be coupled cells that need to also be mutated
            // the glyphInfo may be different than info, so use getFromGlyphDict
            this.mutateSequenceFeatureGlyph((<GlyphInfo>this.getFromInfoDict(selectedCell.value)).partRole, this.getCoupledGlyphs(selectedCell.value));

            // change the ownership
            this.changeOwnership(selectedCell.getValue());

        } finally {
            this.graph.getModel().endUpdate();
            this.updateAngularMetadata(this.graph.getSelectionCells());
        }
    }

    protected async updateSelectedMolecularSpecies(this: GraphService, info: GlyphInfo) {
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
            info.uriPrefix = environment.baseURI;
            let newGlyphURI = info.getFullURI();

            // check for ownership prompt
            let oldGlyphInfo = this.getFromInfoDict(oldGlyphURI);
            if (oldGlyphInfo.uriPrefix != environment.baseURI && !await this.promptMakeEditableCopy(oldGlyphInfo.displayID)) {
                return;
            }

            let shouldDecouple = false;
            if (oldGlyphURI != newGlyphURI) {
                let coupledMolecSpec = this.getCoupledMolecularSpecies(selectedCell.getValue());
                if (coupledMolecSpec.length > 1) {
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

                if (!shouldDecouple) {
                    this.removeFromInfoDict(oldGlyphURI);
                }
                if (shouldCouple && keepSubstructure) {
                    this.removeFromInfoDict(newGlyphURI);
                    this.addToInfoDict(info);
                }
                if (!shouldCouple || keepSubstructure) {
                    // we only don't want to add if we are updating substructure
                    this.addToInfoDict(info);
                }

                if (shouldDecouple) {
                    this.graph.getModel().setValue(selectedCell, newGlyphURI);
                } else {
                    for (let cell of coupledMolecSpec) {
                        this.graph.getModel().setValue(cell, newGlyphURI);
                    }
                }

                this.updateInteractions(oldGlyphURI + "_" + selectedCell.getId(), newGlyphURI + "_" + selectedCell.getId());

            } else {
                this.updateInfoDict(info);
            }
        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    protected async updateSelectedModuleInfo(this: GraphService, info: ModuleInfo) {
        this.graph.getModel().beginUpdate();
        try {
            let selectedCells = this.graph.getSelectionCells();
            if (selectedCells.length > 1 || selectedCells.length < 0) {
                console.error("Trying to change info on too many or too few cells!");
                return;
            }

            let selectedCell;
            let oldModuleURI;
            if (selectedCells.length == 1) {
                selectedCell = selectedCells[0];
                oldModuleURI = selectedCell.value;
            } else if (selectedCells.length == 0) {
                selectedCell = this.graph.getCurrentRoot();
                oldModuleURI = selectedCell.getId();
            }

            info.uriPrefix = environment.baseURI;
            let newModuleURI = info.getFullURI();

            // check for ownership prompt
            let oldGlyphInfo = this.getFromInfoDict(oldModuleURI);
            if (oldGlyphInfo.uriPrefix != environment.baseURI && !await this.promptMakeEditableCopy(oldGlyphInfo.displayID)) {
                return;
            }

            if (oldModuleURI != newModuleURI) {
                if (this.checkCycleUp(selectedCell, newModuleURI)) {
                    // Tell the user a cycle isn't allowed
                    this.dialog.open(ErrorComponent, { data: "ModuleInstance objects MUST NOT form circular reference chains via their definition properties and parent ModuleDefinition objects." });
                    return;
                }

                // check for uri conflict
                if (this.isDuplicateURI(newModuleURI)) {
                    return;
                }


                // check for other modules to keep coupled
                let shouldDecouple = false;
                let promptDecouple = false;
                let coupledModules = this.getCoupledModules(oldModuleURI);
                for (let coupledCell of coupledModules) {
                    if (coupledCell != selectedCell && (selectedCell.isModule() ||
                        (selectedCell.isViewCell() && this.selectionStack.length > 0 && coupledCell != this.selectionStack[this.selectionStack.length - 1]))) {
                        promptDecouple = true;
                        break;
                    }
                }
                if (promptDecouple) {
                    let decoupleResult = await this.promptDeCouple();
                    if (decoupleResult === "Yes") {
                        shouldDecouple = false;
                    } else if (decoupleResult === "No") {
                        shouldDecouple = true;
                    } else {
                        return;
                    }
                }

                // check for conflicts to couple with
                let shouldCouple = false;
                let keepSubstructure = false;
                let conflictViewCell = this.graph.getModel().getCell(newModuleURI);
                if (conflictViewCell) {
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

                if (shouldCouple && keepSubstructure && this.checkCycleDown(selectedCell, newModuleURI)) {
                    // tell the user a cycle isn't allowed
                    this.dialog.open(ErrorComponent, { data: "ModuleInstance objects MUST NOT form circular reference chains via their definition properties and parent ModuleDefinition objects." });
                    return;
                }

                // update the infoDictionary
                if (!shouldDecouple) {
                    // we don't want to remove the old one if it will still be in use
                    this.removeFromInfoDict(oldModuleURI);
                }
                if (shouldCouple && keepSubstructure) {
                    // we need to remove the new one if we want to replace it with ours
                    this.removeFromInfoDict(newModuleURI);
                }
                if (!shouldCouple || keepSubstructure) {
                    // we don't want to add if we are updating substructure
                    this.addToInfoDict(info);
                }

                // update the view cell and module/s
                let moduleZoomed;
                if (selectedCell.isViewCell()) {
                    if (this.selectionStack.length > 0) {
                        moduleZoomed = this.selectionStack[this.selectionStack.length - 1];
                    } else {
                        moduleZoomed = selectedCell;
                    }
                    this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));
                }

                let viewCell = this.graph.getModel().getCell(oldModuleURI);
                // if we're decoupling create a clone
                if (shouldDecouple) {
                    viewCell = this.graph.getModel().cloneCell(viewCell);
                }
                if (shouldCouple) {
                    if (keepSubstructure) {
                        // if we're coupling and keeping substructure, remove the conflict
                        this.graph.getModel().remove(conflictViewCell);
                        this.updateViewCell(viewCell, newModuleURI);
                    } else {
                        // if we're coupling and updating, remove the current substructure
                        this.graph.getModel().remove(viewCell);
                    }
                } else {
                    // otherwise update the view cell
                    this.updateViewCell(viewCell, newModuleURI);
                }

                // update the selected module value
                if (!shouldDecouple) {
                    // if we were coupled, and don't want to decouple, update all coupled cells
                    const graph = this.graph;
                    coupledModules.forEach(function (cell) {
                        graph.getModel().setValue(cell, newModuleURI);
                    });
                    if (moduleZoomed) {
                        if (moduleZoomed.isViewCell()) {
                            // if the module zoomed is a view cell, the view stored in moduleZoomed is before the call to updateViewCell
                            // that means it is no longer the correct one, and we need to get it from the model
                            let newViewCell = this.graph.getModel().getCell(newModuleURI);
                            this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), newViewCell, this));
                        } else {
                            this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), moduleZoomed, this));
                        }
                    }
                } else if (moduleZoomed) {
                    if (moduleZoomed.isViewCell()) {
                        let newViewCell = this.graph.getModel().getCell(newModuleURI);
                        this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), newViewCell, this));
                    } else {
                        // we came from a view cell, so update the view cell, and zoom back in
                        this.graph.getModel().setValue(moduleZoomed, newModuleURI);
                        this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), moduleZoomed, this));
                    }
                } else {
                    // if we want to decouple, just set the current cell
                    this.graph.getModel().setValue(selectedCell, newModuleURI);
                }

                // update the ownership
                if (selectedCell.isModuleView()) {
                    this.changeOwnership(newModuleURI);
                } else {
                    this.changeOwnership(selectedCell.getValue(), true);
                }
            } else {
                this.updateInfoDict(info);

                // change the ownership
                this.changeOwnership(selectedCell.getValue());
            }

        } finally {
            this.graph.getModel().endUpdate();
            this.updateAngularMetadata(this.graph.getSelectionCells());
        }
    }

    protected async updateSelectedCombinatorialInfo(this: GraphService, info: CombinatorialInfo, prevURI: string) {
        this.graph.getModel().beginUpdate();
        try {
            // ownership change
            if (info.uriPrefix != environment.baseURI && !await this.promptMakeEditableCopy(info.displayID)) {
                return;
            }

            // check for duplicate and error
            let conflictCombinatorial = this.getFromCombinatorialDict(info.getFullURI());
            if (conflictCombinatorial && conflictCombinatorial.templateURI != info.templateURI) {
                this.dialog.open(ErrorComponent, { data: "The part " + info.getFullURI() + " already exists as a Combinatorial, and points to a different Component Definition!" });
            }

            // store
            if (prevURI != info.getFullURI()) {
                if (this.getFromCombinatorialDict(prevURI))
                    this.removeFromCombinatorialDict(prevURI);
                this.addToCombinatorialDict(info);
            } else {
                this.updateCombinatorialDict(info);
            }

            // recurs up the selection stack
            let previous = info;
            for (let i = this.selectionStack.length - 1; i >= 0; i--) {
                let parentURI = this.getParentInfo(this.selectionStack[i]).getFullURI();
                let combinatorial = this.getCombinatorialWithTemplate(parentURI);
                if (!combinatorial) {
                    combinatorial = new CombinatorialInfo();
                    combinatorial.templateURI = parentURI;
                }

                // check if we already have a link and break if we do
                let found = false;
                let varCompInfo = combinatorial.getVariableComponentInfo(this.selectionStack[i].getId());
                if (!varCompInfo) {
                    // If the variable component didn't exist, we need to add one
                    varCompInfo = new VariableComponentInfo(this.selectionStack[i].getId());
                    combinatorial.addVariableComponentInfo(varCompInfo);
                }
                // find out if it had a variant that links to our component definition
                let variant;
                for (variant of varCompInfo.variants) {
                    if (variant.type == "combinatorial" && variant.uri == previous.getFullURI()) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    // if it did link, update the info, we assume that the link works all the way up the chain
                    variant.description = previous.description;
                    variant.displayId = previous.displayID;
                    variant.name = previous.name;
                    variant.uri = previous.getFullURI();
                    variant.version = previous.version;
                    break;
                } else {
                    // if it wasn't found we need to add it
                    let variant = new IdentifiedInfo();
                    variant.description = previous.description;
                    variant.displayId = previous.displayID;
                    variant.name = previous.name;
                    variant.type = "combinatorial";
                    variant.uri = previous.getFullURI();
                    variant.version = previous.version;
                    varCompInfo.addVariant(variant);
                }

                this.addToCombinatorialDict(combinatorial);

                previous = combinatorial;
            }

            // change ownership
            this.changeOwnership(info.getFullURI(), true)

        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    protected updateSelectedInteractionInfo(this: GraphService, info: InteractionInfo) {
        let selectedCells = this.graph.getSelectionCells();
        if (selectedCells.length > 1 || selectedCells.length < 0) {
            console.error("Trying to change info on too many or too few cells!");
            return;
        }
        let selectedCell = selectedCells[0];

        // gather all the cells referencing this interaction
        let cell1 = this.graph.getModel().getCell("1");
        let cells = [];
        for (let viewChild of cell1.children) {
            if (viewChild.children) {
                for (let child of viewChild.children) {
                    if ((child.isInteraction() || child.isInteractionNode) && child.getValue() === selectedCell.getValue()) {
                        cells.push(child);
                    }
                }
            }
        }

        this.graph.getModel().beginUpdate();
        try {
            let prevURI = selectedCell.value;
            // store
            if (prevURI != info.getFullURI()) {
                // check for duplication and error
                let conflictInteraction = this.getFromInteractionDict(info.getFullURI());
                if (conflictInteraction) {
                    this.dialog.open(ErrorComponent, { data: "The part " + info.getFullURI() + " already exists as an Interaction!" });
                }

                if (this.getFromInteractionDict(prevURI))
                    this.removeFromInteractionDict(prevURI);
                this.addToInteractionDict(info);

                for (let cell of cells) {
                    this.graph.getModel().setValue(cell, info.getFullURI());
                }
            } else {
                this.updateInteractionDict(info);
            }


            // mutate the cells
            for (let cell of cells) {
                if (cell.isInteraction()) {
                    this.mutateInteractionGlyph(info.interactionType, cell);
                } else if (cell.isInteractionNode()) {
                    this.mutateInteractionNodeGlyph(info.interactionType, cell);
                }
            }

        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    protected isDuplicateURI(newURI: string, ignoreComponents: boolean = false): boolean {
        let conflictInfo = this.getFromInfoDict(newURI);
        if (conflictInfo && conflictInfo instanceof ModuleInfo) {
            this.dialog.open(ErrorComponent, { data: "The part " + newURI + " already exists as a ModuleDefinition!" });
            return true;
        }
        if (!ignoreComponents && conflictInfo && conflictInfo instanceof GlyphInfo) {
            this.dialog.open(ErrorComponent, { data: "The part " + newURI + " already exists as a ComponentDefinition!" });
            return true;
        }
        let conflictCombinatorial = this.getFromCombinatorialDict(newURI);
        if (conflictCombinatorial) {
            this.dialog.open(ErrorComponent, { data: "The part " + newURI + " already exists as a Combinatorial!" });
        }
        return false;
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
            if (viewChild.children) {
                for (let containerChild of viewChild.children) {
                    if (containerChild.isCircuitContainer() && containerChild.getId() != cell.getId() && containerChild.getValue() === cell.getValue()) {
                        toReplace.push(containerChild);
                    }
                }
            }
        }

        // copy the geometry into the clone and replace it
        for (let circuitContainer of toReplace) {
            let cellClone = this.graph.getModel().cloneCell(cell);
            let originalParent = circuitContainer.getParent();
            let originalIndex = originalParent.getIndex(cell);
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
            let cellAdded = this.graph.getModel().add(originalParent, cellClone, originalIndex);
            cellAdded.refreshCircuitContainer(this.graph);
        }
    }

    protected updateInteractions(oldReference: string, newReference: string) {
        try {
            this.graph.getModel().beginUpdate();
            const cell1 = this.graph.getModel().getCell("1");
            let viewCells = cell1.children;
            for (let viewCell of viewCells) {
                if (viewCell.isComponentView())
                    continue;
                let interactions = this.graph.getModel().getChildEdges(viewCell);
                for (let interaction of interactions) {
                    let interactionInfo = this.getFromInteractionDict(interaction.value).makeCopy();
                    // remove an edge if the new reference is null, and this specific edge had it's old reference
                    if (!newReference) {
                        if(interactionInfo.fromURI[interaction.getId()] == oldReference){
                            delete interactionInfo.fromURI[interaction.getId()];
                            this.updateInteractionDict(interactionInfo);
                            this.graph.getModel().remove(interaction);
                        }
                        if(interactionInfo.toURI[interaction.getId()] == oldReference){
                            delete interactionInfo.toURI[interaction.getId()];
                            this.updateInteractionDict(interactionInfo);
                            this.graph.getModel().remove(interaction);
                        }
                        continue;
                    }
                    // replace any interaction references that reference the oldReference
                    for(let key in interactionInfo.fromURI){
                        if(interactionInfo.fromURI[key] == oldReference){
                            interactionInfo.fromURI[key] = newReference;
                        }
                    }
                    for(let key in interactionInfo.toURI){
                        if(interactionInfo.toURI[key] == oldReference){
                            interactionInfo.toURI[key] = newReference;
                        }
                    }
                    this.updateInteractionDict(interactionInfo);
                }
            }
        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    /**
     * 
     */
    protected async updateCombinatorialTemplate(oldTemplate: string, newTemplate: string) {
        let combinatorial = this.getCombinatorialWithTemplate(oldTemplate);
        if (combinatorial) {
            this.removeFromCombinatorialDict(combinatorial.getFullURI());
            combinatorial.templateURI = newTemplate;
            this.addToCombinatorialDict(combinatorial);
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

    protected async promptChooseFunctionalComponent(cell: mxCell, from: boolean): Promise<string> {
        let viewCell;
        if (cell.isModule()) {
            viewCell = this.graph.getModel().getCell(cell.value);
        } else if (cell.isModuleView()) {
            viewCell = cell;
        }
        let options = [];
        if (viewCell.children) {
            for (let viewChild of viewCell.children) {
                if (viewChild.isCircuitContainer() || viewChild.isMolecularSpeciesGlyph()) {
                    let info = <GlyphInfo>this.getFromInfoDict(viewChild.getValue()).makeCopy();
                    //TODO if(info.visibility == public && (info.direction == in || inout && from == false) || out)
                    options.push({ id: viewChild.getId(), info: info });
                }
                //TODO what do we do if it's a module?
            }
        }
        const choiceRef = this.dialog.open(FuncCompSelectorComponent, { data: { from: viewCell.getId(), options: options } });
        let result = await choiceRef.afterClosed().toPromise();
        if (!result) {
            return null;
        }
        return result.info.getFullURI() + "_" + result.id;
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
    protected mutateInteractionGlyph(name: string, cell: mxCell) {
        this.graph.getModel().beginUpdate();
        try {

            if (name == "Biochemical Reaction" || name == "Non-Covalent Binding" || name == "Genetic Production" || name == "Dissociation") {
                name = "Process";
            }
            name = GraphBase.STYLE_INTERACTION + name;

            // Modify the style string
            let styleString = cell.style.slice();
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

            this.graph.getModel().setStyle(cell, styleString);
        } finally {
            this.graph.getModel().endUpdate();
        }
    }

    protected mutateInteractionNodeGlyph(name: string, cell: mxCell) {
        this.graph.getModel().beginUpdate();
        try {
            name = GraphBase.STYLE_INTERACTION_NODE + this.interactionNodeTypeToName(name);

            // Modify the style string
            let styleString = cell.style.slice();
            if (!styleString.includes(';')) {
                // nothing special needed, the original style only had the interactionNode style name
                styleString = name;
            } else {
                // the string is something like "strokecolor=#000000;interactionNodeStyleName;fillcolor=#ffffff;etc;etc;"
                // we only want to replace the 'glyphStyleName' bit
                let startIdx = styleString.indexOf(GraphBase.STYLE_INTERACTION_NODE);
                let endIdx = styleString.indexOf(';', startIdx);
                let stringToReplace = styleString.slice(startIdx, endIdx - startIdx);
                styleString = styleString.replace(stringToReplace, name);
            }

            this.graph.getModel().setStyle(cell, styleString);
        } finally {
            this.graph.getModel().endUpdate();
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

        // if there is no current root it's because we're in the middle of reseting the view
        if (!this.graph.getCurrentRoot())
            return;

        // style first.
        if (cells && cells.length > 0) {
            const styleInfo = new StyleInfo(cells, this.graph);
            this.metadataService.setSelectedStyleInfo(styleInfo);
        }

        if (cells.length > 1) {
            // multiple selections? can't display glyph data
            return;
        }

        // have to add special check as no selection cell should signify the module/component of the current view
        let cell;
        if (cells && cells.length > 0) {
            cell = cells[0];
        }

        if ((!cell && this.graph.getCurrentRoot().isModuleView()) || (cell && cell.isModule())) {
            let moduleInfo;
            if (!cell)
                moduleInfo = this.getFromInfoDict(this.graph.getCurrentRoot().getId());
            else
                moduleInfo = this.getFromInfoDict(cell.value);
            if (moduleInfo) {
                this.metadataService.setSelectedModuleInfo(moduleInfo.makeCopy());
            }
        } else if ((!cell && this.graph.getCurrentRoot().isComponentView()) || (cell && (cell.isSequenceFeatureGlyph() || cell.isMolecularSpeciesGlyph() || cell.isCircuitContainer()))) {
            let glyphInfo;
            if (!cell)
                glyphInfo = this.getFromInfoDict(this.graph.getCurrentRoot().getId());
            else
                glyphInfo = this.getFromInfoDict(cell.value);
            if (glyphInfo) {
                this.metadataService.setSelectedGlyphInfo(glyphInfo.makeCopy());
            }
        }
        else if (cell.isInteraction() || cell.isInteractionNode()) {
            let interactionInfo = this.getFromInteractionDict(cell.value);
            if (interactionInfo) {
                this.metadataService.setSelectedInteractionInfo(interactionInfo.makeCopy());
            }
        }

        // combinatorial info
        if (cell && cell.isSequenceFeatureGlyph()) {
            let combinatorialInfo: CombinatorialInfo = this.getCombinatorialWithTemplate(cell.getParent().value);
            if (!combinatorialInfo) {
                combinatorialInfo = new CombinatorialInfo();
                combinatorialInfo.templateURI = cell.getParent().value;
            }
            this.metadataService.setSelectedCombinatorialInfo(combinatorialInfo.makeCopy());
        }
    }

    nullifyMetadata() {
        this.metadataService.setSelectedGlyphInfo(null);
        this.metadataService.setSelectedModuleInfo(null);
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
    protected autoFormat(this: GraphService, viewCells: Set<string> = null) {
        var first = new mx.mxStackLayout(this.graph, false, 20);
        var second = new mx.mxFastOrganicLayout(this.graph);

        var layout = new mx.mxCompositeLayout(this.graph, [first, second], first);
        if (viewCells) {
            for (let viewCellId of Array.from(viewCells.values())) {
                const viewCell = this.graph.getModel().getCell(viewCellId);
                layout.execute(viewCell);
                // remove the noEdgeStyle from newly formatted edges
                if (viewCell.children) {
                    for (let viewChild of viewCell.children) {
                        if (viewChild.isEdge()) {
                            viewChild.setStyle(viewChild.getStyle().replace("noEdgeStyle=1;", ""));
                        }
                    }
                }
            }
        } else {
            layout.execute(this.graph.getDefaultParent());
            for (let viewChild of this.graph.getDefualtParent().children) {
                if (viewChild.isEdge()) {
                    viewChild.setStyle(viewChild.getStyle().replace("noEdgeStyle=1;", ""));
                }
            }
        }

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
        let root = this.viewStack[0];
        // let root = this.graph.getCurrentRoot();
        // let coupledCells = this.getCoupledGlyphs(root.getId());
        // while (coupledCells.length > 0) {
        //     root = coupledCells[0].getParent().getParent();
        //     coupledCells = this.getCoupledGlyphs(root.getId());
        // }
        toExpand.add(root.getId());

        // populate the reached set
        while (toExpand.size > 0) {
            let viewID = toExpand.values().next().value;
            let viewCell = this.graph.getModel().getCell(viewID);
            toExpand.delete(viewID);
            reached.add(viewCell.getId());

            // get the children of the viewCell
            let viewChildren = this.graph.getModel().getChildren(viewCell);
            if (viewChildren) {
                for (let child of viewChildren) {
                    // If the child isn't a circuit container or module, it can't lead to another viewCell
                    if (!child.isCircuitContainer() && !child.isModule())
                        continue;
                    if (child.isModule()) {
                        if (reached.has(child.value))
                            continue;
                        toExpand.add(child.value);
                    } else if (child.isCircuitContainer()) {
                        let glyphs = this.graph.getModel().getChildren(child);
                        for (let glyph of glyphs) {
                            if (!glyph.isSequenceFeatureGlyph() || reached.has(glyph.value))
                                continue;
                            toExpand.add(glyph.value);
                        }
                    }
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

    protected trimUnreferencedCombinatorials() {
        const cell0 = this.graph.getModel().getCell("0");
        let toRemove = [];
        for (let combKey in cell0.value[GraphBase.COMBINATORIAL_DICT_INDEX]) {
            let templateExists = false;
            const combinatorial = cell0.value[GraphBase.COMBINATORIAL_DICT_INDEX][combKey];
            for (let cellKey in this.graph.getModel().cells) {
                const cell = this.graph.getModel().cells[cellKey];
                if (!cell.isCircuitContainer())
                    continue;
                if (cell.getValue() == combinatorial.templateURI) {
                    templateExists = true;
                    break;
                }
            }
            if (!templateExists) {
                toRemove.push(combinatorial);
            }
        }

        for (let combinatorial of toRemove) {
            this.removeFromCombinatorialDict(combinatorial.getFullURI())
        }
    }

    protected trimUnreferencedInfos() {
        const cell0 = this.graph.getModel().getCell("0");
        // accumulate all the references
        let foundInfos = {};
        let foundInteractions = {};
        for (let cellKey in this.graph.getModel().cells) {
            const cell = this.graph.getModel().cells[cellKey];
            if (cell.isCircuitContainer() || cell.isSequenceFeatureGlyph() || cell.isModule() || cell.isMolecularSpeciesGlyph()) {
                foundInfos[cell.value] = ""; // the value doesn't matter, as we just want to keep track of the key
            }
            if (cell.isViewCell()) {
                foundInfos[cell.getId()] = "";
            }
            if (cell.isInteractionNode() || cell.isInteraction()) {
                foundInteractions[cell.value] = "";
            }
        }
        // detect missing references
        let infosToRemove = [];
        for (let dictKey in cell0.value[GraphBase.INFO_DICT_INDEX]) {
            if (!(dictKey in foundInfos)) {
                infosToRemove.push(dictKey);
            }
        }
        let interactionsToRemove = [];
        for (let dictKey in cell0.value[GraphBase.INTERACTION_DICT_INDEX]) {
            if (!(dictKey in foundInteractions)) {
                interactionsToRemove.push(dictKey);
            }
        }
        // remove references
        for (let infoURI of infosToRemove) {
            this.removeFromInfoDict(infoURI);
        }
        for (let interactionURI of interactionsToRemove) {
            this.removeFromInteractionDict(interactionURI);
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

    protected getCoupledMolecularSpecies(glyphURI: string) {
        const coupledCells = [];
        const cell1 = this.graph.getModel().getCell("1");
        for (let viewCell of cell1.children) {
            if (viewCell.isComponentView())
                continue;
            for (let viewChild of viewCell.children) {
                if (!viewChild.isMolecularSpeciesGlyph())
                    continue;
                if (viewChild.value === glyphURI)
                    coupledCells.push(viewChild);
            }
        }
        return coupledCells;
    }

    protected getCoupledModules(moduleURI: string) {
        const coupledCells = [];
        const cell1 = this.graph.getModel().getCell("1");
        for (let viewCell of cell1.children) {
            if (viewCell.isComponentView())
                continue;
            if (viewCell.children) {
                for (let viewChild of viewCell.children) {
                    if (!viewChild.isModule())
                        continue;
                    if (viewChild.value === moduleURI)
                        coupledCells.push(viewChild);
                }
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
        if (!viewCell || !viewCell.isViewCell()) {
            console.debug("Tried to remove a view cell that isn't a view cell!");
            return;
        }
        // remove the cell
        this.graph.getModel().remove(viewCell);

        // check if any of the children's viewcells have other parents
        if (viewCell.children) {
            for (let viewChild of viewCell.children) {
                if (viewChild.isModule() && this.getCoupledModules(viewChild.value).length == 0) {
                    this.removeViewCell(this.graph.getModel().getCell(viewChild.value));
                } else if (viewChild.isCircuitContainer()) {
                    for (let containerChild of viewChild.children) {
                        if (containerChild.isSequenceFeatureGlyph() && this.getCoupledGlyphs(containerChild.value).length == 0)
                            this.removeViewCell(this.graph.getModel().getCell(containerChild.value));
                    }
                }
            }
        }
    }

    /**
     * Changes the uriPrefix of the passed in info, and any of it's parents.
     * @param this Must be called from the graph service, as it uses public methods.
     * @param infoURI The cell/combinatorial to change ownership for.
     * @param fullCheck Stops at currently owned objects if false, continues until the root if true.
     */
    protected changeOwnership(this: GraphService, infoURI: string, fullCheck: boolean = false) {

        this.graph.getModel().beginUpdate();
        try {
            // component/module definition mode
            let combinatorialMode = false;
            let info = this.getFromInfoDict(infoURI);
            if (!info) {
                // combinatorial mode
                info = this.getFromCombinatorialDict(infoURI)
                combinatorialMode = true;
            }
            if (!info) {
                console.error("Tried to change Ownership on an object that doesn't exist!");
                return;
            }

            // if we already own it, we don't need to do anything
            if (!info.uriPrefix || (info.uriPrefix === environment.baseURI && !fullCheck)) {
                return;
            }

            // only zoom out if the info associated will change a view cell ID
            let zoomedCells;
            let rootViewInfo;
            if (!combinatorialMode) {
                // zoom out because the current view cell may be deleted and re added with a different URI
                // more than the direct parent's view cell may have been changed, so it's easiest to zoom all the way out (trust me, It had problems when it wasn't zooming out)
                zoomedCells = this.selectionStack.slice();
                for (let i = 0; i < zoomedCells.length; i++) {
                    this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));
                }

                // zoom out of the rootView
                let rootViewId;
                rootViewInfo;
                if (this.graph.getCurrentRoot()) {
                    rootViewId = this.graph.getCurrentRoot().getId();
                    rootViewInfo = this.getFromInfoDict(rootViewId);
                    if (rootViewInfo) {
                        this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), null, this));
                    }
                } else {
                    // special case of the root getting changed before changeOwnership is called
                    rootViewId = infoURI;
                    rootViewInfo = this.getFromInfoDict(rootViewId);
                }
            }

            // parent propogation
            let toCheck = new Set<string>();
            let checked = new Set<string>();

            toCheck.add(infoURI);

            while (toCheck.size > 0) {
                let checking: string = toCheck.values().next().value;
                checked.add(checking);
                toCheck.delete(checking);
                if (checking.startsWith(environment.baseURI) && !fullCheck) {
                    continue;
                }

                let info;
                if (!combinatorialMode) {
                    info = this.getFromInfoDict(checking).makeCopy();
                } else {
                    info = this.getFromCombinatorialDict(checking).makeCopy();
                }

                info.uriPrefix = environment.baseURI;
                if (!combinatorialMode) {
                    this.removeFromInfoDict(checking);
                    this.addToInfoDict(info);
                } else {
                    this.removeFromCombinatorialDict(checking);
                    this.addToCombinatorialDict(info);
                }

                if (!combinatorialMode) {
                    // update the viewCell
                    let viewCell = this.graph.getModel().getCell(checking);
                    if (viewCell) {
                        this.updateViewCell(viewCell, info.getFullURI());
                    }

                    // update any cells that referenced the viewCell and add their parents to be checked
                    for (let key in this.graph.getModel().cells) {
                        const cell = this.graph.getModel().cells[key];
                        if (cell.value === checking) {
                            let previousReference = cell.getValue() + "_" + cell.getId();
                            this.graph.getModel().setValue(cell, info.getFullURI());
                            this.updateInteractions(previousReference, cell.getValue() + "_" + cell.getId());
                            if (cell.isSequenceFeatureGlyph()) {
                                let toAdd = cell.getParent().getParent();
                                if (toAdd.isComponentView() && !checked.has(toAdd.getId())) {
                                    // normal case
                                    toCheck.add(toAdd.getId());
                                } else if (toAdd.isModuleView() && !checked.has(cell.getParent().getValue())) {
                                    // edge case, module view, need to check parent circuit container
                                    toCheck.add(cell.getParent().getValue());
                                }
                            } else if(cell.isCircuitContainer() && cell.getParent().isModuleView()){
                                // transition state to module views
                                toCheck.add(cell.getParent().getId());
                            } else if(cell.isModule()){
                                toCheck.add(cell.getParent().getId());
                            }
                        }
                    }
                } else {
                    // update any combinatorials that referenced this one and add their parents to be checked
                    let cell0 = this.graph.getModel().getCell("0");
                    for (let key in cell0.value[GraphBase.COMBINATORIAL_DICT_INDEX]) {
                        const combinatorial: CombinatorialInfo = cell0.value[GraphBase.COMBINATORIAL_DICT_INDEX][key];
                        for (let varCompKey in combinatorial.variableComponents) {
                            const varComp = combinatorial.variableComponents[varCompKey];
                            for (let variant of varComp.variants) {
                                if (variant.type == "combinatorial" && variant.uri == checking) {
                                    variant.uri = info.getFullURI();
                                    if (!checked.has(combinatorial.getFullURI())) {
                                        toCheck.add(combinatorial.getFullURI());
                                    }
                                }
                            }
                        }
                    }
                }

            }

            if (!combinatorialMode) {
                // zoom back into the rootView
                if (rootViewInfo) {
                    rootViewInfo = rootViewInfo.makeCopy();
                    rootViewInfo.uriPrefix = environment.baseURI;
                    let newRootViewCell = this.graph.getModel().getCell(rootViewInfo.getFullURI());
                    this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), newRootViewCell, this));
                }
                // re zoom to fix the view
                for (let i = 0; i < zoomedCells.length; i++) {
                    this.graph.getModel().execute(new GraphEdits.zoomEdit(this.graph.getView(), zoomedCells[i], this));
                }
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

        // initalize the toCheck list
        if ((cell.isCircuitContainer() || cell.isViewCell()) && this.selectionStack.length > 0) {
            let selectedCell = this.selectionStack[this.selectionStack.length - 1];
            if (selectedCell.isModule()) {
                toCheck.add(selectedCell.getParent().getId());
            } else if (selectedCell.isSequenceFeatureGlyph()) {
                toCheck.add(selectedCell.getParent().getParent().getId());
            }
        } else if (cell.isModule()) {
            toCheck.add(cell.getParent().getId());
        } else {
            toCheck.add(cell.getParent().getValue());
        }

        while (toCheck.size > 0) {
            let checking: string = toCheck.values().next().value;
            checked.add(checking);
            toCheck.delete(checking);
            if (checking === glyphURI) {
                // exit case, a cycle was found upward
                return true;
            }

            // circuitContainer, sequenceFeature, and module can have values of the uri, we don't care about circuitContainers
            let toAddCells = [];
            for (let key in this.graph.getModel().cells) {
                const cell = this.graph.getModel().cells[key];
                if (cell.value === checking && (cell.isSequenceFeatureGlyph() || cell.isModule())) {
                    toAddCells.push(cell);
                }
            }

            // adding a squence features container value lets us ignore the case where there isn't a view cell for that id
            for (let i = 0; i < toAddCells.length; i++) {
                let toAdd;
                if (toAddCells[i].isSequenceFeatureGlyph()) {
                    toAdd = toAddCells[i].getParent().getValue();
                } else {
                    toAdd = toAddCells[i].getParent().getId();
                }
                if (!checked.has(toAdd)) {
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

        // initalize the toCheck set
        if (cell.isCircuitContainer()) {
            for (let i = 0; i < cell.children.length; i++) {
                if (cell.children[i].isSequenceFeatureGlyph()) {
                    toCheck.add(cell.children[i].value);
                }
            }
        } else {
            let viewCell;
            if (cell.isViewCell()) {
                viewCell = cell;
            } else {
                viewCell = this.graph.getModel().getCell(cell.value);
            }
            if (viewCell.children) {
                for (let viewChild of viewCell.children) {
                    if (viewChild.isModule()) {
                        toCheck.add(viewChild.value);
                    } else if (viewChild.isCircuitContainer() && viewChild.children) {
                        for (let containerChild of viewChild.children) {
                            if (containerChild.isSequenceFeatureGlyph()) {
                                toCheck.add(containerChild.value);
                            }
                        }
                    }
                }
            }
        }

        while (toCheck.size > 0) {
            let checking: string = toCheck.values().next().value;
            checked.add(checking);
            toCheck.delete(checking);
            if (checking === glyphURI) {
                // end case where a cycle has been found
                return true;
            }

            let viewCell = this.graph.getModel().getCell(checking);
            if (viewCell.children) {
                for (let viewChild of viewCell.children) {
                    if (viewChild.isModule() && !checked.has(viewChild.value)) {
                        toCheck.add(viewChild.value);
                    } else if (viewChild.isCircuitContainer() && viewChild.children) {
                        for (let containerChild of viewChild.children) {
                            if (containerChild.isSequenceFeatureGlyph() && !checked.has(containerChild.value)) {
                                toCheck.add(containerChild.value);
                            }
                        }
                    }
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

    protected flipInteractionEdge(cell){
        if(!cell.isInteraction()){
            console.error("flipInteraction attempted on something other than an interaction!");
            return;
        }
        const src = cell.source;
        const dest = cell.target;
        this.graph.getModel().setTerminals(cell, dest, src);
        // fix the geometry if either was null
        let sourcePoint = cell.geometry.getTerminalPoint(true);
        let targetPoint = cell.geometry.getTerminalPoint(false);
        cell.geometry.setTerminalPoint(null, true);
        cell.geometry.setTerminalPoint(null, false);
        if(sourcePoint){
            cell.geometry.setTerminalPoint(sourcePoint, false);
        }
        if(targetPoint){
            cell.geometry.setTerminalPoint(targetPoint, true);
        }
        // reverse the info to/from
        let newInfo = this.getFromInteractionDict(cell.value).makeCopy();
        let oldTo = newInfo.toURI[cell.id];
        let oldFrom = newInfo.toURI[cell.id];
        delete newInfo.toURI[cell.id];
        delete newInfo.fromURI[cell.id];
        if(oldTo){
            newInfo.fromURI[cell.id] = oldTo;
        }
        if(oldFrom){
            newInfo.toURI[cell.id] = oldFrom;
        }
        // nuke the refinemnets, as source refinements don't match target refinements
        delete newInfo.sourceRefinement[cell.id];
        delete newInfo.targetRefinement[cell.id];
        this.updateInteractionDict(newInfo);
        this.updateAngularMetadata(this.graph.getSelectionCells());
    }

    /**
     * Updates an Info object
     * NOTE: Should only be used if the glyphURI is the same
     */
    protected updateInfoDict(info: Info) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.infoEdit(cell0, info, cell0.value[GraphBase.INFO_DICT_INDEX][info.getFullURI()]));
    }

    /**
     * Remove an Info object from the dictionary
     */
    protected removeFromInfoDict(glyphURI: string) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.infoEdit(cell0, null, cell0.value[GraphBase.INFO_DICT_INDEX][glyphURI]));
    }

    /**
     * Add a Info object to the dictionary
     */
    protected addToInfoDict(info: Info) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.infoEdit(cell0, info, null));
    }

    /**
     * Get the GlyphInfo with the given glyphURI from the dictionary
     */
    protected getFromInfoDict(glyphURI: string): Info {
        const cell0 = this.graph.getModel().getCell(0);
        return cell0.value[GraphBase.INFO_DICT_INDEX][glyphURI];
    }

    /**
     * Updates an Combinatorial object
     * NOTE: Should only be used if the fullURI is the same
     */
    protected updateCombinatorialDict(info: CombinatorialInfo) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.infoEdit(cell0, info, cell0.value[GraphBase.COMBINATORIAL_DICT_INDEX][info.getFullURI()], GraphBase.COMBINATORIAL_DICT_INDEX));
    }

    /**
     * Remove a combinatorial object from the dictionary
     */
    protected removeFromCombinatorialDict(glyphURI: string) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.infoEdit(cell0, null, cell0.value[GraphBase.COMBINATORIAL_DICT_INDEX][glyphURI], GraphBase.COMBINATORIAL_DICT_INDEX));
    }

    /**
     * Add a combinatorial object to the dictionary
     */
    protected addToCombinatorialDict(info: CombinatorialInfo) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.infoEdit(cell0, info, null, GraphBase.COMBINATORIAL_DICT_INDEX));
    }

    /**
     * Get the CombinatorialInfo that targets the given glyphURI from the dictionary
     */
    protected getFromCombinatorialDict(glyphURI: string): CombinatorialInfo {
        const cell0 = this.graph.getModel().getCell(0);
        return cell0.value[GraphBase.COMBINATORIAL_DICT_INDEX][glyphURI];
    }

    /**
     * Gets the CombinatorialInfo that has the given templateURI
     * @param templateURI - The templateURI to search for
     */
    protected getCombinatorialWithTemplate(templateURI: string) {
        const cell0 = this.graph.getModel().getCell(0);
        for (let key in cell0.value[GraphBase.COMBINATORIAL_DICT_INDEX]) {
            if (cell0.value[GraphBase.COMBINATORIAL_DICT_INDEX][key].templateURI === templateURI) {
                return cell0.value[GraphBase.COMBINATORIAL_DICT_INDEX][key];
            }
        }
    }

    protected updateInteractionDict(info: InteractionInfo) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.infoEdit(cell0, info, cell0.value[GraphBase.INTERACTION_DICT_INDEX][info.getFullURI()], GraphBase.INTERACTION_DICT_INDEX));
    }

    protected removeFromInteractionDict(interactionURI: string) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.infoEdit(cell0, null, cell0.value[GraphBase.INTERACTION_DICT_INDEX][interactionURI], GraphBase.INTERACTION_DICT_INDEX));
    }

    protected addToInteractionDict(info: InteractionInfo) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.infoEdit(cell0, info, null, GraphBase.INTERACTION_DICT_INDEX));
    }

    protected getFromInteractionDict(interactionURI: string): InteractionInfo {
        const cell0 = this.graph.getModel().getCell(0);
        return cell0.value[GraphBase.INTERACTION_DICT_INDEX][interactionURI];
    }

    protected initLabelDrawing() {
        // label drawing
        let graphService = this;
        this.graph.convertValueToString = function (cell) {
            if (cell.isSequenceFeatureGlyph() || cell.isMolecularSpeciesGlyph()) {
                let info = <GlyphInfo>graphService.getFromInfoDict(cell.value);
                if (!info) {
                    return cell.value;
                } else if (info.name != null && info.name != '') {
                    return info.name;
                } else {
                    return info.displayID;
                }
            } else if (cell.isModule()) {
                let info = <ModuleInfo>graphService.getFromInfoDict(cell.value);
                if (!info) {
                    return cell.value;
                } else if (info.name != null && info.name != '') {
                    return info.name;
                } else {
                    return info.displayID;
                }
            } else if (cell.isCircuitContainer() || cell.isInteraction() || cell.isInteractionNode()) {
                return null;
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

    protected createViewCell(uri: string, module: boolean = false): mxCell {
        // construct the view cell
        const cell1 = this.graph.getModel().getCell(1);
        let childViewCell;
        if (module) {
            childViewCell = this.graph.insertVertex(cell1, uri, '', 0, 0, 0, 0, GraphBase.STYLE_MODULE_VIEW);
        } else {
            childViewCell = this.graph.insertVertex(cell1, uri, '', 0, 0, 0, 0, GraphBase.STYLE_COMPONENT_VIEW);

            // add the backbone to the view cell
            const childCircuitContainer = this.graph.insertVertex(childViewCell, null, uri, 0, 0, 0, 0, GraphBase.STYLE_CIRCUIT_CONTAINER);
            const childCircuitContainerBackbone = this.graph.insertVertex(childCircuitContainer, null, '', 0, 0, 0, 0, GraphBase.STYLE_BACKBONE);

            childCircuitContainerBackbone.setConnectable(false);
            childCircuitContainer.setConnectable(false);
        }

        return childViewCell;
    }

    protected showError(message: string) {
        this.dialog.open(ErrorComponent, { data: message });
    }
}
