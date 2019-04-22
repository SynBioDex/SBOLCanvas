import {Component, OnInit} from '@angular/core';
import {GlyphInfo} from '../glyphInfo';

@Component({
  selector: 'app-sbol-canvas',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  rightBarOpened = true;
  leftBarOpened = true;

  constructor() { }

  ngOnInit() {
  }

}
