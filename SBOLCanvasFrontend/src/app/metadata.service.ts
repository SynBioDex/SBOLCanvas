import { Injectable } from '@angular/core';
import {GlyphInfo} from './glyphInfo';
import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import {InteractionInfo} from "./interactionInfo";

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
   * For example, for the color pallet component to update the selected color when a new glyph is
   * selected, it makes this call in the constructor:
   * 'this.metadataService.color.subscribe(color => this.newSelection(color));'
   *
   * Now, whenever the color is updated by selecting a new glyph, the color will be updated in
   * this service, then color pallet will be notified of the event and be passed the new color.
   * The color pallet will then call newSelection(color), which will update it's pallet
   * to reflect the color of the newly selected glyph.
   *
   * In order to track data that is being passed around, all data passed to the UI components
   * should be passed through here, even it is not asynchronous.
   */

  // Glyph Info
  //URLs
  private typesURL = environment.backendURL + '/data/types';
  private rolesURL = environment.backendURL + '/data/roles';
  private refinementsURL = environment.backendURL + '/data/refine';

  // Glyph Info
  private glyphInfoSource = new BehaviorSubject(null);
  selectedGlyphInfo = this.glyphInfoSource.asObservable();

  // Interaction Info
  private interactionInfoSource = new BehaviorSubject(null);
  selectedInteractionInfo = this.interactionInfoSource.asObservable();

  // Color Info
  private colorSource = new BehaviorSubject(null);
  color = this.colorSource.asObservable();

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

  setSelectedGlyphInfo(newInfo: GlyphInfo) {
    this.glyphInfoSource.next(newInfo);
  }

  setSelectedInteractionInfo(newInfo: InteractionInfo) {
    this.interactionInfoSource.next(newInfo);
  }

  setColor(newColor: string) {
    this.colorSource.next(newColor);
  }

  setComponentDefinitionMode(newSetting: boolean) {
    this.componentDefinitionModeSource.next(newSetting)
  }
}
