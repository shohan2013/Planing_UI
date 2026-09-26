import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { GlobalConstant } from '../../constants/global.constants';


import {
  IRoleAssignment,
  ITerminateRole,
} from '../../model/Role/Role';
import { IApiResponse } from '../../model/Response/ApiResponse';

@Injectable({
  providedIn: 'root',
})
export class RoleService {
  constructor(private readonly http: HttpClient) {}



  assignRole(obj: IRoleAssignment): Observable<IApiResponse> {
    return this.http.post<IApiResponse>(
      `${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.assignRole}`,
      obj,
    );
  }

  terminateView(obj: ITerminateRole): Observable<IApiResponse> {
    return this.http.put<IApiResponse>(
      `${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.terminateRoleView}`,
      obj,
    );
  }

  terminate(obj: ITerminateRole): Observable<IApiResponse> {
    return this.http.put<IApiResponse>(
      `${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.terminateRole}`,
      obj,
    );
  }
}