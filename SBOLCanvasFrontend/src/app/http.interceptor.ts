import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent, HttpResponse, HttpErrorResponse }   from '@angular/common/http';
import { Injectable } from "@angular/core"
import { Observable, of, throwError } from "rxjs";
import { tap, catchError } from "rxjs/operators";

@Injectable()
export class AppHttpInterceptor implements HttpInterceptor {
    constructor() {}
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
                    console.log(err);
                }
                return throwError(err);
            }));
    
      }
      
}