import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subscription, finalize, map } from 'rxjs';

import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import {
  IPvpCustomerScope,
  IPvpDeliveryOrderScope,
  IPvpFilter,
  IPvpItemRow,
  IPvpItemScope,
  IPvpOption,
  IPvpTotals,
} from 'src/app/core/model/PlanningVsProduction/planning-vs-production.model';
import { EMPTY_PVP_TOTALS } from 'src/app/core/model/PlanningVsProduction/planning-vs-production.util';
import { ServerQueryRequest } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { PlanningVsProductionService } from 'src/app/core/services/PlanningVsProduction/planning-vs-production.service';

import { PvpFilterBar } from './pvp-filter-bar/pvp-filter-bar';
import { PvpKpiCards } from './pvp-kpi-cards/pvp-kpi-cards';
import { PvpOverviewTable } from './pvp-overview-table/pvp-overview-table';

const DEFAULT_PAGE_SIZE = 10;

/** Paging is by customer: page / pageSize count customers. */
function defaultPageQuery(pageSize = DEFAULT_PAGE_SIZE): ServerQueryRequest {
  return { page: 1, pageSize, globalSearch: '', sortBy: null, sortOrder: null };
}

function defaultFilter(): IPvpFilter {
  const year = new Date().getFullYear();
  return {
    UnitId: null,
    BusinessId: null,
    CustomerId: null,
    DeliveryOrderId: null,
    ItemId: null,
    FromDate: `${year}-01-01`,
    ToDate: `${year}-12-31`,
    Status: null,
  };
}

@Component({
  selector: 'app-planning-vs-production-overview',
  standalone: true,
  imports: [DatePipe, PvpFilterBar, PvpKpiCards, PvpOverviewTable],
  templateUrl: './planning-vs-production-overview.html',
  styleUrl: './planning-vs-production-overview.scss',
})
export class PlanningVsProductionOverview implements OnInit {
  private readonly service = inject(PlanningVsProductionService);
  private readonly commonService = inject(CommonService);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  readonly filter = signal<IPvpFilter>(defaultFilter());
  readonly units = signal<IUnit[]>([]);
  readonly businesses = signal<IBusiness[]>([]);
  readonly customers = signal<IPvpOption[]>([]);
  readonly deliveryOrders = signal<IPvpOption[]>([]);
  readonly items = signal<IPvpOption[]>([]);
  readonly businessesLoading = signal(false);
  readonly customersLoading = signal(false);
  readonly deliveryOrdersLoading = signal(false);
  readonly itemsLoading = signal(false);

  /** Item rows of the customers on the current page. */
  readonly rows = signal<IPvpItemRow[]>([]);
  readonly loading = signal(false);
  readonly lastUpdated = signal<string | null>(null);

  /** Server-side paging / search / sort, sent with every GetOverview call. */
  readonly pageQuery = signal<ServerQueryRequest>(defaultPageQuery());
  /** Customers matching the filter + search (the paging unit). */
  readonly totalCustomers = signal(0);
  /** KPI totals for the whole filter (GetOverviewTotals); paging / search / sort don't touch them. */
  readonly totals = signal<IPvpTotals>(EMPTY_PVP_TOTALS);
  readonly totalsLoading = signal(false);
  // Falls back to this page's rows if the API doesn't send Totals yet.

  private loadSub: Subscription | null = null;
  private totalsSub: Subscription | null = null;
  private businessesSub: Subscription | null = null;
  private customersSub: Subscription | null = null;
  private deliveryOrdersSub: Subscription | null = null;
  private itemsSub: Subscription | null = null;

