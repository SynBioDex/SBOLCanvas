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
                if (err instanceof HttpErrorResponse) {
                    const url = req.url || '';

                        const body = err.error;
                        const permissionMarker = 'org.synbiohub.frontend.PermissionException';
                        const isPermissionException = typeof body === 'string' && body.indexOf(permissionMarker) >= 0;

                        if (isPermissionException) {
                            const serverParam = req.params?.get('server') || '';
                            console.log('whatup1');
                            this.loginService.forceLogout(serverParam);
                            console.log('whatup2');

                            const serverLabel = serverParam || 'the registry';
                            const message = `Disconnected from ${serverLabel}. Please sign in again.`;
                            !this.ignoreHTTPErrors && this.dialog.open(ErrorComponent, { data: message });
                            console.log('whatup3');
                        }
                }
                return throwError(err);
            }));
    
      }
      
}