import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpResponse, HttpErrorResponse }   from '@angular/common/http';
import { Injectable } from "@angular/core"
import { Observable, of, throwError } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { MatDialog } from '@angular/material/dialog';
import { ErrorComponent } from './error/error.component';
import { ActivatedRoute } from '@angular/router'
import { LoginService } from './login.service';


@Injectable()
export class AppHttpInterceptor implements HttpInterceptor {

    ignoreHTTPErrors: boolean

    constructor(public dialog: MatDialog, private route: ActivatedRoute, private loginService: LoginService) {
        this.route.queryParams.subscribe(params => {
            this.ignoreHTTPErrors = !!params.ignoreHTTPErrors
        })
    }
intercept(
        req: HttpRequest<any>,
        next: HttpHandler
      ): Observable<HttpEvent<any>> {
    
        return next.handle(req).pipe(
            tap(evt => {
                return evt;
            }),
            catchError((err: any) => {
                if(err instanceof HttpErrorResponse && err.status === 500) {
                    !this.ignoreHTTPErrors && this.dialog.open(ErrorComponent, {data: err.error});
                }
                // Auto-logout and notify user when registry endpoints fail with 401
                if (err instanceof HttpErrorResponse && err.status === 401) {
                    const url = req.url || '';
                    const isTargetEndpoint = (
                        url.includes('/SynBioHub/logout') ||
                        url.includes('/SynBioHub/listRegistryParts') ||
                        url.includes('/SynBioHub/listMyCollections')
                    );

                    if (isTargetEndpoint) {
                        const serverParam = req.params?.get('server') || '';
                        // Clear local token/session for this server
                        this.loginService.forceLogout(serverParam);

                        const serverLabel = serverParam || 'the registry';
                        const message = `Disconnected from ${serverLabel}. Please sign in again.`;
                        !this.ignoreHTTPErrors && this.dialog.open(ErrorComponent, { data: message });
                    }
                }
                return throwError(err);
            }));
    
      }
      
}