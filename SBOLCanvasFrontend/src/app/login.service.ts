import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { LoginComponent } from './login/login.component';
import { MatDialog } from '@angular/material';
import { Observable } from 'rxjs';

export interface LoginDialogData {
  server: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  
  private loginURL = environment.backendURL + '/SynBioHub/login';
  private logoutURL = environment.backendURL + '/SynBioHub/logout';

  public users: {} = {};

  constructor(private http: HttpClient, public dialog: MatDialog) {
    
  }

  openLoginDialog(registry: string): Observable<any>{
    const loginDialogRef = this.dialog.open(LoginComponent, {
      data: { server: registry }
    });

    return loginDialogRef.afterClosed();
  }

  login(email: string, password: string, server: string): Observable<string> {
    // email and password in headers, because I've been told that they don't end up in log files like the url does
    let headers = new HttpHeaders();
    headers = headers.set("Authorization", email + ":" + password);
    let params = new HttpParams();
    params = params.append("server", server);
    return this.http.get(this.loginURL, { responseType: 'text', headers: headers, params: params });
  }

  async logout(server: string) {
    let headers = new HttpHeaders();
    headers = headers.set("Authorization", this.users[server]);
    let params = new HttpParams();
    params = params.append("server", server);
    await this.http.get(this.logoutURL, { headers: headers, params: params }).toPromise();

    delete this.users[server];
  }

}
