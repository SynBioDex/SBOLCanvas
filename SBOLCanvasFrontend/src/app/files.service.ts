import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  private saveFilesURL = environment.backendURL + '/save';
  private listFilesURL = environment.backendURL + '/list';
  private loadFilesURL = environment.backendURL + '/load';

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
