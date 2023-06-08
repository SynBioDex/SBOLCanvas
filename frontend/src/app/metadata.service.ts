import { Injectable } from '@angular/core';
import {GlyphInfo} from './glyphInfo';
import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import {InteractionInfo} from "./interactionInfo";
import {StyleInfo} from './style-info';
import { ModuleInfo } from './moduleInfo';
import { CombinatorialInfo } from './combinatorialInfo';

@Injectable({
  providedIn: 'root'
})
export class MetadataService {

  /**
   * The metadata service can be a confusing object so here is some explanation:
   * Making a variable in the metadata service observable makes it available to
   * other objects asynchronously.
   *
   * The purpose of this is to allow changes to be made to a shared piece of information,
   * and for that information to be made available to whoever is interested without
   * blocking the entire application.
   *
   * In order for another object to use a variable in the metadata service, they need to
   * subscribe to it, and provide a method to handle the new data that was passed to
   * it.
   *
   * In order to track data that is being passed around, all data passed to the UI components
   * should be passed through here, even it is not asynchronous.
   */

  // Glyph Info
  //URLs
  private typesURL = environment.backendURL + '/data/types';
  private rolesURL = environment.backendURL + '/data/roles';
  private refinementsURL = environment.backendURL + '/data/refine';
  private interactionsURL = environment.backendURL + '/data/interactions';
  private interactionRolesURL = environment.backendURL + '/data/interactionRoles';
  private interactionRoleRefinementURL = environment.backendURL + '/data/interactionRoleRefine';

  // Glyph Info
  private glyphInfoSource = new BehaviorSubject(null);
  selectedGlyphInfo = this.glyphInfoSource.asObservable();

  // Interaction Info
  private interactionInfoSource = new BehaviorSubject(null);
  selectedInteractionInfo = this.interactionInfoSource.asObservable();

  // Module info
  private moduleInfoSource = new BehaviorSubject(null);
  selectedModuleInfo = this.moduleInfoSource.asObservable();

  // Combinatorial info
  private combinatorialInfoSource = new BehaviorSubject(null);
  selectedCombinatorialInfo = this.combinatorialInfoSource.asObservable();

  // Style Info
  private styleInfoSource = new BehaviorSubject(new StyleInfo([]));
  style = this.styleInfoSource.asObservable();

  // This boolean tells us if the application is zoomed into a component definition or single glyph
  // If this is true, the UI will disable some things like adding a new DNA strand, because a component
  // Definition cannot have multiple strands.
  private componentDefinitionModeSource = new BehaviorSubject(null);
  componentDefinitionMode = this.componentDefinitionModeSource.asObservable();

  // TODO: DNA strand info

  constructor(private http: HttpClient) { }

  loadTypes(): Observable<any> {
    return this.http.get(this.typesURL);
  }

  loadRoles(): Observable<any> {
    return this.http.get(this.rolesURL);
  }

  loadRefinements(parent:string): Observable<any> {
    let params = new HttpParams();
    params = params.append("parent", parent);
    return this.http.get(this.refinementsURL, {params: params});
  }

  loadInteractions() : Observable<any> {
    return this.http.get(this.interactionsURL);
  }

  loadInteractionRoles() : Observable<any> {
    return this.http.get(this.interactionRolesURL);
  }

  loadInteractionRoleRefinements(parent: string): Observable<any> {
    let params = new HttpParams();
    params = params.append("parent", parent);
    return this.http.get(this.interactionRoleRefinementURL, {params: params});
  }

  setSelectedStyleInfo(newInfo: StyleInfo) {
    this.styleInfoSource.next(newInfo);
  }

  setSelectedGlyphInfo(newInfo: GlyphInfo) {
    this.glyphInfoSource.next(newInfo);
  }

  setSelectedInteractionInfo(newInfo: InteractionInfo) {
    this.interactionInfoSource.next(newInfo);
  }

  setSelectedModuleInfo(newInfo: ModuleInfo) {
    this.moduleInfoSource.next(newInfo);
  }

  setSelectedCombinatorialInfo(newInfo: CombinatorialInfo){
    this.combinatorialInfoSource.next(newInfo);
  }

  setComponentDefinitionMode(newSetting: boolean) {
    this.componentDefinitionModeSource.next(newSetting)
  }
}
