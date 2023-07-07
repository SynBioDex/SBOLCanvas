import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpResponse, HttpErrorResponse }   from '@angular/common/http';
import { Injectable } from "@angular/core"
import { Observable, of, throwError } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { MatDialog } from '@angular/material';
import { ErrorComponent } from './error/error.component';
import { ActivatedRoute } from '@angular/router'


@Injectable()
export class AppHttpInterceptor implements HttpInterceptor {

    ignoreHTTPErrors: boolean

    constructor(public dialog: MatDialog, private route: ActivatedRoute) {
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
                return throwError(err);
            }));
    
      }
      
}