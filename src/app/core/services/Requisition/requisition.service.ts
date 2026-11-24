import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { GlobalConstant } from 'src/app/core/constants/global.constants';
import { IRequisition } from 'src/app/core/model/Requisition/Requisition';

import { ServerQueryRequest, ServerQueryResponse } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';

import { IViewRequisitionHeader, IViewRequisitionLine } from 'src/app/core/model/Requisition/ViewRequisition';
import { IBulkRequisitionItem, IBulkRequisitionItemsRequest } from '../../model/Requisition/BulkRequisitionItems';
import { IDropdownBind } from '../../model/Common/dropdown-bind';
import {
  IAddRequisitionLineRequest,
  IAddRequisitionLinesRequest,
  IChangeRequisitionLineRequest,
  IDeleteRequisitionLineRequest,
  IRequisitionLineHistory,
  IUpdateRequisitionHeaderRequest,
  IUpdateRequisitionLineRequest,
} from 'src/app/core/model/Requisition/RequisitionEdit';
import { IApiResponse } from 'src/app/core/model/Response/ApiResponse';
import { IItem } from '../../model/Common/Items/Item';
// import { IACRLBulkFilters } from '../../model/Requisition/ACRLBulkFilters';

@Injectable({
  providedIn: 'root'
})
export class RequisitionService {

  constructor(private http: HttpClient) {}


