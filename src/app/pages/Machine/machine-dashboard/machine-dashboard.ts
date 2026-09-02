import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Subject, takeUntil } from 'rxjs';

import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import {
  IMachineDashboardSummary,
  IMachineUtilization,
  MachineSlotType,
} from 'src/app/core/model/Common/Machine/machine-utilization';

import { CommonService } from 'src/app/core/services/Common/CommonService';
import { MachineDashboardService } from 'src/app/core/services/Machine/machine-dashboard.service';

interface ISlotStyle {
  type: MachineSlotType;
  label: string;
  widthPercent: number;
  tooltip: string;
}

const SLOT_COLORS: Record<MachineSlotType, string> = {
  Allocated: '#3ac47d',
  Free: '#16aaff',
  Downtime: '#d92550',
};

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-machine-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './machine-dashboard.html',
  styleUrl: './machine-dashboard.scss',
})
export class MachineDashboard implements OnInit, OnDestroy {
  readonly units = signal<IUnit[]>([]);
  readonly businesses = signal<IBusiness[]>([]);
  readonly businessesLoading = signal(false);
  readonly loading = signal(false);

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

  readonly slotColors = SLOT_COLORS;
  readonly Math = Math;

  readonly utilizationDoughnutData = computed<ChartData<'doughnut'>>(() => {
    const list = this.machines();
    const allocated = list.reduce((s, m) => s + m.AllocatedMinutes, 0);
    const free = list.reduce((s, m) => s + m.FreeMinutes, 0);
    const downtime = list.reduce((s, m) => s + m.DowntimeMinutes, 0);

    return {
      labels: ['Allocated', 'Free', 'Downtime'],
      datasets: [
        {
          data: [allocated, free, downtime],
          backgroundColor: [
            SLOT_COLORS.Allocated,
            SLOT_COLORS.Free,
            SLOT_COLORS.Downtime,
          ],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };
  });

  readonly doughnutOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const minutes = ctx.parsed as number;
            const hours = Math.round((minutes / 60) * 10) / 10;
            return ` ${ctx.label}: ${hours} hrs`;
          },
        },
      },
    },
  };

  readonly utilizationBarData = computed<ChartData<'bar'>>(() => {
    const list = this.machines();
    return {
      labels: list.map((m) => m.MachineName),
      datasets: [
        {
          label: 'Utilization %',
          data: list.map((m) => m.UtilizationPercent),
          backgroundColor: list.map((m) => this.utilizationColor(m.UtilizationPercent)),
          borderRadius: 6,
          maxBarThickness: 28,
        },
      ],
    };
  });

  readonly barOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: { callback: (v) => `${v}%` },
        grid: { display: true },
      },
      y: {
        grid: { display: false },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Utilization: ${ctx.parsed.x}%`,
        },
      },
    },
  };

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

  slotSegments(machine: IMachineUtilization): ISlotStyle[] {
    if (machine.TotalMinutes <= 0) return [];

    return machine.Slots.map((slot) => {
      const start = new Date(slot.StartTime);
      const end = new Date(slot.EndTime);
      const minutes = Math.max(1, (end.getTime() - start.getTime()) / 60000);

      return {
        type: slot.Type,
        label: slot.Label,
        widthPercent: (minutes / machine.TotalMinutes) * 100,
        tooltip: `${slot.Type} — ${slot.Label}\n${start.toLocaleString()} → ${end.toLocaleString()}`,
      };
    });
  }

  utilizationColor(percent: number): string {
    if (percent >= 75) return SLOT_COLORS.Allocated;
    if (percent >= 45) return '#f7b924';
    return SLOT_COLORS.Downtime;
  }

  utilizationBadgeClass(percent: number): string {
    if (percent >= 75) return 'badge bg-success';
    if (percent >= 45) return 'badge bg-warning text-dark';
    return 'badge bg-danger';
  }

  trackByMachine(_: number, machine: IMachineUtilization): number {
    return machine.MachineId;
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
