import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { GlyphMenuComponent } from './glyph-menu/glyph-menu.component';
import { CanvasComponent } from './canvas/canvas.component';
import { ColorPaletteComponent } from './color-palette/color-palette.component';
import { InfoEditorComponent } from './info-editor/info-editor.component';
import { HomeComponent } from './home/home.component';
import { AppRoutingModule } from './app-routing.module';

// ng-bootstrap stuff.
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SidebarModule } from 'ng-sidebar';

// Angular Material stuff. This is a different UI library than ng-bootstrap.
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  MatButtonModule,
  MatCheckboxModule,
  MatInputModule,
  MatListModule,
  MatSelectModule,
  MatSidenavModule,
  MatTabsModule
} from '@angular/material';
import {GraphService} from './graph.service';

@NgModule({
  declarations: [
    AppComponent,
    ToolbarComponent,
    GlyphMenuComponent,
    CanvasComponent,
    ColorPaletteComponent,
    InfoEditorComponent,
    HomeComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    NgbModule,
    AppRoutingModule,
    SidebarModule.forRoot(),
    BrowserModule, // BrowserModule must come before all @angular/material modules for some reason.
    BrowserAnimationsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatSidenavModule,
    MatTabsModule,
    MatSelectModule,
    MatInputModule,
    MatListModule,
  ],
  providers: [ GraphService ],
  bootstrap: [ AppComponent ]
})
export class AppModule { }