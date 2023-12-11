import * as mxCell from 'mxgraph';
import { GlyphInfo } from './glyphInfo';
import { mxGraphView } from 'src/mxgraph';
import { GraphService } from './graph.service';
import { Info } from './info';
import { mx, GraphBase } from './graph-base';

/**
 * Contains all the custom edit objects necessary for mxGraph.
 * All edits should be used like 'graph.getModel().execute(new <needed edit object here>)'.
 */
export class GraphEdits {

    /*
     Edit objects are used by the mxgraph model as a unit that can be undone. They must have an execute method.
     execute is used to both do, and undo a change. In other words, when execute is called once it must set the
     object in a state such that calling execute again will undo the change. It is important that you don't use
     the graphs model to make changes, as that usually results in a mxgraph edit object.
    */

    /**
     * Edit object for interaction history. Swaps the interaction cells info.
     */
    static interactionEdit = class {
        cell: mxCell;
        info: any;
        previous: any;

        /**
         * 
         * @param cell The cell you wish to change the interaction info on. 
         * @param info The new info you wish to change the info to.
         */
        constructor(cell, info) {
            this.cell = cell;
            this.info = info;
            this.previous = info;
        }

        execute() {
            if (this.cell != null) {
                let tmp = this.cell.value.makeCopy();
                if (this.previous == null) {
                    this.cell.value = null;
                } else {
                    this.cell.value.copyDataFrom(this.previous);
                }

                this.previous = tmp;
            }
        }
    }

    /**
     * Edit object for glyphInfo/moduleInfo history. Replaces glyphInfo's in a dictionary stored in cell0's value variable.
     */
    static infoEdit = class {
        cell0: mxCell;
        info: Info;
        previousInfo: Info;
        dictionaryIndex;

        /**
         * If info is null, removes previous from the dictionary.
         * If previous is null, adds info to the dictionary.
         * If both not null, replaces previous with info.
         * @param cell0 The cell containing the dictionary
         * @param info The info you want to put in the dictionary (or null if removing)
         * @param previousInfo The info that is already there (or null if adding)
         */
        constructor(cell0: string, info: Info, previousInfo: Info, dictionaryIndex = GraphBase.INFO_DICT_INDEX) {
            this.cell0 = cell0;
            // store them in reverse so the execute performs the action the first time
            this.info = previousInfo;
            this.previousInfo = info;
            this.dictionaryIndex = dictionaryIndex;
        }

        // Execute is called for both un-doing and re-doing
        execute() {
            if (this.previousInfo == null) {
                // if the previous was null, then the dictionary didn't have an entry before so remove it
                delete this.cell0.value[this.dictionaryIndex][this.info.getFullURI()];
                this.previousInfo = this.info;
                this.info = null;
            } else if (this.info == null) {
                // if the current one is null, then it was removed, so re-add it
                this.cell0.value[this.dictionaryIndex][this.previousInfo.getFullURI()] = this.previousInfo;
                this.info = this.previousInfo;
                this.previousInfo = null;
            } else {
                // some information was changed, so update it
                this.cell0.value[this.dictionaryIndex][this.info.getFullURI()] = this.previousInfo;
                const tmpInfo = this.info;
                this.info = this.previousInfo;
                this.previousInfo = tmpInfo;
            }
        }
    }

    // because the mxCurrentRootChange doesn't do what we want
    /**
     * Zoom edit object for enter/exit glyph history. Zooms into/out of a cell.
     */
    static zoomEdit = class {
        view: mxGraphView;
        glyphCell: mxCell;
        goDown: boolean;
        graphService: GraphService;

        /**
         * If glyphCell is null, zooms out. Otherwise zooms into the glyphCell.
         * @param view The mxView object to perform the zoom with. (graph.getView())
         * @param glyphCell The cell you wish to zoom into. Either a sequenceFeature, or a viewCell.
         * @param graphService The graph service this is coming from. Neccessary to update the view/selection stack.
         */
        constructor(view: mxGraphView, glyphCell: mxCell, graphService: GraphService) {
            this.view = view;
            this.glyphCell = glyphCell;
            this.goDown = glyphCell != null;
            this.graphService = graphService;
        }

        execute() {
            if (this.glyphCell != null) {
                // Zoom into the glyph
                // get the view cell for the selected cell
                let childViewCell;
                if (!this.glyphCell.value) {
                    childViewCell = this.glyphCell;
                } else {
                    childViewCell = this.graphService.graph.getModel().getCell(this.glyphCell.value);
                    // add info to the selectionstack
                    // edge case of zooming back into rootview of the diagram (nothing should be put in the selectionStack)
                    if(this.graphService.viewStack.length > 0)
                        this.graphService.selectionStack.push(this.glyphCell);
                }

                // add the info to the view stack
                let previousView = this.graphService.viewStack[this.graphService.viewStack.length -1 ];
                this.graphService.viewStack.push(childViewCell);

                // change the view
                this.view.clear(this.view.currentRoot, true);
                this.view.currentRoot = childViewCell;
                // mxCurrentRootChange has this when zooming in, but it's causing a text positioning square where there shouldn't be one
                // not having it seems to have no adverse effects
                //this.view.validate(); 

                // Note, this will cause a backbone to call layout.execute which breaks things on undo
                //childViewCell.refreshViewCell(this.graphService.graph);

                // set the selection to the circuit container
                if(childViewCell.isComponentView())
                    this.graphService.graph.setSelectionCell(childViewCell.children[0]);
                else
                    this.graphService.graph.clearSelection();
                this.graphService.fitCamera();

                // make sure we can't add new strands/interactions/molecules
                this.graphService.setComponentDefinitionMode(this.graphService.graph.getCurrentRoot().isComponentView());

                this.glyphCell = null;
            } else {
                // Zoom out of the glyph
                // remove the last items on the stack
                let previousView = this.graphService.viewStack.pop();
                const newSelectedCell = this.graphService.selectionStack.pop();

                // change the view
                this.view.clear(this.view.currentRoot, true);
                this.view.currentRoot = this.graphService.viewStack[this.graphService.viewStack.length - 1];
                this.view.refresh();

                // set the selection back
                this.graphService.graph.setSelectionCell(newSelectedCell);
                this.graphService.setAllScars(this.graphService.showingScars);

                // make sure we can add new strands/interactions/molecules on the top level
                if (this.graphService.graph.getCurrentRoot() && this.graphService.graph.getCurrentRoot().isViewCell()) {
                    this.graphService.setComponentDefinitionMode(this.graphService.graph.getCurrentRoot().isComponentView());
                    
                    // refresh the circuit containers
                    this.graphService.graph.getCurrentRoot().refreshViewCell(this.graphService.graph);
                }
                
                if (newSelectedCell) {
                    this.glyphCell = newSelectedCell;
                } else {
                    this.glyphCell = previousView;
                }
                
                this.graphService.fitCamera();
            }
        }
    }

}
