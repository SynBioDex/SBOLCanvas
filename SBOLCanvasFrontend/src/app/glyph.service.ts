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
    'assets/glyph_stencils/promoter.xml',
    'assets/glyph_stencils/cds.xml',
    'assets/glyph_stencils/aptamer.xml',
    'assets/glyph_stencils/dna-stability-element.xml',
    'assets/glyph_stencils/insulator.xml',
    'assets/glyph_stencils/location-dna.xml',
    'assets/glyph_stencils/cds-arrow.xml',
    'assets/glyph_stencils/engineered-region.xml',
    'assets/glyph_stencils/five-prime-sticky-restriction-site.xml',
    'assets/glyph_stencils/location-rna.xml',
    'assets/glyph_stencils/location-protein.xml',
    'assets/glyph_stencils/ribosome-entry-site.xml',
    //'assets/glyph_stencils/downloads.xml'
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
          const centered = shape.getAttribute('centered');

          const stencil = new mx.mxStencil(shape);

          this.stencils[name] = [stencil, (centered && centered.toLowerCase() == 'true')];
        }
        shape = shape.nextSibling;
      }
    });
  }

  getStencils() {
    return this.stencils;
  }

  getSvgElements() {
    const svgs = {};

    for (const name in this.stencils) {
      const stencil = this.stencils[name][0];

      let elt = document.createElement('svg');
      let canvas = new mx.mxSvgCanvas2D(elt);
      let shape = new mx.mxShape(stencil);

      canvas.setStrokeColor('#000000');
      canvas.setFillColor('none');

      stencil.drawShape(canvas, shape, 0, 0, 52, 52);

      svgs[name] = elt;
    }

    return svgs;
  }
}
