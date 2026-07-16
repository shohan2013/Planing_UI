import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GlobalConstant } from '../../constants/global.constants';
import { IEmpViewInfo } from '../../model/Common/EmpInfo/ViewEmpInfo';
import { MenuModel } from '../../model/Common/Menus/Menu';
import { Module } from '../../model/Common/Module/Module';
import { SubMenuModel } from '../../model/Common/SubMenu/SubMenu';
import { IPriority } from '../../model/Common/Priority/Priority';
import { IUnit } from '../../model/Common/Unit/Unit';
import { IApproveMatrixGroup } from '../../model/Common/ApproveMatrixGroup/ApproveMatrixGroup';
import { IEnroll } from '../../model/Common/Enroll/Enroll';

import { IApproveMatrixGroupList } from '../../model/Common/ApproveMatrixGroupList/ApproveMatrixGroupList';


@Injectable({
  providedIn: 'root',
})

export class CommonService {
  constructor(private http: HttpClient) {}

  GetEmpData(enroll: string) : Observable<IEmpViewInfo[]> {
      return this.http.get<IEmpViewInfo[]>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.Common}?Prefix=${enroll}`);
    }

    GetModuleList() : Observable<Module[]> {
      return this.http.get<Module[]>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.modules}`);
    }

    GetMenuList() : Observable<MenuModel[]> {
      return this.http.get<MenuModel[]>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.menus}`);
    }

    GetSubMenuList() : Observable<SubMenuModel[]> {
      return this.http.get<SubMenuModel[]>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.SubMenuList}`);
    }

    GetApprovalGroupList() : Observable<IApproveMatrixGroup[]> {
      return this.http.get<IApproveMatrixGroup[]>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.approvalgroups}`);
    }

    GetApproveMatrixGroupTypeList() : Observable<IApproveMatrixGroupList[]> {
      return this.http.get<IApproveMatrixGroupList[]>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.ApproveMatrixGroupTypeList}`);
    }

    GetUnitList() : Observable<IUnit[]> {
      return this.http.get<IUnit[]>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.units}`);
    }

    GetPriorityList() : Observable<IPriority[]> {
      return this.http.get<IPriority[]>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.priority}`);
    }

    GetEnrollList() : Observable<IEnroll[]> {
      return this.http.get<IEnroll[]>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.EnrollList}`);
    }
}

