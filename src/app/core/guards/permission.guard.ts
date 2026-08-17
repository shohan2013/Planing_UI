import { inject } from '@angular/core';
import {
  CanActivateChildFn,
  Router,
} from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AuthorizationService } from 'src/app/core/services/Authorization/authorization.service';

export const permissionGuard: CanActivateChildFn = (
  childRoute,
) => {
  const authorizationService = inject(
    AuthorizationService,
  );

  const router = inject(Router);

  const routePath =
    childRoute.routeConfig?.path ?? '';

  return authorizationService.ensureLoaded().pipe(
    map(() => {
      const canView =
        authorizationService.canViewRoute(routePath);

      if (canView) {
        return true;
      }

      return router.createUrlTree([
        '/permission-required',
      ]);
    }),

    catchError(() => {
      /*
       * Permission loading failed or Enroll is missing.
       * Do not load the protected page.
       */
      return of(
        router.createUrlTree(['/pages/login-boxed']),
      );
    }),
  );
};