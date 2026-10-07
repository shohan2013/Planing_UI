import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';

import {
  IPvpFilter,
  IPvpItemRow,
  IPvpOption,
} from 'src/app/core/model/PlanningVsProduction/planning-vs-production.model';
import { computeTotals } from 'src/app/core/model/PlanningVsProduction/planning-vs-production.util';
import { PlanningVsProductionService } from 'src/app/core/services/PlanningVsProduction/planning-vs-production.service';

import { PvpFilterBar } from './pvp-filter-bar/pvp-filter-bar';
import { PvpKpiCards } from './pvp-kpi-cards/pvp-kpi-cards';
import { PvpOverviewTable } from './pvp-overview-table/pvp-overview-table';

function defaultFilter(): IPvpFilter {
  return {
    CustomerId: null,
    DeliveryOrderId: null,
    ItemSearch: '',
    // Dummy data is dated 2024. Once the API is live, use the current year instead.
    FromDate: '2024-01-01',
    ToDate: '2024-12-31',
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
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  readonly filter = signal<IPvpFilter>(defaultFilter());
  readonly customers = signal<IPvpOption[]>([]);
  readonly deliveryOrders = signal<IPvpOption[]>([]);

  readonly rows = signal<IPvpItemRow[]>([]);
  readonly loading = signal(false);
  readonly lastUpdated = signal<string | null>(null);

  readonly totals = computed(() => computeTotals(this.rows()));

  ngOnInit(): void {
    this.service
      .GetCustomers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.customers.set(list));
    this.loadDeliveryOrders(null);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service
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

  loadDeliveryOrders(customerId: number | null): void {
    this.service
      .GetDeliveryOrders(customerId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.deliveryOrders.set(list));
  }

  onApply(filter: IPvpFilter): void {
    this.filter.set(filter);
    this.load();
  }

  onReset(): void {
    this.filter.set(defaultFilter());
    this.loadDeliveryOrders(null);
    this.load();
  }
}
