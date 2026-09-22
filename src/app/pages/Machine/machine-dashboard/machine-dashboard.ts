import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';

import { CommonService } from 'src/app/core/services/Common/CommonService';
import { MachineDashboardService } from 'src/app/core/services/MachineDashboard/machine-dashboard.service';

import { MachineOverviewTab } from './machine-overview-tab/machine-overview-tab';
import { MachineTimelineTab } from './machine-timeline-tab/machine-timeline-tab';
import {
  IMachineDashboardSummary,
  IMachineUtilization,
} from 'src/app/core/model/MachineDashboard/machine-dashboard.model';
import {
  FLAT_KPI_TRENDS,
  IMachineDashboardKpiTrends,
  computeTrend,
} from 'src/app/core/model/MachineDashboard/machine-dashboard-trend.util';

type MachineDashboardTab = 'overview' | 'timeline';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const EMPTY_SUMMARY: IMachineDashboardSummary = {
  TotalMachines: 0,
  AvgUtilizationPercent: 0,
  TotalAllocatedHours: 0,
  TotalFreeHours: 0,
  TotalDowntimeHours: 0,
};

@Component({
  selector: 'app-machine-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MachineOverviewTab, MachineTimelineTab],
  templateUrl: './machine-dashboard.html',
  styleUrl: './machine-dashboard.scss',
})
export class MachineDashboard implements OnInit, OnDestroy {
  readonly units = signal<IUnit[]>([]);
  readonly businesses = signal<IBusiness[]>([]);
  readonly businessesLoading = signal(false);
  readonly loading = signal(false);
  readonly hasLoaded = signal(false);

  readonly activeTab = signal<MachineDashboardTab>('overview');

  selectedUnitId = 0;
  selectedBusinessId = 0;

  fromDate = toDateInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000));
  toDate = toDateInputValue(new Date());

  readonly summary = signal<IMachineDashboardSummary>({
    TotalMachines: 0,
    AvgUtilizationPercent: 0,
    TotalAllocatedHours: 0,
    TotalFreeHours: 0,
    TotalDowntimeHours: 0,
  });

  readonly machines = signal<IMachineUtilization[]>([]);

  /** Trends compare the current summary against the previously loaded one.
   * Owned here (not by the overview tab) because that component is
   * destroyed/recreated on every load (see the @else if gating in the
   * template) and on every tab switch, which would otherwise wipe out the
   * "previous" value each time and leave every trend stuck at 0%. */
  readonly trends = signal<IMachineDashboardKpiTrends>(FLAT_KPI_TRENDS);
  private previousSummary: IMachineDashboardSummary | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly commonService: CommonService,
    private readonly machineDashboardService: MachineDashboardService,
  ) {}

  ngOnInit(): void {
    this.loadUnits();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveTab(tab: MachineDashboardTab): void {
    this.activeTab.set(tab);
  }

  onUnitChange(unitId: number): void {
    this.selectedUnitId = Number(unitId);
    this.selectedBusinessId = 0;
    this.businesses.set([]);
    this.resetDashboard();

    if (this.selectedUnitId > 0) {
      this.loadBusinesses(this.selectedUnitId);
    }
  }

  onBusinessChange(businessId: number): void {
    this.selectedBusinessId = Number(businessId);
    this.loadDashboard();
  }

  onDateChange(): void {
    this.loadDashboard();
  }

  refresh(): void {
    this.loadDashboard();
  }

  private loadUnits(): void {
    this.commonService
      .GetUnitList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (units) => this.units.set(units ?? []),
        error: () => this.units.set([]),
      });
  }

  private loadBusinesses(unitId: number): void {
    this.businessesLoading.set(true);

    this.commonService
      .GetBusinessList(unitId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (businesses) => {
          this.businesses.set(businesses ?? []);
          this.businessesLoading.set(false);
        },
        error: () => {
          this.businesses.set([]);
          this.businessesLoading.set(false);
        },
      });
  }

  private resetDashboard(): void {
    this.summary.set(EMPTY_SUMMARY);
    this.machines.set([]);
    this.hasLoaded.set(false);
    this.trends.set(FLAT_KPI_TRENDS);
    this.previousSummary = null;
  }

  private applySummary(value: IMachineDashboardSummary): void {
    if (this.previousSummary) {
      const prev = this.previousSummary;

      this.trends.set({
        machines: computeTrend(value.TotalMachines, prev.TotalMachines, 'up'),
        utilization: computeTrend(
          value.AvgUtilizationPercent,
          prev.AvgUtilizationPercent,
          'up',
        ),
        free: computeTrend(value.TotalFreeHours, prev.TotalFreeHours, 'up'),
        downtime: computeTrend(
          value.TotalDowntimeHours,
          prev.TotalDowntimeHours,
          'down',
        ),
      });
    }

    this.previousSummary = value;
    this.summary.set(value);
  }

  private loadDashboard(): void {
    if (this.selectedUnitId <= 0 || this.selectedBusinessId <= 0) {
      this.resetDashboard();
      return;
    }

    this.loading.set(true);
    this.hasLoaded.set(false);

    this.machineDashboardService
      .GetMachineUtilization(
        this.selectedUnitId,
        this.selectedBusinessId,
        this.fromDate,
        this.toDate,
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.applySummary(data?.Summary ?? EMPTY_SUMMARY);
          this.machines.set(data?.Machines ?? []);
          this.hasLoaded.set(true);
          this.loading.set(false);
        },
        error: () => {
          this.summary.set(EMPTY_SUMMARY);
          this.machines.set([]);
          this.trends.set(FLAT_KPI_TRENDS);
          this.previousSummary = null;
          this.hasLoaded.set(true);
          this.loading.set(false);
        },
      });
  }
}
