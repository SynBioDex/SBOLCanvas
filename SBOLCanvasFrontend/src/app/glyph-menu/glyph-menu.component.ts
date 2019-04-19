import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {GraphService} from '../graph.service';

@Component({
  selector: 'app-glyph-menu',
  templateUrl: './glyph-menu.component.html',
  styleUrls: ['./glyph-menu.component.css']
})
export class GlyphMenuComponent implements OnInit {

  @ViewChild('glyphMenuContainer') glyphMenuContainer: ElementRef;

  constructor(private graphService: GraphService) {
  }

  ngOnInit() {
    const glyphMenuContainer = this.glyphMenuContainer.nativeElement;

    // Since this code happens on front end, it has no way to know
    // what files are available - we'll need a service to do this properly.
    // For now, use hardcoded list of image names
    const glyphPics = [
      'assets/glyphs/aptamer-specification.png',
      'assets/glyphs/assembly-scar-specification-doublestrand.png',
      'assets/glyphs/blunt-restriction-site-specification.png',
      'assets/glyphs/cds-arrow-specification.png',
      'assets/glyphs/cds-specification.png',
      'assets/glyphs/composite-specification.png',
      'assets/glyphs/dna-stability-element-specification.png',
      'assets/glyphs/engineered-region-specification.png',
      'assets/glyphs/five-prime-overhang-specification.png',
      'assets/glyphs/five-prime-sticky-restriction-site-specification.png',
      'assets/glyphs/halfround-rectangle-specification.png',
      'assets/glyphs/insulator-specification.png',
      'assets/glyphs/location-dna-no-top-specification.png',
      'assets/glyphs/location-dna-specification.png',
      'assets/glyphs/location-protein-no-top-specification.png',
      'assets/glyphs/location-protein-specification.png',
      'assets/glyphs/location-rna-no-top-specification.png',
      'assets/glyphs/location-rna-specification.png',
      'assets/glyphs/ncrna-specification.png',
      'assets/glyphs/no-glyph-assigned-specification.png',
      'assets/glyphs/nuclease-site-specification.png',
      'assets/glyphs/omitted-detail-specification.png',
      'assets/glyphs/operator-specification.png',
      'assets/glyphs/origin-of-replication-specification.png',
      'assets/glyphs/origin-of-transfer-specification.png',
      'assets/glyphs/polyA-specification.png',
      'assets/glyphs/primer-binding-site-specification.png',
      'assets/glyphs/promoter-specification.png',
      'assets/glyphs/protease-site-specification.png',
      'assets/glyphs/protein-stability-element-specification.png',
      'assets/glyphs/replacement-glyph-specification.png',
      'assets/glyphs/ribonuclease-site-specification.png',
      'assets/glyphs/ribosome-entry-site-specification.png',
      'assets/glyphs/rna-stability-element-specification.png',
      'assets/glyphs/signature-specification.png',
      'assets/glyphs/specific-recombination-site-specification.png',
      'assets/glyphs/terminator-specification.png'
    ];

    for (const imgName of glyphPics) {
      const dragSource = this.graphService.createGlyphDragSource(imgName);
      this.glyphMenuContainer.nativeElement.appendChild(dragSource);
    }

  }

}
