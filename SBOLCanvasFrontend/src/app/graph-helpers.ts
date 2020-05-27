import { GraphBase, mx } from './graph-base';
import { GlyphService } from './glyph.service';
import { GraphEdits } from './graph-edits';
import { GlyphInfo } from './glyphInfo';

/**
 * Extension of the graph base that should contain helper methods to be used in the GraphService.
 * These methods should (in theory) not be used outside of the GraphService.
 */
export class GraphHelpers extends GraphBase {

    constructor(glyphService: GlyphService) {
        super(glyphService);

        this.initLabelDrawing();
    }

    /**
           * Updates a GlyphInfo
           * NOTE: Should only be used if the glyphURI is the same
           */
    updateGlyphDict(info: GlyphInfo) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.glyphInfoEdit(cell0, info, cell0.value[info.getFullURI()]));
    }

    /**
     * Remove a GlyphInfo object from the dictionary
     */
    removeFromGlyphDict(glyphURI: string) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.glyphInfoEdit(cell0, null, cell0.value[glyphURI]));
    }

    /**
     * Add a GlyphInfo object to the dictionary
     */
    addToGlyphDict(info: GlyphInfo) {
        const cell0 = this.graph.getModel().getCell(0);
        this.graph.getModel().execute(new GraphEdits.glyphInfoEdit(cell0, info, null));
    }

    /**
     * Get the GlyphInfo with the given glyphURI from the dictionary
     */
    getFromGlyphDict(glyphURI: string): GlyphInfo {
        const cell0 = this.graph.getModel().getCell(0);
        return cell0.value[glyphURI];
    }

    initLabelDrawing() {
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
}
