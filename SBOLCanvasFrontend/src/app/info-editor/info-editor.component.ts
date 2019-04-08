import { Component, OnInit } from '@angular/core';
import { Part } from '../part';


@Component({
  selector: 'app-info-editor',
  templateUrl: './info-editor.component.html',
  styleUrls: ['./info-editor.component.css']
})

export class InfoEditorComponent implements OnInit {

  private part: Part = {
    name: 'the part',
    description: 'the description'
  };

  constructor() { }

  ngOnInit() {
  }

}
