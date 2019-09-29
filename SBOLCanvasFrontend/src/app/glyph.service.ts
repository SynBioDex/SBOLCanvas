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
  private sequenceFeatureXMLs: string[] = [
    // Strand glyphs
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

  private molecularSpeciesXMLs: string[] = [
    // 'molecular species' glyphs aka protein?
    'assets/glyph_stencils/molecular_species/macromolecule.xml'
  ]

  private interactionXMLs: string[] = [

  ]

  private sequenceFeatures: any = {};
  private molecularSpecies: any = {};
  private interactions: any = {};

  constructor() {
    this.loadXMLs(this.sequenceFeatureXMLs, this.sequenceFeatures)
    this.loadXMLs(this.molecularSpeciesXMLs, this.molecularSpecies)
    this.loadXMLs(this.interactionXMLs, this.interactions)
  }

  loadXMLs(xml_list, glyph_list) {
    xml_list.forEach((filename) => {
      let req = mx.mxUtils.load(filename);
      let root = req.getDocumentElement();
      let shape = root.firstChild;


      while (shape != null) {
        if (shape.nodeType == mx.mxConstants.NODETYPE_ELEMENT) {
          const name = shape.getAttribute('name');
          const centered = shape.getAttribute('centered');

          const stencil = new mx.mxStencil(shape);

          glyph_list[name] = [stencil, (centered && centered.toLowerCase() == 'true')];
        }
        shape = shape.nextSibling;
      }
    });
  }

  getStencils() {
    return this.sequenceFeatures;
  }

  getInteractionElements() {
    const svgs = {};

    for (const name in this.interactions) {
      const stencil = this.interactions[name][0];

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

  getMolecularSpecieElements() {
    const svgs = {};

    for (const name in this.molecularSpecies) {
      const stencil = this.molecularSpecies[name][0];

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

  getSequenceFeatureElements() {
    const svgs = {};

    for (const name in this.sequenceFeatures) {
      const stencil = this.sequenceFeatures[name][0];

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
