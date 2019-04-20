import {Component, OnInit} from '@angular/core';
import {GlyphInfo} from '../glyphInfo';

@Component({
  selector: 'app-sbol-canvas',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  currentColor: string;
  rightBarOpened = true;
  leftBarOpened = true;

  /*public curGlyphInfo: GlyphInfo = {
    name: 'the selectedGlyphInfo',
    description: 'the description'
  };*/

  constructor() { }

  ngOnInit() {
  }

  /*onColorChanged(color: string) {
    this.currentColor = color;
  }*/

  /*onGlyphInfoChanged(part: GlyphInfo) {
    this.curGlyphInfo = part;
    console.log(this.curGlyphInfo);
  }*/

}
