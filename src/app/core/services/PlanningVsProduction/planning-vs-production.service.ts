import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, delay, of } from 'rxjs';

import {
  IPvpFilter,
  IPvpItemRow,
  IPvpOption,
  IPvpOverviewResponse,
} from '../../model/PlanningVsProduction/planning-vs-production.model';
import { deriveStatus } from '../../model/PlanningVsProduction/planning-vs-production.util';
import { PVP_MOCK_ROWS } from './planning-vs-production.mock';

/**
 * Planning vs Production overview data.
 *
 * Currently backed by dummy data. To switch to the API, replace the body of each
 * method with the commented `http` call (endpoint already registered in
 * GlobalConstant.API_END_POINTS.PlanningVsProductionOverview) and delete the mock file.
 */
@Injectable({
  providedIn: 'root',
})
export class PlanningVsProductionService {
  constructor(private readonly http: HttpClient) {}

  GetOverview(filter: IPvpFilter): Observable<IPvpOverviewResponse> {
    // const params = new HttpParams()
    //   .set('CustomerId', filter.CustomerId ?? 0)
    //   .set('DeliveryOrderId', filter.DeliveryOrderId ?? 0)
    //   .set('ItemSearch', filter.ItemSearch ?? '')
    //   .set('FromDate', filter.FromDate)
    //   .set('ToDate', filter.ToDate)
    //   .set('Status', filter.Status ?? '');
    // return this.http.get<IPvpOverviewResponse>(
    //   `${environment.API_URL}${GlobalConstant.API_END_POINTS.PlanningVsProductionOverview}`,
    //   { params },
    // );

    const search = (filter.ItemSearch ?? '').trim().toLowerCase();
    const rows = PVP_MOCK_ROWS.filter(
      (r) =>
        (!filter.CustomerId || r.CustomerId === filter.CustomerId) &&
        (!filter.DeliveryOrderId || r.DeliveryOrderId === filter.DeliveryOrderId) &&
        (!search || r.ItemCode.toLowerCase().includes(search) || r.ItemName.toLowerCase().includes(search)) &&
        (!filter.FromDate || r.OrderDate >= filter.FromDate) &&
        (!filter.ToDate || r.OrderDate <= filter.ToDate) &&
        (!filter.Status || deriveStatus(r) === filter.Status),
    );
    return of({ Rows: rows, LastUpdated: new Date().toISOString() }).pipe(delay(400));
  }

  GetCustomers(): Observable<IPvpOption[]> {
    const map = new Map<number, string>();
    PVP_MOCK_ROWS.forEach((r) => map.set(r.CustomerId, r.CustomerName));
    return of([...map].map(([Id, Name]) => ({ Id, Name })));
  }

  GetDeliveryOrders(customerId: number | null): Observable<IPvpOption[]> {
    const map = new Map<number, IPvpOption>();
    PVP_MOCK_ROWS.filter((r: IPvpItemRow) => !customerId || r.CustomerId === customerId).forEach((r) =>
      map.set(r.DeliveryOrderId, { Id: r.DeliveryOrderId, Name: r.DeliveryOrderNo, ParentId: r.CustomerId }),
    );
    return of([...map.values()]);
  }
}
