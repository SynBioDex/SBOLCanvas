import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  //private baseURL = 'api';
  private baseURL = 'http://localhost:8080/SBOLCanvasBackend';
  private saveFilesURL = this.baseURL + '/save';
  private listFilesURL = this.baseURL + '/list';
  private loadFilesURL = this.baseURL + '/load';

  constructor(
    private http: HttpClient
  ) { }

  save(filename: string, contents: string): void {
    let params = new HttpParams();
    params.append("filename", filename);
    this.http.post(this.saveFilesURL, contents, { params: params });
  }

  list(): Observable<string[]> {
    return this.http.get<string[]>(this.listFilesURL);
  }

  load(filename: string): Observable<string> {
    let params = new HttpParams();
    params.append("filename", filename);
    return this.http.get<string>(this.loadFilesURL, { params: params });
  }

}
