import { HttpInterceptorFn } from '@angular/common/http';

export const headersInterceptor: HttpInterceptorFn = (req, next) => {
  const modified = req.clone({
    setHeaders: { 'Content-Type': 'application/json' }
  });
  return next(modified);
};

