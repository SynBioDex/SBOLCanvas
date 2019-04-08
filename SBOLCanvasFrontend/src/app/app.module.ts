import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { GlyphMenuComponent } from './glyph-menu/glyph-menu.component';
import { CanvasComponent } from './canvas/canvas.component';
import { ColorPaletteComponent } from './color-palette/color-palette.component';
import { InfoEditorComponent } from './info-editor/info-editor.component';
import { HomeComponent } from './home/home.component';

@NgModule({
  declarations: [
    AppComponent,
    ToolbarComponent,
    GlyphMenuComponent,
    CanvasComponent,
    ColorPaletteComponent,
    InfoEditorComponent,
    HomeComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
