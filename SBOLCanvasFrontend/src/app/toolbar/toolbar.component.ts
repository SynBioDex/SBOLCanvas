import { Component, OnInit } from '@angular/core';
import {GraphService} from '../graph.service';
import {FilesService} from '../files.service';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnInit {

  lastGraph: string;
  constructor(private graphService: GraphService, private filesService: FilesService) {}

  ngOnInit() {
  }

  save(){
    // this.filesService.save('filename', this.graphService.graphToString()).subscribe();
    this.lastGraph = this.graphService.graphToString();
  }

  load() {
    // this.filesService.load('filename').subscribe(graph => this.graphService.stringToGraph(graph));
    this.graphService.stringToGraph(this.lastGraph);
  }

  delete() {
    this.graphService.delete();
  }
}
