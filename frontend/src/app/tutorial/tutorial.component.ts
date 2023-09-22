import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Title } from '@angular/platform-browser';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule, Routes } from '@angular/router';
@Component({
  standalone: true,
  selector: 'app-tutorial',
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.css'],
  imports : [MatCardModule, MatSidenavModule, MatIconModule, MatToolbarModule, MatButtonModule, MatTooltipModule, RouterModule]
})
export class TutorialComponent implements OnInit {

  constructor(private titleService: Title) {
    this.titleService.setTitle('SBOL Canvas Tutorial');
   }

  ngOnInit() {
  }

}
