import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subscription, debounceTime, finalize } from 'rxjs';

import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import {
  IPvpCustomerScope,
  IPvpDeliveryOrderScope,
  IPvpFilter,
  IPvpItemRow,
  IPvpItemScope,
  IPvpOption,
  IPvpOrderRow,
  IPvpTotals,
} from 'src/app/core/model/PlanningVsProduction/planning-vs-production.model';
import { EMPTY_PVP_TOTALS } from 'src/app/core/model/PlanningVsProduction/planning-vs-production.util';
import { ServerQueryRequest } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { PlanningVsProductionService } from 'src/app/core/services/PlanningVsProduction/planning-vs-production.service';
import { PlanningVsProductionLiveService } from 'src/app/core/services/PlanningVsProduction/planning-vs-production-live.service';
import { environment } from 'src/environments/environment';

import { PvpFilterBar } from './pvp-filter-bar/pvp-filter-bar';
import { PvpKpiCards } from './pvp-kpi-cards/pvp-kpi-cards';
import { PvpOverviewTable } from './pvp-overview-table/pvp-overview-table';

const DEFAULT_PAGE_SIZE = 10;
/** Live events arriving within this window are handled as one quiet refresh. */
const LIVE_DEBOUNCE_MS = 1000;

/** Paging is by delivery order: page / pageSize count delivery orders. */
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
  imports: [PvpFilterBar, PvpKpiCards, PvpOverviewTable],
  // One SignalR connection per open page; closed when the page is destroyed.
  providers: [PlanningVsProductionLiveService],
  templateUrl: './planning-vs-production-overview.html',
  styleUrl: './planning-vs-production-overview.scss',
})
export class PlanningVsProductionOverview implements OnInit {
  private readonly service = inject(PlanningVsProductionService);
  private readonly commonService = inject(CommonService);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly live = inject(PlanningVsProductionLiveService);

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

  /** Aggregated delivery orders on the current page (their items load on expand). */
  readonly rows = signal<IPvpOrderRow[]>([]);
  readonly loading = signal(false);

  /** Server-side paging / search / sort, sent with every GetOverview call. */
  readonly pageQuery = signal<ServerQueryRequest>(defaultPageQuery());
  /** Delivery orders matching the filter + search (the paging unit). */
  readonly totalOrders = signal(0);
  /** KPI totals for the whole filter (GetOverviewTotals); paging / search / sort don't touch them. */
  readonly totals = signal<IPvpTotals>(EMPTY_PVP_TOTALS);
  readonly totalsLoading = signal(false);

  /** SignalR state for the table's Live badge. */
  readonly liveStatus = this.live.status;
  /** Bumped on every real load; the table then clears loaded items and collapses (live updates don't). */
  readonly resetKey = signal(0);
  /** The current totals came from a live update, so changed KPI cards glow. */
  readonly totalsLive = signal(false);
  private readonly table = viewChild(PvpOverviewTable);

  private loadSub: Subscription | null = null;
  private totalsSub: Subscription | null = null;
  private liveSub: Subscription | null = null;
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

    // Backend says planning / order / production data changed: quietly re-fetch what is on
    // screen. A burst of events (bulk save, production counters) becomes one refresh.
    this.live.changed$
      .pipe(debounceTime(LIVE_DEBOUNCE_MS), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.liveRefresh());
    this.live.start();
  }

  load(): void {
    // A newer request (Apply / Refresh) replaces one still in flight, including a live refresh.
    this.loadSub?.unsubscribe();
    this.liveSub?.unsubscribe();
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
          this.totalOrders.set(res?.Total ?? 0);
          this.resetKey.update((k) => k + 1);
        },
        error: () => {
          this.rows.set([]);
          this.totalOrders.set(0);
          this.resetKey.update((k) => k + 1);
          this.toastr.error('Failed to load planning vs production overview.');
        },
      });
  }

  /**
   * KPI totals for the current filter. Called only when the filter changes (load, Apply,
   * Reset, Refresh) or on a live update, never for page / page size / search / sort.
   * `silent` (live update): no skeleton, no error toast, and changed cards glow.
   */
  loadTotals(silent = false): void {
    // A live refresh doesn't interrupt a normal load that is still running.
    if (silent && this.totalsLoading()) return;
    this.totalsSub?.unsubscribe();
    if (!silent) this.totalsLoading.set(true);
    this.totalsSub = this.service
      .GetOverviewTotals(this.filter())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.totalsLoading.set(false)),
      )
      .subscribe({
        next: (totals) => {
          this.totalsLive.set(silent);
          this.totals.set(totals ?? EMPTY_PVP_TOTALS);
        },
        error: () => {
          if (silent) return; // keep the current numbers; the next live update tries again
          this.totals.set(EMPTY_PVP_TOTALS);
          this.toastr.error('Failed to load the overview totals.');
        },
      });
  }

  /**
   * Live update: re-fetch the current page (same filter, page, search, sort) and the KPI
   * totals without the loading skeleton. The table updates the rows in place, keeps expanded
   * orders open and re-fetches their items; changed values flash and count up.
   */
  private liveRefresh(): void {
    // A normal load is already bringing fresh data.
    if (this.loading()) return;
    if (!environment.production) console.info('[PvP live] re-fetching the current page and totals');

    this.liveSub?.unsubscribe();
    this.liveSub = this.service
      .GetOverview(this.filter(), this.pageQuery())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          const rows = res?.Data ?? [];
          const total = res?.Total ?? 0;
          const { page, pageSize } = this.pageQuery();
          // Orders left this page (e.g. the last ones on the last page): go to the last page.
          if (!rows.length && total > 0 && page > 1) {
            this.pageQuery.update((q) => ({ ...q, page: Math.ceil(total / pageSize) }));
            this.load();
            return;
          }
          this.table()?.applyLiveUpdate(rows);
          this.rows.set(rows);
          this.totalOrders.set(total);
        },
        // Keep what is on screen; the next live update tries again.
        error: () => undefined,
      });

    this.loadTotals(true);
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

  /** Every item row for the current filter + search + sort (all orders), for the Excel export. */
  readonly fetchAllRows = (): Observable<IPvpItemRow[]> =>
    this.service.GetOverviewExport(this.filter(), this.pageQuery());

  /** Item rows of one delivery order, loaded by the table when the order is expanded. */
  readonly fetchOrderItems = (deliveryOrderId: number): Observable<IPvpItemRow[]> =>
    this.service.GetOverviewItems(deliveryOrderId, this.filter(), this.pageQuery().globalSearch);

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
