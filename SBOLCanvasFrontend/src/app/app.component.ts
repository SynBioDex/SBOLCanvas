import { Component } from '@angular/core';
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
