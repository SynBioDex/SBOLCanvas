import { Component, OnInit } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
@Component({
  standalone: true,
  selector: 'app-banner',
  templateUrl: './banner.component.html',
  styleUrls: ['./banner.component.css'],
  imports: [MatToolbarModule]
})
export class BannerComponent implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