  ngOnInit(): void {
    this.commonService
      .GetUnitList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.units.set(list ?? []));
    this.refresh();
  }

  load(): void {
    // A newer request (Apply / Refresh) replaces one still in flight.
    this.loadSub?.unsubscribe();
    this.loading.set(true);
    this.loadSub = this.service
      .GetOverview(this.filter(), this.pageQuery())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.rows.set(res?.Data ?? []);
          this.totalCustomers.set(res?.Total ?? 0);
          this.lastUpdated.set(res?.LastUpdated ?? new Date().toISOString());
        },
        error: () => {
          this.rows.set([]);
          this.totalCustomers.set(0);
          this.toastr.error('Failed to load planning vs production overview.');
        },
      });
  }

  /**
   * KPI totals for the current filter. Called only when the filter changes (load, Apply,
   * Reset, Refresh), never for page / page size / search / sort.
   */
  loadTotals(): void {
    this.totalsSub?.unsubscribe();
    this.totalsLoading.set(true);
    this.totalsSub = this.service
      .GetOverviewTotals(this.filter())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.totalsLoading.set(false)),
      )
      .subscribe({
        next: (totals) => this.totals.set(totals ?? EMPTY_PVP_TOTALS),
        error: () => {
          this.totals.set(EMPTY_PVP_TOTALS);
          this.toastr.error('Failed to load the overview totals.');
        },
      });
  }

  /** Header "Refresh": reload both the table page and the KPI totals. */
  refresh(): void {
    this.load();
    this.loadTotals();
  }

  /**
   * Page / page size / search / sort changed in the table. Anything but a page change
   * goes back to page 1, since the result set changed.
   */
  onPageQueryChange(change: Partial<ServerQueryRequest>): void {
    const pageOnly = Object.keys(change).every((k) => k === 'page');
    this.pageQuery.update((q) => ({ ...q, ...change, ...(pageOnly ? {} : { page: change.page ?? 1 }) }));
    this.load();
  }

  /**
   * Every row for the current filter + search + sort (all pages), for the Excel export.
   * Asks for one page as large as the customer count.
   */
  readonly fetchAllRows = (): Observable<IPvpItemRow[]> =>
    this.service
      .GetOverview(this.filter(), {
        ...this.pageQuery(),
        page: 1,
        pageSize: Math.max(this.totalCustomers(), 1),
      })
      .pipe(map((res) => res?.Data ?? []));

  /**
   * Businesses come from the API for the selected unit only; without a unit nothing
   * is fetched. A newer unit's request replaces one still in flight.
   */
  loadBusinesses(unitId: number | null): void {
    this.businessesSub?.unsubscribe();
    this.businesses.set([]);
    if (!unitId) {
      this.businessesLoading.set(false);
      return;
    }
    this.businessesLoading.set(true);
    this.businessesSub = this.commonService
      .GetBusinessList(unitId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.businessesLoading.set(false)),
      )
      .subscribe({
        next: (list) => this.businesses.set(list ?? []),
        error: () => this.toastr.error('Failed to load businesses.'),
      });
  }

  /**
   * Customers are searched only by typed prefix within the selected unit; without
   * a prefix nothing is fetched. A newer search replaces one still in flight.
   */
  loadCustomers(scope: IPvpCustomerScope): void {
    this.customersSub?.unsubscribe();

    if (!scope.UnitId || !scope.Prefix?.trim()) {
      this.customers.set([]);
      this.customersLoading.set(false);
      return;
    }
    this.customersLoading.set(true);
    this.customersSub = this.service
      .GetCustomers(scope)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.customersLoading.set(false)),
      )
      .subscribe({
        next: (list) => this.customers.set(list ?? []),
        error: () => {
          this.customers.set([]);
          this.toastr.error('Failed to load customers.');
        },
      });
  }

  /** A unit change reloads businesses and drops customer results from the old unit. */
  onUnitChange(unitId: number | null): void {
    this.loadBusinesses(unitId);
    this.loadCustomers({ UnitId: unitId, Prefix: '' });
  }

  /**
   * Delivery orders are searched only by typed prefix once both unit and business
   * are selected; customer is optional (0 = all customers). Without a prefix
   * nothing is fetched.
   */
  loadDeliveryOrders(scope: IPvpDeliveryOrderScope): void {
    this.deliveryOrdersSub?.unsubscribe();

    this.deliveryOrdersLoading.set(true);
    this.deliveryOrdersSub = this.service
      .GetDeliveryOrders(scope)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deliveryOrdersLoading.set(false)),
      )
      .subscribe({
        next: (list) => {
          this.deliveryOrders.set(list ?? []);
        },
        error: (err) => {
          this.deliveryOrders.set([]);
          this.toastr.error('Failed to load delivery orders.');
        },
      });
  }

  /**
   * Items are searched by typed prefix within the selected unit
   * (Common/ItemList?unitId=&searchText=); without a unit or a prefix nothing is
   * fetched. A newer search replaces one still in flight.
   */
  loadItems(scope: IPvpItemScope): void {
    this.itemsSub?.unsubscribe();
    const searchText = scope.Prefix?.trim();
    if (!scope.UnitId || !searchText) {
      this.items.set([]);
      this.itemsLoading.set(false);
      return;
    }
    this.itemsLoading.set(true);
    this.itemsSub = this.commonService
      .GetItemList(scope.UnitId, searchText)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.itemsLoading.set(false)),
      )
      .subscribe({
        // IItem also carries UnitId / TypeId / LevelOneId; the search box only needs Id + Name.
        next: (list) => this.items.set((list ?? []).map(({ Id, Name }) => ({ Id, Name }))),
        error: () => {
          this.items.set([]);
          this.toastr.error('Failed to load items.');
        },
      });
  }

  onApply(filter: IPvpFilter): void {
    this.filter.set(filter);
    this.pageQuery.update((q) => ({ ...q, page: 1 }));
    this.refresh();
  }

  onReset(): void {
    this.filter.set(defaultFilter());
    this.pageQuery.set(defaultPageQuery(this.pageQuery().pageSize));
    this.loadBusinesses(null);
    this.loadCustomers({ UnitId: null, Prefix: '' });
    this.loadDeliveryOrders(this.filter());
    this.loadItems(this.filter());
    this.refresh();
  }
}