    GetItemList(unitId: number, searchText: string, businessId: number, fromDate: string, toDate: string, productTypeId: number, reqId: number | null = null): Observable<IItem[]> {
    return this.http.get<IItem[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.Item}`,
      {
        params: {
          unitId,
          searchText,
          businessId,
          fromDate,
          toDate,
          productTypeId,
          ...(reqId == null ? {} : { reqId }),
        },
      },
    );
  }






GetRequisition(request: ServerQueryRequest, unitId: number = 0, businessId: number = 0): Observable<ServerQueryResponse<IViewRequisitionHeader>> {
return this.http.get<ServerQueryResponse<IViewRequisitionHeader>>(
`${environment.API_URL}${GlobalConstant.API_END_POINTS.getRequisition}?GlobalSearch=${request.globalSearch}&UnitId=${unitId}&BusinessId=${businessId}&PageIndex=${request.page}&PageSize=${request.pageSize}`
);
}

GetLinesByReqId(reqId: number): Observable<IViewRequisitionLine[]> {
return this.http.get<IViewRequisitionLine[]>(
`${environment.API_URL}${GlobalConstant.API_END_POINTS.getRequisitionLines}?ReqID=${reqId}`
);
}

  addData(model: IRequisition): Observable<any> {
    return this.http.post(
      environment.API_URL + GlobalConstant.API_END_POINTS.addRequisition,
      model
    );
  }

  // updateData(model: IRequisition): Observable<any> {
  //   console.log("REQ CREATE",model);
  //   return this.http.put(environment.API_URL + GlobalConstant.API_END_POINTS.updateRequisition,model);
  
  // }



  deleteData(reqId: number): Observable<any> {
    const enroll = Number(localStorage.getItem('Enroll'));

    const requestBody = {
      reqId,
      enroll,
    };

    //return this.http.put(`${environment.API_URL}${GlobalConstant.API_END_POINTS.deleteRequisition}`, requestBody);
  
      return this.http.put(
        environment.API_URL+GlobalConstant.API_END_POINTS.deleteRequisition,
         requestBody
        );

  }



    updateHeaderRemarks(model: IUpdateRequisitionHeaderRequest): Observable<IApiResponse> {
    return this.http.put<IApiResponse>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.updateRequisition}`, model);
  }

  addLines(model: IAddRequisitionLinesRequest): Observable<IApiResponse> {
    return this.http.post<IApiResponse>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.addRequisitionLines}`, model);
  }

  updateLine(model: IUpdateRequisitionLineRequest): Observable<IApiResponse> {
    return this.http.put<IApiResponse>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.updateRequisitionLine}`, model);
  }

  deleteLine(model: IDeleteRequisitionLineRequest): Observable<IApiResponse> {
    return this.http.put<IApiResponse>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.deleteRequisitionLine}`, model);
  }

  addLineRequest(model: IAddRequisitionLineRequest): Observable<IApiResponse> {
    return this.http.post<IApiResponse>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.addRequisitionLineRequest}`, model);
  }

  changeLineRequest(model: IChangeRequisitionLineRequest): Observable<IApiResponse> {
    return this.http.post<IApiResponse>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.changeRequisitionLineRequest}`, model);
  }

  withdrawLineRequest(requestBatchId: string, enroll: number): Observable<IApiResponse> {
    return this.http.put<IApiResponse>( `${environment.API_URL}${GlobalConstant.API_END_POINTS.withdrawRequisitionLineRequest}`, { RequestBatchId: requestBatchId, Enroll: enroll }, );
  }

  GetLineHistory(reqLineId: number): Observable<IRequisitionLineHistory[]> {
    return this.http.get<IRequisitionLineHistory[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.getRequisitionLineHistory}`,
      { params: { ReqLineID: reqLineId } },
    );
  }










  GetRequisitionCount(fromDate: string, toDate: string, unitId: number, businessId: number, itemId: number, productTypeId: number, excludeReqId: number = 0): Observable<number> {
    return this.http.get<number>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.requisitionItemCount}`,
      {
        params: {
          FromDate: fromDate,
          ToDate: toDate,
          UnitId: unitId,
          BusinessId: businessId,
          ItemId: itemId,
          ProductTypeId: productTypeId,
          ExcludeReqId: excludeReqId,
        },
      },
    );
  }







// GetACRLBulkFilters(unitId: number, businessId: number): Observable<IACRLBulkFilters> {
//   return this.http.get<IACRLBulkFilters>(
//     `${environment.API_URL}${GlobalConstant.API_END_POINTS.ACRLBulkFilters}`,
//     { params: { UnitId: unitId, BusinessId: businessId } },
//   );
// }

GetACRLtilesSize(unitId: number, businessId: number): Observable<IDropdownBind[]> {
  return this.http.get<IDropdownBind[]>(
    `${environment.API_URL}${GlobalConstant.API_END_POINTS.ACRLtilesSize}`,
    { params: { unitId, businessId } },
  );
}

GetACRLtilesSubCategory(unitId: number, businessId: number, sizeId: number): Observable<IDropdownBind[]> {
  return this.http.get<IDropdownBind[]>(
    `${environment.API_URL}${GlobalConstant.API_END_POINTS.ACRLtilesSubCategory}`,
    { params: { unitId, businessId, sizeId } },
  );
}

GetItemDimentionGrade(unitId: number, businessId: number): Observable<IDropdownBind[]> {
  return this.http.get<IDropdownBind[]>(
    `${environment.API_URL}${GlobalConstant.API_END_POINTS.ItemDimentionGrade}`,
    { params: { unitId, businessId } },
  );
}


GetBulkItems(request: IBulkRequisitionItemsRequest, pagination: ServerQueryRequest): Observable<ServerQueryResponse<IBulkRequisitionItem>> {
  return this.http.get<ServerQueryResponse<IBulkRequisitionItem>>(
    `${environment.API_URL}${GlobalConstant.API_END_POINTS.bulkRequisitionItems}`,
    {
      params: {
        UnitId: request.UnitID,
        BusinessId: request.BusinessID,
        FromDate: String(request.FromDate),
        ToDate: String(request.ToDate),
        ProductTypeId: request.ProductTypeId,
        ExcludeReqId: request.ExcludeReqId,
        SizeId: request.SizeID ?? 0,
        SubCategoryId: request.SubCategoryID ?? 0,
        GradeId: request.GradeID ?? 0,
        GlobalSearch: pagination.globalSearch ?? '',
        PageIndex: pagination.page,
        PageSize: pagination.pageSize,
      },
    },
  );
}




}