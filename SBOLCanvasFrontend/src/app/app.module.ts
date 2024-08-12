import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms'; // Added for color picker.

import { AppComponent } from './app.component';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { GlyphMenuComponent } from './glyph-menu/glyph-menu.component';
import { CanvasComponent } from './canvas/canvas.component';
import { DesignMenuComponent } from './design-menu/design-menu.component';
import { InfoEditorComponent } from './info-editor/info-editor.component';
import { ProblemsComponent } from './problems/problems.component'
import { HierarchyPreviewComponent } from './hierarchy-preview/hierarchy-preview.component';
import { HierarchyGlyphPreviewComponent } from './hierarchy-glyph-preview/hierarchy-glyph-preview.component';
import { ZoomControlsComponent } from './zoom-controls/zoom-controls.component';
import { HomeComponent } from './home/home.component';
import { AppRoutingModule } from './app-routing.module';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AppHttpInterceptor } from './http.interceptor';

// for warning against leaving the page with unsaved changes
import { PendingChangesGuard } from './pending-changes.guard';

// Angular Material stuff. This is a different UI library than ng-bootstrap.
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material.module';
import { FlexLayoutModule } from '@angular/flex-layout';

import { GraphService } from './graph.service';

// Color Picker imports.
import { ColorPickerModule } from 'ngx-color-picker';
import { MetadataService } from './metadata.service';
import { BannerComponent } from './banner/banner.component';
import { ColorPickerComponent } from './color-picker/color-picker.component';
import { UploadGraphComponent } from './upload-graph/upload-graph.component';
import { LoginComponent } from './login/login.component';
import { DownloadGraphComponent } from './download-graph/download-graph.component';
import { ErrorComponent } from './error/error.component';
import { SearchfilterPipe } from './searchfilter.pipe';
import { ExportImageComponent } from './export-image/export-image.component';
import { LandingPageComponent } from './landing-page/landing-page.component';
import { TutorialComponent } from './tutorial/tutorial.component';
import { ConfirmComponent } from './confirm/confirm.component';
import { FuncCompSelectorComponent } from './func-comp-selector/func-comp-selector.component';
import { ExportDesignComponent } from './export-design/export-design.component';
import { CollectionCreationComponent } from './collection-creation/collection-creation.component';
import { CombinatorialDesignEditorComponent } from './combinatorial-design-editor/combinatorial-design-editor.component';
import { LoadGraphComponent } from './load-graph/load-graph.component';
import { EmbeddedService } from './embedded.service';


@NgModule({ declarations: [
        AppComponent,
        ToolbarComponent,
        GlyphMenuComponent,
        CanvasComponent,
        DesignMenuComponent,
        InfoEditorComponent,
        ProblemsComponent,
        HierarchyPreviewComponent,
        HierarchyGlyphPreviewComponent,
        ZoomControlsComponent,
        HomeComponent,
        BannerComponent,
        ColorPickerComponent,
        UploadGraphComponent,
        DownloadGraphComponent,
        LoginComponent,
        DownloadGraphComponent,
        ErrorComponent,
        SearchfilterPipe,
        ExportImageComponent,
        LandingPageComponent,
        TutorialComponent,
        ConfirmComponent,
        FuncCompSelectorComponent,
        ExportDesignComponent,
        CollectionCreationComponent,
        CombinatorialDesignEditorComponent,
        LoadGraphComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        FormsModule,
        AppRoutingModule,
        BrowserModule, // BrowserModule must come before all @angular/material modules for some reason.
        BrowserAnimationsModule,
        ReactiveFormsModule,
        MaterialModule,
        FlexLayoutModule,
        ColorPickerModule], providers: [PendingChangesGuard, GraphService, MetadataService, EmbeddedService, {
            provide: HTTP_INTERCEPTORS, useClass: AppHttpInterceptor, multi: true
        }, provideHttpClient(withInterceptorsFromDi())] })
export class AppModule {
}
