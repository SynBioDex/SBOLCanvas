import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import * as FileSaver from 'file-saver';
import { IdentifiedInfo } from './identifiedInfo';
import { GraphService } from './graph.service';

@Injectable({
  providedIn: 'root'
})
export class FilesService {

  private saveFilesURL = environment.backendURL + '/save';
  private listFilesURL = environment.backendURL + '/list';
  private loadFilesURL = environment.backendURL + '/load';
  private toMxGraphURL = environment.backendURL + '/convert/toMxGraph';
  private exportDesignURL = environment.backendURL + '/convert/exportDesign';
  private enumerateDesignURL = environment.backendURL + '/enumerate';
  private getRegistriesURL = environment.backendURL + '/SynBioHub/registries';
  private listMyCollectionsURL = environment.backendURL + '/SynBioHub/listMyCollections';
  private addToCollectionURL = environment.backendURL + '/SynBioHub/addToCollection';
  private importToCollectionURL = environment.backendURL + '/SynBioHub/importToCollection';
  private createCollectionURL = environment.backendURL + '/SynBioHub/createCollection';
  private listPartsURL = environment.backendURL + '/SynBioHub/listRegistryParts';
  private listCombinatorialsURL = environment.backendURL + '/SynBioHub/listCombinatorials';
  private getPartsURL = environment.backendURL + '/SynBioHub/getRegistryPart';
  private importPartsURL = environment.backendURL + '/SynBioHub/importRegistryPart';

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

  loadLocal(file: File, graphService: GraphService): Observable<void> {
    return new Observable<void>(observer => {
      if (typeof (FileReader) !== 'undefined') {
        const reader = new FileReader();

        reader.onload = (e: any) => {
          this.convertToMxGraph(String(reader.result)).subscribe(result => {
            graphService.setGraphToXML(result);
            observer.next();
          });
        };

        reader.readAsText(file);
      } else {
        observer.next();
      }
    });
  }

  exportDesign(users: {}, filename: string, format: string, contents: string): Observable<void> {
    return new Observable<void>(observer => {
      let headers = new HttpHeaders();
      headers = headers.set("Authorization", this.usersToStringArr(users));
      let params = new HttpParams();
      params = params.append("format", format);
      let formatExtension;
      switch (format) {
        case "GenBank":
          formatExtension = ".GBK"; break;
        case "GFF":
          formatExtension = ".GFF"; break;
        case "Fasta":
          formatExtension = ".fasta"; break;
        default:
          formatExtension = ".xml"; break;
      }
      this.http.post(this.exportDesignURL, contents, { headers: headers, responseType: 'text', params: params }).subscribe(result => {
        var file = new File([result], filename + formatExtension);
        FileSaver.saveAs(file);
        observer.next();
      });
    });
  }

  exportDesignToString(users: {}, format: string, contents: string): Observable<string> {
    return new Observable<string>(observer => {
      let headers = new HttpHeaders();
      headers = headers.set("Authorization", this.usersToStringArr(users));
      let params = new HttpParams();
      params = params.append("format", format);

      this.http.post(this.exportDesignURL, contents, { headers: headers, responseType: 'text', params: params }).subscribe(result => {
        observer.next(result);
      });
    });
  }

  enumerateDesign(users: {}, filename: string, format: string, contents: string): Observable<void> {
    return new Observable<void>(observer => {
      let headers = new HttpHeaders();
      headers = headers.set("Authorization", this.usersToStringArr(users));
      let params = new HttpParams();
      params = params.append("format", format);
      params = params.append("SBOLSource", "true");
      let formatExtension;
      switch(format){
        case "SBOL2":
          formatExtension = ".xml"; break;
        case "CSV":
          formatExtension = ".csv"; break;
      }
      this.http.post(this.enumerateDesignURL, contents, {headers: headers, responseType: 'text', params: params }).subscribe(result => {
        var file = new File([result], filename + formatExtension);
        FileSaver.saveAs(file);
        observer.next();
      });
    });
  }

