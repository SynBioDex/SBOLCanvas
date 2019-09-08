import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private typesURL = environment.backendURL + '/data/types';

  constructor(private http: HttpClient) { }

  getTypes(): Observable<any> {
    return this.http.get(this.typesURL);
  }

}
