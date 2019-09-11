import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as FileSaver from 'file-saver';

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  private saveFilesURL = environment.backendURL + '/save';
  private listFilesURL = environment.backendURL + '/list';
  private loadFilesURL = environment.backendURL + '/load';
  private toSBOLURL = environment.backendURL + '/convert/toSBOL';
  private toMxGraphURL = environment.backendURL + '/convert/toMxGraph';

  constructor(
    private http: HttpClient
  ) { }

  save(filename: string, contents: string): Observable<Object> {
    let params = new HttpParams();
    params = params.append("filename", filename);
    let headers = new HttpHeaders();
    headers = headers.append("Content-Type","text/plain");
    return this.http.post(this.saveFilesURL, contents, { headers: headers, params: params });
  }

  list(): Observable<string[]> {
    return this.http.get<string[]>(this.listFilesURL);
  }

  load(filename: string): Observable<string> {
    let params = new HttpParams();
    params = params.append("filename", filename);
    return this.http.get(this.loadFilesURL, { responseType: 'text', params: params });
  }



  saveLocal(filename: string, contents: string){
    this.convertToSBOL(contents).subscribe(result => {
      var file = new File([result], filename+".xml", {type: 'text/plain;charset=utf-8'});
      FileSaver.saveAs(file);
    });
  }

  convertToSBOL(mxGraphXML: string): Observable<string>{
    return this.http.post(this.toSBOLURL, mxGraphXML, {responseType: 'text'});
  }

  convertToMxGraph(sbolXML: string): Observable<string>{
    return this.http.post(this.toMxGraphURL, sbolXML, {responseType: 'text'});
  }

}
