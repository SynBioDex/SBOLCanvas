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
    'assets/glyph_stencils/engineered-region.xml',
    'assets/glyph_stencils/five-prime-sticky-restriction-site.xml',
    'assets/glyph_stencils/location-rna.xml',
    'assets/glyph_stencils/location-protein.xml',
    'assets/glyph_stencils/ribosome-entry-site.xml',
    'assets/glyph_stencils/terminator-specification.xml',
    'assets/glyph_stencils/assembly-scar.xml',
    //'assets/glyph_stencils/downloads.xml'
  ];

  private molecularSpeciesXMLs: string[] = [
    // 'molecular species' glyphs aka protein?
    'assets/glyph_stencils/molecular_species/macromolecule.xml'
  ]

  private interactionXMLs: string[] = [
    'assets/glyph_stencils/interactions/control.xml',
    'assets/glyph_stencils/interactions/inhibition.xml'
  ]

  private interactionMarkerXMLs: string[] = [
    'assets/glyph_stencils/interactions/control.xml',
    'assets/glyph_stencils/interactions/inhibition.xml',
    'assets/glyph_stencils/cds.xml',
  ]

  private utilXMLs: string[] = [
    'assets/backbone.xml',
    'assets/textBox.xml',
  ]

  private sequenceFeatures: any = {};
  private molecularSpecies: any = {};
  private interactionMarkers: any = {};
  private interactions: any = {};
  private utils: any = {};

  constructor() {
    this.loadXMLs(this.sequenceFeatureXMLs, this.sequenceFeatures);
    this.loadXMLs(this.molecularSpeciesXMLs, this.molecularSpecies);
    this.loadXMLs(this.interactionXMLs, this.interactions);
    this.loadXMLs(this.interactionMarkerXMLs, this.interactionMarkers);
    this.loadXMLs(this.utilXMLs, this.utils);
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

  getElements(glyph_list) {
    const svgs = {};

    for (const name in glyph_list) {
      const stencil = glyph_list[name][0];

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

  getSequenceFeatureGlyphs() {
    return this.sequenceFeatures;
  }

  getMolecularSpeciesGlyphs() {
    return this.molecularSpecies;
  }

  getInteractionMarkerGlyphs() {
    return this.interactionMarkers;
  }

  getUtilElements() {
    return this.getElements(this.utils)
  }

  getInteractionElements() {
    return this.getElements(this.interactions);
  }

  getMolecularSpeciesElements() {
    return this.getElements(this.molecularSpecies);
  }

  getSequenceFeatureElements() {
    return this.getElements(this.sequenceFeatures);
  }
}
