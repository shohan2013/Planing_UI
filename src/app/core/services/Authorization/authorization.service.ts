import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  finalize,
  Observable,
  of,
  shareReplay,
  tap,
  throwError,
} from 'rxjs';

import { environment } from 'src/environments/environment';
import { GlobalConstant } from 'src/app/core/constants/global.constants';
export interface UserMenuPermission {
  Id: number;
  MenuID: number;
  SubMenuID: number;
  MenuName: string;
  SubMenuName: string;
  MenuCode: string;
  SubMenuCode: string;
  RouterLink: string;
  CanInsert: boolean;
  CanUpdate: boolean;
  CanDelete: boolean;
  CanView: boolean;
  CanPrint: boolean;
}
export enum PermissionAction {
  View = 'View',
  Insert = 'Insert',
  Update = 'Update',
  Delete = 'Delete',
  Print = 'Print',
}


@Injectable({
  providedIn: 'root',
})
export class AuthorizationService {
  private readonly permissionMapState =
    signal<ReadonlyMap<string, UserMenuPermission>>(
      new Map<string, UserMenuPermission>(),
    );

  readonly permissionMap =
    this.permissionMapState.asReadonly();

  private loadedEnroll: number | null = null;
  private loadingEnroll: number | null = null;

  private loadingRequest$:
    | Observable<UserMenuPermission[]>
    | undefined;

  constructor(private readonly http: HttpClient) {}

  loadPermissions(): Observable<UserMenuPermission[]> {
    const enroll = this.getCurrentEnroll();

    if (!enroll) {
      this.clear();

      return throwError(
        () => new Error('Authenticated user Enroll was not found.'),
      );
    }

    if (this.loadedEnroll === enroll) {
      return of(
        Array.from(this.permissionMapState().values()),
      );
    }

    if (
      this.loadingRequest$ &&
      this.loadingEnroll === enroll
    ) {
      return this.loadingRequest$;
    }

    const url =
      `${environment.API_URL}` +
      `${GlobalConstant.API_END_POINTS.UserMenuPermission}` +
      `/${enroll}`;

    this.loadingEnroll = enroll;

    const request$ = this.http
      .get<UserMenuPermission[]>(url)
      .pipe(
        tap((permissions) => {
            console.log('THE Permissions loaded:', permissions);
          /*
           * Do not store the response if the authenticated
           * user changed while the request was running.
           */
          if (this.getCurrentEnroll() !== enroll) {
            return;
          }

          const permissionMap =
            new Map<string, UserMenuPermission>();

          for (const permission of permissions ?? []) {
            const routerLink = this.normalizeRouterLink(
              permission.RouterLink,
            );

            if (routerLink) {
              permissionMap.set(routerLink, permission);
            }
          }

          this.permissionMapState.set(permissionMap);
          this.loadedEnroll = enroll;
        }),

        finalize(() => {
          if (this.loadingEnroll === enroll) {
            this.loadingRequest$ = undefined;
            this.loadingEnroll = null;
          }
        }),

        shareReplay(1),
      );

    this.loadingRequest$ = request$;

    return request$;
  }

  ensureLoaded(): Observable<UserMenuPermission[]> {
    return this.loadPermissions();
  }



  canViewRoute(routePath: string): boolean {
    const normalizedRoute =
        this.normalizeRouterLink(routePath);

    const permission =
        this.permissionMapState().get(normalizedRoute);

        /*
        * No matching RouterLink means this route is not
        * permission-controlled, so allow it.
        */
        return permission?.CanView ?? true;
        }


    hasPermission(
    routePath: string,
    action: PermissionAction,
    ): boolean {
    const normalizedRoute =
        this.normalizeRouterLink(routePath);

    const permission =
        this.permissionMapState().get(normalizedRoute);

    if (!permission?.CanView) {
        return false;
    }

    switch (action) {
        case PermissionAction.View:
        return permission.CanView;

        case PermissionAction.Insert:
        return permission.CanInsert;

        case PermissionAction.Update:
        return permission.CanUpdate;

        case PermissionAction.Delete:
        return permission.CanDelete;

        case PermissionAction.Print:
        return permission.CanPrint;

        default:
        return false;
    }
    }







  clear(): void {
    this.permissionMapState.set(
      new Map<string, UserMenuPermission>(),
    );

    this.loadedEnroll = null;
    this.loadingEnroll = null;
    this.loadingRequest$ = undefined;
  }

  private getCurrentEnroll(): number | null {
    const enroll = Number(
      localStorage.getItem('Enroll'),
    );

    return Number.isInteger(enroll) && enroll > 0
      ? enroll
      : null;
  }

    private normalizeRouterLink(
    routerLink: string,
    ): string {
    return (routerLink ?? '')
        .split('?')[0]
        .split('#')[0]
        .trim()
        .replace(/^\/+|\/+$/g, '')
        .toLowerCase();
    }
}