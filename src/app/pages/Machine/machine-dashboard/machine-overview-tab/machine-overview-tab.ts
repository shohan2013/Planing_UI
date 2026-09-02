import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import {
  IMachineDashboardSummary,
  IMachineUtilization,
} from 'src/app/core/model/Common/Machine/machine-utilization';
import { SLOT_COLORS, utilizationColor } from '../machine-dashboard.constants';

@Component({
  selector: 'app-machine-overview-tab',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './machine-overview-tab.html',
  styleUrl: './machine-overview-tab.scss',
})
export class MachineOverviewTab {
  private readonly summarySignal = signal<IMachineDashboardSummary>({
    TotalMachines: 0,
    AvgUtilizationPercent: 0,
    TotalAllocatedHours: 0,
    TotalFreeHours: 0,
    TotalDowntimeHours: 0,
  });

  private readonly machinesSignal = signal<IMachineUtilization[]>([]);

  @Input() loading = false;

  @Input()
  set summary(value: IMachineDashboardSummary | null) {
    if (value) this.summarySignal.set(value);
  }
  get summary(): IMachineDashboardSummary {
    return this.summarySignal();
  }

  @Input()
  set machines(value: IMachineUtilization[] | null) {
    this.machinesSignal.set(value ?? []);
  }
  get machines(): IMachineUtilization[] {
    return this.machinesSignal();
  }

  readonly Math = Math;

  readonly utilizationDoughnutData = computed<ChartData<'doughnut'>>(() => {
    const list = this.machinesSignal();
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
    const list = this.machinesSignal();
    return {
      labels: list.map((m) => m.MachineName),
      datasets: [
        {
          label: 'Utilization %',
          data: list.map((m) => m.UtilizationPercent),
          backgroundColor: list.map((m) => utilizationColor(m.UtilizationPercent)),
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
}
