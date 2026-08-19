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
import { IDropdownBind } from '../../model/Common/dropdown-bind';

import { IBusiness } from '../../model/Common/BusinessType/BusinessType';
import { IProductType } from '../../model/Common/ProductType/ProductType';
import { IItem } from '../../model/Common/Items/Item';
import { IRequisitionItemName } from '../../model/Common/RequisitionItemName/RequisitionItemName';
import { IUOM } from '../../model/Common/UOM/UOM';

import { IApproveMatrixGroup } from '../../model/Common/ApproveMatrixGroup/ApproveMatrixGroup';
import { IEnroll } from '../../model/Common/Enroll/Enroll';

import { IApproveMatrixGroupList } from '../../model/Common/ApproveMatrixGroupList/ApproveMatrixGroupList';
import { environment } from 'src/environments/environment';
import { IBusinessFlowForPlanning } from '../../model/Common/BusinessFlow/production-steps-model';
import { ServerQueryResponse } from '../../model/Common/Pagination/ServerQueryRequest';
import { IMachine } from '../../model/Common/Machine/machine';
import { IRecipe } from '../../model/Common/Recipe/Recipe';

@Injectable({
  providedIn: 'root',
})
export class CommonService {
  constructor(private http: HttpClient) {}

  GetEmpData(enroll: string): Observable<IEmpViewInfo[]> {
    return this.http.get<IEmpViewInfo[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.Common}?Prefix=${enroll}`,
    );
  }

  GetModuleList(): Observable<Module[]> {
    return this.http.get<Module[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.modules}`,
    );
  }

  GetMenuList(): Observable<MenuModel[]> {
    return this.http.get<MenuModel[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.menus}`,
    );
  }

  GetSubMenuList(): Observable<SubMenuModel[]> {
    return this.http.get<SubMenuModel[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.SubMenuList}`,
    );
  }

  GetSubMenuListByMenuId(id: number): Observable<SubMenuModel[]> {
    return this.http.get<SubMenuModel[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.SubMenuListByMenuId}?menuId=${id}`,
    );
  }

  GetApprovalGroupList(): Observable<IApproveMatrixGroup[]> {
    return this.http.get<IApproveMatrixGroup[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.approvalgroups}`,
    );
  }

  GetApproveMatrixGroupTypeList(): Observable<IApproveMatrixGroupList[]> {
    return this.http.get<IApproveMatrixGroupList[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.ApproveMatrixGroupTypeList}`,
    );
  }

  GetUnitList(): Observable<IUnit[]> {
    return this.http.get<IUnit[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.units}`,
    );
  }

  // GetBusinessList(): Observable<IBusiness[]> {
  //   return this.http.get<IBusiness[]>(
  //     `${environment.API_URL}${GlobalConstant.API_END_POINTS.Businesses}`,
  //   );
  // }

  GetBusinessList(unitId: Number): Observable<IBusiness[]> {
    return this.http.get<IBusiness[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.Businesses}?unitId=${unitId}`,
    );
  }

  GetProductTypeList(): Observable<IProductType[]> {
    return this.http.get<IProductType[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.ProductType}`,
    );
  }

  GetItemList(unitId: number, searchText: string): Observable<IItem[]> {
    return this.http.get<IItem[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.Item}?unitId=${unitId}&searchText=${encodeURIComponent(searchText)}`,
    );
  }
  GetRequisitionItemNames(
    model: IRequisitionItemName[],
  ): Observable<IRequisitionItemName[]> {
    return this.http.post<IRequisitionItemName[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.RequisitionItemNames}`,
      model,
    );
  }

  GetStockQty(
    fromDate: string,
    toDate: string,
    unitId: number,
    businessId: number,
    whId: number | null,
    productId: number,
  ): Observable<number> {
    const params = {
      fromDate,
      toDate,
      unitId,
      businessId,
      whId: whId ?? 0,
      productId,
    };

    return this.http.get<number>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.StockQuantity}`,
      { params },
    );
  }

  GetSalesQty(
    fromDate: string,
    toDate: string,
    unitId: number,
    productId: number,
    whId: number | null,
    customerId: number | null,
  ): Observable<number> {
    return this.http.get<number>(
      environment.API_URL + GlobalConstant.API_END_POINTS.SalesQuantity,
      {
        params: {
          fromDate,
          toDate,
          unitId: unitId.toString(),
          productId: productId.toString(),
          whId: whId?.toString() ?? '', // if needed in future, pass null now
          customerId: customerId?.toString() ?? '', //Business ID?
        },
      },
    );
  }

  GetUOMList(unitId: Number): Observable<IUOM[]> {
    return this.http.get<IUOM[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.UOM}?unitId=${unitId}`,
    );
  }

  GetDocumentStatusList(): Observable<IDropdownBind[]> {
    return this.http.get<IDropdownBind[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.DocumentStatus}`,
    );
  }

  GetPriorityList(): Observable<IPriority[]> {
    return this.http.get<IPriority[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.priority}`,
    );
  }

  GetEnrollList(): Observable<IEnroll[]> {
    return this.http.get<IEnroll[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.EnrollList}`,
    );
  }

  GetBusinessConfigure(
    unitId: Number,
    BusinessesId: Number,
  ): Observable<IBusinessFlowForPlanning[]> {
    return this.http.get<IBusinessFlowForPlanning[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.ProductionStepsForPlanning}?UnitId=${unitId}&BusinessId=${BusinessesId}`,
    );
  }

  GetMachine(unitId: number, BusinessesId: number): Observable<IMachine[]> {
    return this.http.get<IMachine[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.Machine}?UnitId=${unitId}&BusinessId=${BusinessesId}`,
    );
  }

  GetRecipe(unitId: number, BusinessesId: number): Observable<IRecipe[]> {
    return this.http.get<IRecipe[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.Recipe}?UnitId=${unitId}&BusinessId=${BusinessesId}`,
    );
  }
}
