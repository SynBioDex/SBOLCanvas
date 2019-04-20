import { Component, OnInit } from '@angular/core';
import {GraphService} from '../graph.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnInit {

  lastGraph: string;
  constructor(private graphService: GraphService) {}

  ngOnInit() {
  }


  save(){
    this.lastGraph = this.graphService.graphToString();
    //console.log(this.lastGraph);
  }

  load() {
    this.graphService.stringToGraph(this.lastGraph);
  }

  delete() {
    this.graphService.delete();
  }
}