  async saveRemote(server: string, collection: string, users: {}, contents: string) {
    await this.uploadSBOL(contents, server, collection, users).toPromise();
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

  listParts(user: string, server: string, collection: string, type: string, role: string, mode: string): Observable<IdentifiedInfo[]> {
    let headers = new HttpHeaders();
    if (user != null && user.length > 0)
      headers = headers.set("Authorization", user);
    let params = new HttpParams();
    params = params.append("server", server);
    if (collection != null && collection.length > 0)
      params = params.append("collection", collection);
    if (type != null && type.length > 0)
      params = params.append("type", type);
    if (role != null && role.length > 0)
      params = params.append("role", role);
    params = params.append("mode", mode);
    return this.http.get<IdentifiedInfo[]>(this.listPartsURL, { headers: headers, params: params });
  };

  listCombinatorials(user: string, server: string, template: string): Observable<any>{
    let headers = new HttpHeaders();
    if(user != null && user.length > 0)
      headers = headers.set("Authorization", user);
    let params = new HttpParams();
    params = params.append("server", server);
    params = params.append("template", template);
    return this.http.get<string>(this.listCombinatorialsURL, { headers: headers, params: params });
  }

  getPart(user: string, server: string, uri: string, combinatorial?: string): Observable<string> {
    let headers = new HttpHeaders();
    if (user != null && user.length > 0)
      headers = headers.set("Authorization", user);
    let params = new HttpParams();
    if(combinatorial)
      params = params.append("combinatorial", combinatorial);
    params = params.append("server", server);
    params = params.append("uri", uri);
    return this.http.get(this.getPartsURL, { responseType: 'text', headers: headers, params: params });
  }

  importPart(user: string, server: string, uri: string): Observable<string> {
    let headers = new HttpHeaders();
    if (user != null && user.length > 0)
      headers = headers.set("Authorization", user);
    let params = new HttpParams();
    params = new HttpParams();
    params = params.append("server", server);
    params = params.append("uri", uri);
    return this.http.get(this.importPartsURL, { responseType: 'text', headers: headers, params: params });
  }

  convertToMxGraph(sbolXML: string): Observable<string> {
    return this.http.post(this.toMxGraphURL, sbolXML, { responseType: 'text' });
  }

  uploadSBOL(mxGraphXML: string, server: string, collection: string, users: {}) {
    let headers = new HttpHeaders();
    headers = headers.set("Authorization", this.usersToStringArr(users));
    let params = new HttpParams();
    params = params.append("server", server);
    params = params.append("uri", collection);
    return this.http.post(this.addToCollectionURL, mxGraphXML, { responseType: 'text', headers: headers, params: params });
  }

  importSBOL(file: File, server: string, collection: string, user: string){
    return new Observable<void>(observer => {
      if (typeof (FileReader) !== 'undefined') {
        const reader = new FileReader();

        reader.onload = (e: any) => {
          let headers = new HttpHeaders();
          headers = headers.set("Authorization", user);
          let params = new HttpParams();
          params = params.append("server", server);
          params = params.append("uri", collection);
          this.http.post(this.importToCollectionURL, String(reader.result), { responseType: 'text', headers: headers, params: params }).subscribe(_ => {
            observer.next();
          });
        };

        reader.readAsText(file);
      } else {
        observer.next();
      }
    });
  }

  createCollection(server: string, user: string, id: string, version: string, name: string, description: string, citations: string, overwrite: boolean): Observable<void>{
    return new Observable<void>(observer => {
      let headers = new HttpHeaders();
      headers = headers.set("Authorization", user);
      let params = new HttpParams();
      params = params.append("server", server);
      params = params.append("id", id);
      params = params.append("version", version);
      params = params.append("name", name);
      params = params.append("description", description);
      params = params.append("citations", citations);
      params = params.append("overwrite", overwrite ? "true" : "false");
      return this.http.post(this.createCollectionURL, "", {responseType: 'text', headers: headers, params: params }).subscribe(result => {
        observer.next();
      });
    });
  }

  private usersToStringArr(users: {}): string[] {
    let usersStringArr: string[] = [];
    for(let key in users){
      usersStringArr.push(key+" "+users[key]);
    }
    return usersStringArr;
  }

}
