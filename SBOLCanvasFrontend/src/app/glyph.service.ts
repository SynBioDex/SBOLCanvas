import { Injectable } from '@angular/core';

declare var require: any;
const mx = require('mxgraph')({
  mxImageBasePath: 'mxgraph/images',
  mxBasePath: 'mxgraph'
});

@Injectable({
  providedIn: 'root'
})
export class GlyphService {

  // TODO load list of xml files from server
  private xmlUrls: string[] = [
    'assets/glyph_stencils/promoter.xml'
  ];

  private stencils: any = {};

  constructor() {
    this.xmlUrls.forEach((filename) => {
      let req = mx.mxUtils.load(filename);
      let root = req.getDocumentElement();
      let shape = root.firstChild;

      while (shape != null) {
        if (shape.nodeType == mx.mxConstants.NODETYPE_ELEMENT) {
          const name = shape.getAttribute('name');
          const stencil = new mx.mxStencil(shape);

          this.stencils[name] = stencil;
        }
        shape = shape.nextSibling;
      }
    });
  }

  getStencils() {
    return this.stencils;
  }

  getSvg() {
    let elt = document.createElement('svg');

    let canvas = new mx.mxSvgCanvas2D(elt);
    let stencil = this.stencils['promoter'];
    let shape = new mx.mxShape(stencil);

    stencil.drawShape(canvas, shape, 0, 0, 52, 104);

    return elt;
  }
}
