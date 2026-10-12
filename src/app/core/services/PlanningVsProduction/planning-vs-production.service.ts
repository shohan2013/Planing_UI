import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalConstant } from '../../constants/global.constants';
import {
  IPvpCustomerScope,
  IPvpDeliveryOrderScope,
  IPvpFilter,
  IPvpOption,
  IPvpOverviewResponse,
} from '../../model/PlanningVsProduction/planning-vs-production.model';

/** Planning vs Production overview data. */
@Injectable({
  providedIn: 'root',
})
export class PlanningVsProductionService {
  constructor(private readonly http: HttpClient) {}

  /** GET PlanningVsProduction/GetOverview?UnitId=&BusinessId=&CustomerId=&DeliveryOrderId=&ItemId=&FromDate=&ToDate=&Status= */
  GetOverview(filter: IPvpFilter): Observable<IPvpOverviewResponse> {
    const values: Record<string, string | number | null | undefined> = {
      UnitId: filter.UnitId,
      BusinessId: filter.BusinessId,
      CustomerId: filter.CustomerId,
      DeliveryOrderId: filter.DeliveryOrderId,
      ItemId: filter.ItemId,
      FromDate: filter.FromDate,
      ToDate: filter.ToDate,
      Status: filter.Status,
    };
    // Empty values are left out so the API treats them as "all".
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value !== null && value !== undefined && value !== '')
        params = params.set(key, value);
    }
    return this.http.get<IPvpOverviewResponse>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.PlanningVsProductionOverview}`,
      { params },
    );
  }

  /**
   * GET Common/GetCustomerUnitWise?unitId=&prefix=
   * Prefix search only: without a unit or a typed prefix no request is sent.
   */
  GetCustomers(scope: IPvpCustomerScope): Observable<IPvpOption[]> {
    const prefix = scope.Prefix?.trim();
    if (!scope.UnitId || !prefix) return of([]);
    const params = new HttpParams()
      .set('unitId', scope.UnitId)
      .set('prefix', prefix);
    return this.http
      .get<ILookupDto[]>(
        `${environment.API_URL}${GlobalConstant.API_END_POINTS.Customers}`,
        {
          params,
        },
      )
      .pipe(map(toOptions));
  }

  /**
   * GET PlanningVsProduction/GetDeliveryOrders?unitId=&businessId=&customerId=&prefix=
   * Prefix search only: without a unit, a business or a typed prefix no request is sent.
   * Customer is optional (0 = all customers).
   */
  GetDeliveryOrders(scope: IPvpDeliveryOrderScope): Observable<IPvpOption[]> {
    const prefix = scope.Prefix?.trim();
    if (!scope.UnitId || !scope.BusinessId || !prefix) return of([]);
    const params = new HttpParams()
      .set('unitId', scope.UnitId)
      .set('businessId', scope.BusinessId)
      .set('customerId', scope.CustomerId ?? 0)
      .set('prefix', prefix);
    return this.http
      .get<
        ILookupDto[]
      >(`${environment.API_URL}${GlobalConstant.API_END_POINTS.PlanningVsProductionDeliveryOrders}`, { params })
      .pipe(map(toOptions));
  }
}

/** Lookup row as the customer / delivery order APIs return it (delivery orders use `ID`). */
interface ILookupDto {
  ID?: number;
  Id?: number;
  Name: string;
}

/** API lookup rows -> IPvpOption { Id, Name } used by the search boxes. */
function toOptions(rows: ILookupDto[] | null): IPvpOption[] {
  return (rows ?? []).map((r) => ({ Id: r.ID ?? r.Id, Name: r.Name }));
}
