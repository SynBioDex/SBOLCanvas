import { Component } from '@angular/core';

// Attributes to be added to the window object. For some reason these don't get added from mxgraph in Angular 13+
declare global {
  interface Window {
    mxBasePath: string;
    mxImageBasePath: string;
    mxLoadResources: boolean;
    mxForceIncludes: boolean;
    mxLoadStylesheets: boolean;
    mxResourceExtension: string;
  }
}

// mxBasePath and ImagePath should technically be empty here as they get set anyways in the require, 
// but doesn't hurt to have them here unless they need to be changed.
window.mxBasePath = 'mxgraph';
window.mxImageBasePath = 'mxgraph/images'
window.mxLoadResources = true;
window.mxForceIncludes = false;
window.mxLoadStylesheets = true;
window.mxResourceExtension = '.txt';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'SBOLCanvasFrontend';
}
