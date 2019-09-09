import { Injectable } from '@angular/core';
import {GlyphInfo} from './glyphInfo';
import { BehaviorSubject } from 'rxjs';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MetadataService {

  //URLs
  private typesURL = environment.backendURL + '/data/types';
  private rolesURL = environment.backendURL + '/data/roles';

  // Glyph Info
  private glyphInfoSource = new BehaviorSubject(null);
  selectedGlyphInfo = this.glyphInfoSource.asObservable();

  // Color Info
  private colorSource = new BehaviorSubject(null);
  color = this.colorSource.asObservable();

  // TODO: DNA strand info

  constructor(private http: HttpClient) { }

  loadTypes(): Observable<any> {
    return this.http.get(this.typesURL);
  }

  loadRoles(): Observable<any> {
    return this.http.get(this.rolesURL);
  }

  setSelectedGlyphInfo(newInfo: GlyphInfo) {
    this.glyphInfoSource.next(newInfo);
  }

  setColor(newColor: string) {
    this.colorSource.next(newColor);
  }
}
