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
      'assets/glyphs/amino-acid.png',
      'assets/glyphs/aptamer.png',
      'assets/glyphs/arrowcds.png',
      'assets/glyphs/assembly-junction.png',
      'assets/glyphs/base.png',
      'assets/glyphs/blank-backbone.png',
      'assets/glyphs/blunt-restriction-site.png',
      'assets/glyphs/cds.png',
      'assets/glyphs/cut2.png',
      'assets/glyphs/cut.png',
      'assets/glyphs/dna-stability-element.png',
      'assets/glyphs/engineered-region.png',
      'assets/glyphs/five-prime-overhang.png',
      'assets/glyphs/insulator.png',
      'assets/glyphs/junction.png',
      'assets/glyphs/no-glyph-assigned.png',
      'assets/glyphs/non-coding-rna-gene.png',
      'assets/glyphs/omitted-detail.png',
      'assets/glyphs/operator.png',
      'assets/glyphs/origin-of-replication.png',
      'assets/glyphs/origin-of-transfer.png',
      'assets/glyphs/poly-a-site.png',
      'assets/glyphs/primer-binding-site.png',
      'assets/glyphs/promoter.png',
      'assets/glyphs/protease-site.png',
      'assets/glyphs/protein-stability-element.png',
      'assets/glyphs/restriction-enzyme-recognition-site.png',
      'assets/glyphs/restriction-site-with-no-overhang.png',
      'assets/glyphs/ribonuclease-site.png',
      'assets/glyphs/rna-stability-element.png',
      'assets/glyphs/signature.png',
      'assets/glyphs/specific-recombination-site.png',
      'assets/glyphs/terminator.png',
      'assets/glyphs/three-prime-overhang.png',
      'assets/glyphs/translational-start-site.png',
      'assets/glyphs/unspecified.png',
    ];

    for (const imgName of glyphPics) {
      const dragSource = this.graphService.createGlyphDragSource(imgName);
      this.glyphMenuContainer.nativeElement.appendChild(dragSource);
    }

  }

}
