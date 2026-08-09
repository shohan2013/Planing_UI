import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from '../../model/Common/Pagination/ServerQueryRequest';
import { Observable } from 'rxjs';
import {
  IDeliveryOrder,
  IDeliveryOrderLine,
} from '../../model/DeliveryOrder/delivery-order-model';
import { environment } from 'src/environments/environment';
import { GlobalConstant } from '../../constants/global.constants';

@Injectable({
  providedIn: 'root',
})
export class DeliveryOrderService {
  constructor(private http: HttpClient) {}

  GetDeliverOrders(
    request: ServerQueryRequest,
    unitId: Number,
    BusinessesId: Number,
  ): Observable<ServerQueryResponse<IDeliveryOrder>> {
    return this.http.get<ServerQueryResponse<IDeliveryOrder>>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.DeliveryOrders}?GlobalSearch=${request.globalSearch}&PageIndex=${request.page}&PageSize=${request.pageSize}&UnitId=${unitId}&BusinessId=${BusinessesId}`,
    );
  }

  GetDeliveryOrdersDetails(SOID: Number): Observable<IDeliveryOrderLine[]> {
    return this.http.get<IDeliveryOrderLine[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.DeliveryOrderLine}/${SOID}`,
    );
  }
}
