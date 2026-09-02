import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IMachineDashboardSummary, IMachineUtilization } from 'src/app/core/model/Common/Machine/machine-utilization';

import { CommonService } from 'src/app/core/services/Common/CommonService';
import { MachineDashboardService } from 'src/app/core/services/Machine/machine-dashboard.service';

import { MachineOverviewTab } from './machine-overview-tab/machine-overview-tab';
import { MachineTimelineTab } from './machine-timeline-tab/machine-timeline-tab';

type MachineDashboardTab = 'overview' | 'timeline';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly commonService: CommonService,
    private readonly machineDashboardService: MachineDashboardService,
  ) {}

  ngOnInit(): void {
    this.loadUnits();
    this.loadDashboard();
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

    if (this.selectedUnitId > 0) {
      this.loadBusinesses(this.selectedUnitId);
    }

    this.loadDashboard();
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

  private loadDashboard(): void {
    this.loading.set(true);

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
          this.summary.set(data.Summary);
          this.machines.set(data.Machines);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
