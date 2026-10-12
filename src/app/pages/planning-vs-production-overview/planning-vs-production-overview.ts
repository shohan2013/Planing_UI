import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { Subscription, finalize } from 'rxjs';

import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import {
  IPvpCustomerScope,
  IPvpDeliveryOrderScope,
  IPvpFilter,
  IPvpItemRow,
  IPvpItemScope,
  IPvpOption,
} from 'src/app/core/model/PlanningVsProduction/planning-vs-production.model';
import { computeTotals } from 'src/app/core/model/PlanningVsProduction/planning-vs-production.util';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { PlanningVsProductionService } from 'src/app/core/services/PlanningVsProduction/planning-vs-production.service';

import { PvpFilterBar } from './pvp-filter-bar/pvp-filter-bar';
import { PvpKpiCards } from './pvp-kpi-cards/pvp-kpi-cards';
import { PvpOverviewTable } from './pvp-overview-table/pvp-overview-table';

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

  readonly rows = signal<IPvpItemRow[]>([]);
  readonly loading = signal(false);
  readonly lastUpdated = signal<string | null>(null);

  readonly totals = computed(() => computeTotals(this.rows()));

  private loadSub: Subscription | null = null;
  private businessesSub: Subscription | null = null;
  private customersSub: Subscription | null = null;
  private deliveryOrdersSub: Subscription | null = null;
  private itemsSub: Subscription | null = null;

  ngOnInit(): void {
    this.commonService
      .GetUnitList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.units.set(list ?? []));
    this.load();
  }

  load(): void {
    // A newer request (Apply / Refresh) replaces one still in flight.
    this.loadSub?.unsubscribe();
    this.loading.set(true);
    this.loadSub = this.service
      .GetOverview(this.filter())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.rows.set(res?.Rows ?? []);
          this.lastUpdated.set(res?.LastUpdated ?? new Date().toISOString());
        },
        error: () => {
          this.rows.set([]);
          this.toastr.error('Failed to load planning vs production overview.');
        },
      });
  }

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
    this.load();
  }

  onReset(): void {
    this.filter.set(defaultFilter());
    this.loadBusinesses(null);
    this.loadCustomers({ UnitId: null, Prefix: '' });
    this.loadDeliveryOrders(this.filter());
    this.loadItems(this.filter());
    this.load();
  }
}
