import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';


export const authintercepthor: HttpInterceptorFn = (req, next) => {
  // console.log('[Safwan authintercepthor active]', req.method, req.url);
const router = inject(Router);

  // const clonedReq = req.clone({
  //   withCredentials: true // ✅ This tells browser to send cookies
  // });


const enroll = localStorage.getItem('Enroll');

const clonedReq = req.clone({
  withCredentials: true, // ✅ This tells browser to send cookies
  setHeaders: enroll
    ? { 'X-Enroll': enroll }
    : {}
});


  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        router.navigate(['/login']);
      }
      
      return throwError(() => error);
    })
  );
};



