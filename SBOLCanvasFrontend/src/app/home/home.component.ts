import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  currentColor: string;
  rightBarOpened = true;
  leftBarOpened = true;

  constructor() { }

  ngOnInit() {
  }

  onColorChanged(color: string){
    this.currentColor = color;
  }

}
