import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GlobalConstant } from '../../constants/global.constants';
import { IApiResponseWithData } from '../../model/Response/ApiResponse';
import { ServerQueryRequest, ServerQueryResponse } from '../../model/Common/Pagination/ServerQueryRequest';

import {
  IRolePermissionLanding,
  ICreateRolePermission,
  IDeleteRolePermission,
  IRolePermissionMatrix,
  IUpdateRolePermission,
  IViewRolePermission,
} from  '../../model/Role/RolePermission';

@Injectable({
  providedIn: 'root',
})
export class RolePermissionService {
  constructor(private readonly http: HttpClient) {}

  getAllData(request: ServerQueryRequest,): Observable<ServerQueryResponse<IRolePermissionLanding>> {
    return this.http.get<ServerQueryResponse<IRolePermissionLanding>>
    (
      `${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.getRolePermissions}` +
        `?GlobalSearch=${encodeURIComponent(request.globalSearch ?? '')}` +
        `&PageIndex=${request.page}` +
        `&PageSize=${request.pageSize}`,
    );
  }

  getPermissionMatrix(): Observable<IRolePermissionMatrix[]> {
    return this.http.get<IRolePermissionMatrix[]>(
      `${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.rolePermissionMatrix}`,
    );
  }

  viewData(roleId: number): Observable<IViewRolePermission> {
    return this.http.get<IViewRolePermission>(
      `${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.viewRolePermission}/${roleId}`,
    );
  }

  addData(
    data: ICreateRolePermission,): Observable<IApiResponseWithData<number>> {
    return this.http.post<IApiResponseWithData<number>>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.addRolePermission}`,
      data,
    );
  }

  updateData(
    data: IUpdateRolePermission,): Observable<IApiResponseWithData<boolean>> {
    return this.http.put<IApiResponseWithData<boolean>>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.updateRolePermission}`,
      data,
    );
  }

  deleteData(
    data: IDeleteRolePermission,): Observable<IApiResponseWithData<boolean>> {
    return this.http.put<IApiResponseWithData<boolean>>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.deleteRolePermission}`,
      data,
    );
  }



}