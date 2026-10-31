import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalConstant } from '../../constants/global.constants';
import {
  IPvpCustomerScope,
  IPvpDeliveryOrderScope,
  IPvpFilter,
  IPvpItemRow,
  IPvpOption,
  IPvpOverviewResponse,
  IPvpTotals,
} from '../../model/PlanningVsProduction/planning-vs-production.model';
import { ServerQueryRequest } from '../../model/Common/Pagination/ServerQueryRequest';

type ParamValues = Record<string, string | number | null | undefined>;

/** The overview filter as query values (shared by GetOverview and GetOverviewTotals). */
function filterValues(filter: IPvpFilter): ParamValues {
  return {
    UnitId: filter.UnitId,
    BusinessId: filter.BusinessId,
    CustomerId: filter.CustomerId,
    DeliveryOrderId: filter.DeliveryOrderId,
    ItemId: filter.ItemId,
    FromDate: filter.FromDate,
    ToDate: filter.ToDate,
    // Not selected ("All Status") is sent as 0; real statuses are 1-5 (PvpStatus).
    Status: filter.Status ?? 0,
  };
}

/** Paging as the same PascalCase keys as GetMergedPlanning. Only GetOverview is paged. */
function pagingValues(query: ServerQueryRequest): ParamValues {
  return {
    PageIndex: query.page,
    PageSize: query.pageSize,
  };
}

/** Search / sort as the same PascalCase keys as GetMergedPlanning. */
function searchSortValues(query: ServerQueryRequest): ParamValues {
  return {
    GlobalSearch: query.globalSearch?.trim(),
    // 'Label' is the tree's name column; at the top level that's the delivery order no.
    SortBy: query.sortBy === 'Label' ? 'DeliveryOrderNo' : query.sortBy,
    SortOrder: query.sortBy ? query.sortOrder : null,
  };
}

/** Empty values are left out so the API treats them as "all". */
function toParams(values: ParamValues): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '')
      params = params.set(key, value);
  }
  return params;
}

/** Planning vs Production overview data. */
@Injectable({
  providedIn: 'root',
})
export class PlanningVsProductionService {
  constructor(private readonly http: HttpClient) {}

  /**
   * GET PlanningVsProduction/GetOverview?UnitId=&BusinessId=&CustomerId=&DeliveryOrderId=&ItemId=
   *   &FromDate=&ToDate=&Status=&PageIndex=&PageSize=&GlobalSearch=&SortBy=&SortOrder=
   * Paged by delivery order: `query.page` / `query.pageSize` count delivery orders (see IPvpOverviewResponse).
   * `query` is the shared ServerQueryRequest, sent as the same PascalCase keys as GetMergedPlanning.
   */
  GetOverview(
    filter: IPvpFilter,
    query: ServerQueryRequest,
  ): Observable<IPvpOverviewResponse> {
    return this.http.get<IPvpOverviewResponse>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.PlanningVsProductionOverview}`,
      { params: toParams({ ...filterValues(filter), ...pagingValues(query), ...searchSortValues(query) }) },
    );
  }

  /**
   * GET PlanningVsProduction/GetOverviewItems?DeliveryOrderId=&UnitId=&BusinessId=&CustomerId=
   *   &ItemId=&FromDate=&ToDate=&Status=&GlobalSearch=
   * Every item row of one delivery order (not paged: no PageIndex / PageSize), loaded when its
   * row is expanded. Gets the same filter and search as GetOverview so the items shown match
   * what the order row was counted from.
   */
  GetOverviewItems(
    deliveryOrderId: number,
    filter: IPvpFilter,
    globalSearch?: string,
  ): Observable<IPvpItemRow[]> {
    return this.http
      .get<IPvpItemRow[]>(
        `${environment.API_URL}${GlobalConstant.API_END_POINTS.PlanningVsProductionOverviewItems}`,
        {
          params: toParams({
            ...filterValues(filter),
            DeliveryOrderId: deliveryOrderId,
            GlobalSearch: globalSearch?.trim(),
          }),
        },
      )
      .pipe(map((rows) => rows ?? []));
  }

  /**
   * GET PlanningVsProduction/GetOverviewExport?<filter>&GlobalSearch=&SortBy=&SortOrder=
   * Every item row of every delivery order matching the filter + search, for the Excel export
   * (not paged: no PageIndex / PageSize).
   */
  GetOverviewExport(
    filter: IPvpFilter,
    query: ServerQueryRequest,
  ): Observable<IPvpItemRow[]> {
    return this.http
      .get<IPvpItemRow[]>(
        `${environment.API_URL}${GlobalConstant.API_END_POINTS.PlanningVsProductionOverviewExport}`,
        { params: toParams({ ...filterValues(filter), ...searchSortValues(query) }) },
      )
      .pipe(map((rows) => rows ?? []));
  }

  /**
   * GET PlanningVsProduction/GetOverviewTotals?UnitId=&BusinessId=&CustomerId=&DeliveryOrderId=
   *   &ItemId=&FromDate=&ToDate=&Status=
   * KPI totals across everything the filter matches. No paging / search / sort, so moving
   * through the table never changes (or re-requests) the KPI cards.
   */
  GetOverviewTotals(filter: IPvpFilter): Observable<IPvpTotals> {
    return this.http.get<IPvpTotals>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.PlanningVsProductionOverviewTotals}`,
      { params: toParams(filterValues(filter)) },
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
