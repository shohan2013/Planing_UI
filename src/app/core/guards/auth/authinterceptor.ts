import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';


export const authintercepthor: HttpInterceptorFn = (req, next) => {
const router = inject(Router);

  const clonedReq = req.clone({
    withCredentials: true // ✅ This tells browser to send cookies
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



