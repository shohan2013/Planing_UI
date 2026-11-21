import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from '../../model/Common/Pagination/ServerQueryRequest';
import { map, Observable } from 'rxjs';
import {
  IDeliveryOrder,
  IDeliveryOrderLine,
  IMergeDeliveryOrderRequest,
  IMergePolicy,
  IMergePreview,
} from '../../model/SalesOrder/sales-order-model';
import { environment } from 'src/environments/environment';
import { GlobalConstant } from '../../constants/global.constants';
import { IApiResponse } from '../../model/Response/ApiResponse';

@Injectable({
  providedIn: 'root',
})
export class DeliveryOrderService {
  constructor(private http: HttpClient) {}



  GetDeliverOrders(request: ServerQueryRequest, unitId: Number, BusinessesId: Number, workTypeCode: string,) : Observable<ServerQueryResponse<IDeliveryOrder>> 
  {
    return this.http.get<ServerQueryResponse<IDeliveryOrder>>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.DeliveryOrders}?GlobalSearch=${request.globalSearch}&PageIndex=${request.page}&PageSize=${request.pageSize}&UnitId=${unitId}&BusinessId=${BusinessesId}&WorkTypeCode=${workTypeCode}`,
    );
  }



  /** GET SalesOrderLanding/GetDOHeaderData/{SOID}?WorkTypeCode= */
  GetDeliveryOrderHeader(SOID: Number, workTypeCode: string): Observable<IDeliveryOrder | null> {
    return this.http
      .get<any>(
        `${environment.API_URL}${GlobalConstant.API_END_POINTS.DeliveryOrderHeader}/${SOID}?WorkTypeCode=${workTypeCode}`,
      )
      .pipe(
        // Backend may return the header as an object, a single-item list, or wrapped in Data.
        map((res) => {
          const body = res?.Data ?? res?.data ?? res;
          const header = Array.isArray(body) ? body[0] : body;
          return (header ?? null) as IDeliveryOrder | null;
        }),
      );
  }

  GetDeliveryOrdersDetails(SOID: Number, workTypeCode: string): Observable<IDeliveryOrderLine[]> {
    return this.http.get<IDeliveryOrderLine[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.DeliveryOrderLine}/${SOID}?WorkTypeCode=${workTypeCode}`,
    );
  }

  /** GET MergeDeliveryOrder/GetMergePolicies?UnitId=&BusinessId=&WorkTypeCode= */
  GetMergePolicies(
    unitId: number,
    businessId: number,
    workTypeCode: string,
  ): Observable<IMergePolicy[]> {
    const params = new HttpParams()
      .set('UnitId', unitId)
      .set('BusinessId', businessId)
      .set('WorkTypeCode', workTypeCode);

    return this.http.get<IMergePolicy[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.MergePolicies}`,
      { params },
    );
  }

  /** POST MergeDeliveryOrder/PreviewMerge, same body as MergeDOs, nothing is saved. */
  PreviewMerge(
    request: IMergeDeliveryOrderRequest,
  ): Observable<IMergePreview> {
    return this.http.post<IMergePreview>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.MergePreview}`,
      request,
    );
  }

  MergeDO(selectedDOIds: IMergeDeliveryOrderRequest): Observable<IApiResponse> {
    return this.http.post<IApiResponse>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.MergeDOs}`,
      selectedDOIds,
    );
  }
}
