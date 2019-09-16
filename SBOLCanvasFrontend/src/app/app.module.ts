import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ReactiveFormsModule} from '@angular/forms'; // Added for color picker.

import { AppComponent } from './app.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { GlyphMenuComponent } from './glyph-menu/glyph-menu.component';
import { CanvasComponent } from './canvas/canvas.component';
import { ColorPaletteComponent } from './color-palette/color-palette.component';
import { InfoEditorComponent } from './info-editor/info-editor.component';
import { HomeComponent } from './home/home.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';

// Angular Material stuff. This is a different UI library than ng-bootstrap.
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { MaterialModule } from './material.module';

import {GraphService} from './graph.service';

// Color Picker imports.
import {MccColorPickerModule} from 'material-community-components';
import {MetadataService} from './metadata.service';
import { SaveGraphComponent } from './save-graph/save-graph.component';
import { LoadGraphComponent } from './load-graph/load-graph.component';
import { BannerComponent } from './banner/banner.component';


@NgModule({
  declarations: [
    AppComponent,
    ToolbarComponent,
    GlyphMenuComponent,
    CanvasComponent,
    ColorPaletteComponent,
    InfoEditorComponent,
    HomeComponent,
    SaveGraphComponent,
    LoadGraphComponent,
    BannerComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    BrowserModule, // BrowserModule must come before all @angular/material modules for some reason.
    BrowserAnimationsModule,
    HttpClientModule,
    MccColorPickerModule.forRoot({
      used_colors: ['#000000', '#123456', '#777666']
    }),
    ReactiveFormsModule,
    MaterialModule
  ],
  providers: [GraphService, MetadataService],
  bootstrap: [AppComponent],
  entryComponents: [ ToolbarComponent, SaveGraphComponent, LoadGraphComponent ]
})
export class AppModule {
}
