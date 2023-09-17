import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { versions } from 'src/environments/versions';
import {FormsModule} from '@angular/forms'
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule, Routes } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
@Component({
  standalone: true,
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css'],
  imports: [MatCardModule, MatDividerModule, MatIconModule, MatToolbarModule,MatButtonModule,FormsModule,RouterModule, MatTooltipModule]
})
export class LandingPageComponent implements OnInit {

  hash = "dev";
  version = "Development";

  constructor(private titleService: Title) {
    this.titleService.setTitle("SBOL Canvas About");
    this.hash = versions.revision;
    this.version = versions.version;
  }

  ngOnInit() {
  }

}
