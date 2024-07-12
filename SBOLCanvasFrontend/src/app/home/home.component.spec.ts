import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AppRoutingModule } from '../app-routing.module';
import { AppComponent } from '../app.component';
import { BannerComponent } from '../banner/banner.component';
import { CanvasComponent } from '../canvas/canvas.component';
import { CollectionCreationComponent } from '../collection-creation/collection-creation.component';
import { ColorPickerComponent } from '../color-picker/color-picker.component';
import { CombinatorialDesignEditorComponent } from '../combinatorial-design-editor/combinatorial-design-editor.component';
import { ConfirmComponent } from '../confirm/confirm.component';
import { DesignMenuComponent } from '../design-menu/design-menu.component';
import { DownloadGraphComponent } from '../download-graph/download-graph.component';
import { ErrorComponent } from '../error/error.component';
import { ExportDesignComponent } from '../export-design/export-design.component';
import { ExportImageComponent } from '../export-image/export-image.component';
import { FuncCompSelectorComponent } from '../func-comp-selector/func-comp-selector.component';
import { GlyphMenuComponent } from '../glyph-menu/glyph-menu.component';
import { GraphService } from '../graph.service';
import { AppHttpInterceptor } from '../http.interceptor';
import { InfoEditorComponent } from '../info-editor/info-editor.component';
import { LandingPageComponent } from '../landing-page/landing-page.component';
import { LoadGraphComponent } from '../load-graph/load-graph.component';
import { LoginComponent } from '../login/login.component';
import { MaterialModule } from '../material.module';
import { MetadataService } from '../metadata.service';
import { PendingChangesGuard } from '../pending-changes.guard';
import { SearchfilterPipe } from '../searchfilter.pipe';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { TutorialComponent } from '../tutorial/tutorial.component';
import { UploadGraphComponent } from '../upload-graph/upload-graph.component';
import { ColorPickerModule } from 'ngx-color-picker';

import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
    declarations: [
        AppComponent,
        ToolbarComponent,
        GlyphMenuComponent,
        CanvasComponent,
        DesignMenuComponent,
        InfoEditorComponent,
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
        LoadGraphComponent,
    ],
    imports: [BrowserModule,
        FormsModule,
        AppRoutingModule,
        BrowserModule, // BrowserModule must come before all @angular/material modules for some reason.
        BrowserAnimationsModule,
        ReactiveFormsModule,
        MaterialModule,
        FlexLayoutModule,
        ColorPickerModule],
    providers: [PendingChangesGuard, GraphService, MetadataService, {
            provide: HTTP_INTERCEPTORS, useClass: AppHttpInterceptor, multi: true
        }, provideHttpClient(withInterceptorsFromDi())]
})
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });
});
