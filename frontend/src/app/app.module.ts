import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms'; // Added for color picker.

import { AppComponent } from './app.component';
//import { ToolbarComponent } from './toolbar/toolbar.component';
//import { GlyphMenuComponent } from './glyph-menu/glyph-menu.component';
//import { CanvasComponent } from './canvas/canvas.component';
import { DesignMenuComponent } from './design-menu/design-menu.component';
//import { InfoEditorComponent } from './info-editor/info-editor.component';
//import { ProblemsComponent } from './problems/problems.component'
//import { HierarchyPreviewComponent } from './hierarchy-preview/hierarchy-preview.component';
//import { ZoomControlsComponent } from './zoom-controls/zoom-controls.component';
//import { HomeComponent } from './home/home.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppHttpInterceptor } from './http.interceptor';

// for warning against leaving the page with unsaved changes
import { PendingChangesGuard } from './pending-changes.guard';

// Angular Material stuff. This is a different UI library than ng-bootstrap.
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from './material.module';
import { FlexLayoutModule } from '@angular/flex-layout';

import { GraphService } from './graph.service';

// Color Picker imports.

import { MccColorPickerModule } from 'material-community-components/color-picker';
import { MetadataService } from './metadata.service';
//import { BannerComponent } from './banner/banner.component';
//import { ColorPickerComponent } from './color-picker/color-picker.component';
//import { UploadGraphComponent } from './upload-graph/upload-graph.component';
//import { LoginComponent } from './login/login.component';
//import { DownloadGraphComponent } from './download-graph/download-graph.component';
//import { ErrorComponent } from './error/error.component';
import { SearchfilterPipe } from './searchfilter.pipe';
//import { ExportImageComponent } from './export-image/export-image.component';
//import { LandingPageComponent } from './landing-page/landing-page.component';
//import { TutorialComponent } from './tutorial/tutorial.component';
//import { ConfirmComponent } from './confirm/confirm.component';
//import { FuncCompSelectorComponent } from './func-comp-selector/func-comp-selector.component';
//import { ExportDesignComponent } from './export-design/export-design.component';
//import { CollectionCreationComponent } from './collection-creation/collection-creation.component';
//import { CombinatorialDesignEditorComponent } from './combinatorial-design-editor/combinatorial-design-editor.component';
//import { LoadGraphComponent } from './load-graph/load-graph.component';
import { EmbeddedService } from './embedded.service';
import { MatCardModule } from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';

import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatDialogModule } from '@angular/material/dialog';
import {MatDividerModule} from '@angular/material/divider';
import {MatExpansionModule} from '@angular/material/expansion';
import {MatGridListModule} from '@angular/material/grid-list';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {MatRadioModule} from '@angular/material/radio';
import {MatSelectModule} from '@angular/material/select';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatTableModule} from '@angular/material/table';
import {MatSliderModule} from '@angular/material/slider';
import {MatSlideToggleModule} from '@angular/material/slide-toggle';
import {MatTabsModule} from '@angular/material/tabs';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatInputModule} from '@angular/material/input';
import {MatListModule} from '@angular/material/list';

import { MatFormFieldModule } from '@angular/material/form-field';



@NgModule({
    declarations: [
        AppComponent,
        // ToolbarComponent,
        // GlyphMenuComponent,
       // CanvasComponent,
        DesignMenuComponent,
        //InfoEditorComponent,
        //ProblemsComponent,
        //HierarchyPreviewComponent,
        //ZoomControlsComponent,
        //HomeComponent,
        //BannerComponent,
        // ColorPickerComponent,
        // UploadGraphComponent,
        // DownloadGraphComponent,
        // LoginComponent,

        // ErrorComponent,
        SearchfilterPipe,
        //ExportImageComponent,
        //LandingPageComponent,
        //TutorialComponent,
        //ConfirmComponent,
        //FuncCompSelectorComponent,
        //ExportDesignComponent,
        //CollectionCreationComponent,
        //CombinatorialDesignEditorComponent,
        //LoadGraphComponent
        
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
        MaterialModule,
        FlexLayoutModule,
        MatCardModule,
        MatButtonModule,
        MatButtonToggleModule,
        MatCardModule,
        MatCheckboxModule,
        MatDialogModule,
        MatDividerModule,
        MatExpansionModule,
        MatGridListModule,
        MatIconModule,
        MatInputModule,
        MatListModule,
        MatMenuModule,
        MatProgressBarModule,
        MatRadioModule,
        MatSelectModule,
        MatSidenavModule,
        MatSliderModule,
        MatSlideToggleModule,
        MatTableModule,
        MatTabsModule,
        MatToolbarModule,
        MatTooltipModule,
        MatFormFieldModule
    ],
    providers: [PendingChangesGuard, GraphService, MetadataService, EmbeddedService, {
        provide: HTTP_INTERCEPTORS, useClass: AppHttpInterceptor, multi: true
    }],
    bootstrap: [AppComponent],
    schemas : [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
 
})
export class AppModule {
}
