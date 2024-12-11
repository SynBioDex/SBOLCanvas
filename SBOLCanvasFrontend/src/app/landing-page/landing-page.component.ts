import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { versions } from 'src/environments/versions';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrls: ['./landing-page.component.css']
})
export class LandingPageComponent implements OnInit {

  hash = "dev";
  version = "Development";

  constructor(private titleService: Title) {
    this.titleService.setTitle("SBOL Canvas About");
    this.hash = versions.revision;
    this.version = versions.version;
  }


  // Add any additional contributors here
  contributors: Array<String>  = [
    "Suhyun Bae",
    "Samuel Bridge",
    "Jared Earl", 
    "Alex Elbel",
    "Derick Sayavong",
    "Zach Sents", 
    "Logan Terry", 
    "Samuel Thayer"
  ]
  
  
  ngOnInit() {
  }

}
