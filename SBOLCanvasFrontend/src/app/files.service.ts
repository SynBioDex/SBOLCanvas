import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as FileSaver from 'file-saver';
import { GraphService } from './graph.service';

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  private saveFilesURL = environment.backendURL + '/save';
  private listFilesURL = environment.backendURL + '/list';
  private loadFilesURL = environment.backendURL + '/load';
  private toSBOLURL = environment.backendURL + '/convert/toSBOL';
  private toMxGraphURL = environment.backendURL + '/convert/toMxGraph';
  private getRegistriesURL = environment.backendURL + '/SynBioHub/registries';
  private listMyCollectionsURL = environment.backendURL + '/SynBioHub/listMyCollections';
  private addToCollectionURL = environment.backendURL + '/SynBioHub/addToCollection';

  constructor(
    private http: HttpClient
  ) { }

  save(filename: string, contents: string): Observable<Object> {
    let params = new HttpParams();
    params = params.append("filename", filename);
    let headers = new HttpHeaders();
    headers = headers.append("Content-Type", "text/plain");
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

  loadLocal(file: File, graphService: GraphService) {
    if (typeof (FileReader) !== 'undefined') {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        this.convertToMxGraph(String(reader.result)).subscribe(result => {
          graphService.setGraphToXML(result);
        });
      };

      reader.readAsText(file);
    }

  }

  saveLocal(filename: string, contents: string) {
    this.convertToSBOL(contents, filename).subscribe(result => {
      var file = new File([result], filename + ".xml", { type: 'text/plain;charset=utf-8' });
      FileSaver.saveAs(file);
    });
  }

  async saveRemote(server: string, collection: string, user: string, filename: string, contents: string) {
    await this.uploadSBOL(contents, server, collection, user, filename).toPromise();
  }

  getRegistries(): Observable<any> {
    return this.http.get(this.getRegistriesURL);
  }

  listMyCollections(user: string, server: string): Observable<any> {
    let headers = new HttpHeaders();
    headers = headers.set("Authorization", user);
    let params = new HttpParams();
    params = params.append("server", server);
    return this.http.get(this.listMyCollectionsURL, { headers: headers, params: params });
  }

  convertToSBOL(mxGraphXML: string, filename: string): Observable<string> {
    let params = new HttpParams();
    params = params.append("name", filename);
    return this.http.post(this.toSBOLURL, mxGraphXML, { responseType: 'text', params: params });
  }

  convertToMxGraph(sbolXML: string): Observable<string> {
    return this.http.post(this.toMxGraphURL, sbolXML, { responseType: 'text' });
  }

  uploadSBOL(mxGraphXML: string, server: string, collection: string, user: string, filename: string) {
    let headers = new HttpHeaders();
    headers = headers.set("Authorization", user);
    let params = new HttpParams();
    params = params.append("name", filename);
    params = params.append("server", server);
    params = params.append("uri", collection);
    return this.http.post(this.addToCollectionURL, mxGraphXML, { responseType: 'text', headers: headers, params: params });
  }

}
