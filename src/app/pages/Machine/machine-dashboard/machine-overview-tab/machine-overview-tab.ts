import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  Input,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { ChartConfiguration, ChartData, ChartEvent, ActiveElement } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

import {
  SLOT_COLORS,
  utilizationColor,
} from '../../../../core/model/MachineDashboard/machine-dashboard.constants';
import {
  IMachineDashboardSummary,
  IMachineUtilization,
} from 'src/app/core/model/MachineDashboard/machine-dashboard.model';
import {
  FLAT_KPI_TRENDS,
  IMachineDashboardKpiTrends,
} from 'src/app/core/model/MachineDashboard/machine-dashboard-trend.util';

@Component({
  selector: 'app-machine-overview-tab',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './machine-overview-tab.html',
  styleUrl: './machine-overview-tab.scss',
})
export class MachineOverviewTab {
  private readonly charts = viewChildren(BaseChartDirective);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly donutBox = viewChild<ElementRef<HTMLElement>>('donutBox');
  private readonly barChartRef = viewChild<BaseChartDirective>('barChartRef');

  /** Live square side (px) for the donut, so it always fills its box while staying a perfect circle. */
  readonly donutSize = signal(220);

  constructor() {
    // When the tab is re-created the charts may be measured before the grid
    // layout settles; re-fit them once the container has its final size.
    afterNextRender(() => {
      const resizeCharts = () =>
        this.charts().forEach((c) => c.chart?.resize());

      resizeCharts();

      const observer = new ResizeObserver(resizeCharts);
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());

      // The donut's own wrapper is a fixed-size square: track its available
      // box (whichever of width/height is smaller) so the circle scales
      // fluidly with the viewport/card size while keeping a 1:1 ratio at
      // full resolution (Chart.js redraws at devicePixelRatio on resize).
      const donutEl = this.donutBox()?.nativeElement;
      if (donutEl) {
        const updateDonutSize = () => {
          const parent = donutEl.parentElement;
          if (!parent) return;
          const { width, height } = parent.getBoundingClientRect();
          const side = Math.max(0, Math.floor(Math.min(width, height)));
          if (side > 0) this.donutSize.set(side);
        };

        updateDonutSize();

        const donutObserver = new ResizeObserver(updateDonutSize);
        donutObserver.observe(donutEl.parentElement as Element);
        this.destroyRef.onDestroy(() => donutObserver.disconnect());
      }
    });
  }

  private readonly summarySignal = signal<IMachineDashboardSummary>({
    TotalMachines: 0,
    AvgUtilizationPercent: 0,
    TotalAllocatedHours: 0,
    TotalFreeHours: 0,
    TotalDowntimeHours: 0,
  });

  private readonly machinesSignal = signal<IMachineUtilization[]>([]);

  /** MachineId of the bar the user clicked; null means "all machines". */
  readonly selectedMachineId = signal<number | null>(null);

  readonly selectedMachine = computed<IMachineUtilization | null>(() => {
    const id = this.selectedMachineId();
    if (id === null) return null;
    return this.machinesSignal().find((m) => m.MachineId === id) ?? null;
  });

  /** Owned by the parent (MachineDashboard) since this tab is destroyed and
   * recreated on every load and on every tab switch, which would otherwise
   * wipe out the "previous summary" needed to compute a trend. */
  readonly trends = signal<IMachineDashboardKpiTrends>(FLAT_KPI_TRENDS);
  @Input()
  set kpiTrends(value: IMachineDashboardKpiTrends | null) {
    this.trends.set(value ?? FLAT_KPI_TRENDS);
  }

  @Input() loading = false;

  @Input()
  set summary(value: IMachineDashboardSummary | null) {
    if (!value) return;
    this.summarySignal.set(value);
  }
  get summary(): IMachineDashboardSummary {
    return this.summarySignal();
  }

  /** KPI cards mirror the same selection as the donut: with a machine
   * selected, they show that machine's own figures instead of the fleet
   * totals. Trend arrows are meaningless for a single machine snapshot (the
   * parent only tracks a previous *fleet* summary), so they go flat while a
   * machine is selected. */
  readonly displaySummary = computed<IMachineDashboardSummary>(() => {
    const machine = this.selectedMachine();
    if (!machine) return this.summarySignal();

    return {
      TotalMachines: 1,
      AvgUtilizationPercent: machine.UtilizationPercent,
      TotalAllocatedHours: Math.round((machine.AllocatedMinutes / 60) * 10) / 10,
      TotalFreeHours: Math.round((machine.FreeMinutes / 60) * 10) / 10,
      TotalDowntimeHours: Math.round((machine.DowntimeMinutes / 60) * 10) / 10,
    };
  });

  readonly displayTrends = computed<IMachineDashboardKpiTrends>(() =>
    this.selectedMachine() ? FLAT_KPI_TRENDS : this.trends(),
  );

  @Input()
  set machines(value: IMachineUtilization[] | null) {
    this.machinesSignal.set(value ?? []);
    // Selected machine may no longer exist in a fresh data set (e.g. filters changed).
    const id = this.selectedMachineId();
    if (id !== null && !(value ?? []).some((m) => m.MachineId === id)) {
      this.selectedMachineId.set(null);
    }
  }
  get machines(): IMachineUtilization[] {
    return this.machinesSignal();
  }

  readonly Math = Math;

  readonly utilizationDoughnutData = computed<ChartData<'doughnut'>>(() => {
    const selected = this.selectedMachine();
    const list = selected ? [selected] : this.machinesSignal();
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
    layout: { padding: 8 },
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
          backgroundColor: list.map((m) =>
            utilizationColor(m.UtilizationPercent),
          ),
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
    // Chart.js defaults to intersect:true, which only registers a
    // click/hover exactly on top of the drawn bar shape — a machine at a
    // low utilization % has almost no bar to hit. 'index' + intersect:false
    // makes the whole row (any x position at that row's y) count as being
    // "on" that machine's bar, same as clicking its name label.
    interaction: { mode: 'index', intersect: false, axis: 'y' },
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
    onHover: (event, elements, chart) => {
      const target = event.native?.target as HTMLElement | undefined;
      if (!target) return;
      const overBar = elements.length > 0;
      const overLabel = !overBar && this.labelIndexAt(chart, event) !== null;
      target.style.cursor = overBar || overLabel ? 'pointer' : 'default';
    },
  };

  /** Category-scale (y-axis) index under the pointer when it's over the
   * machine-name label gutter (left of the plotted chart area) — used to
   * let clicking the machine name do the same thing as clicking its bar. */
  private labelIndexAt(chart: { chartArea: { left: number } }, event: ChartEvent): number | null {
    const x = event.x;
    const y = event.y;
    if (x === null || y === null || x >= chart.chartArea.left) return null;

    const yScale = (chart as unknown as { scales: Record<string, { getValueForPixel(px: number): number | undefined }> })
      .scales?.['y'];
    const index = yScale?.getValueForPixel(y);
    return index === undefined ? null : Math.round(index);
  }

  private selectMachineAt(index: number): void {
    const machine = this.machinesSignal()[index];
    if (!machine) return;

    this.selectedMachineId.set(
      this.selectedMachineId() === machine.MachineId ? null : machine.MachineId,
    );
  }

  /** Clicking a bar OR its machine-name label re-renders the donut with just
   * that machine's data; clicking it again (or the "show all" pill) restores
   * the aggregate. */
  onBarClick(event: { event?: ChartEvent; active?: object[] }): void {
    const active = event.active as ActiveElement[] | undefined;

    if (active && active.length > 0) {
      this.selectMachineAt(active[0].index);
      return;
    }

    const chart = this.barChartRef()?.chart;
    if (!chart || !event.event) return;

    const index = this.labelIndexAt(chart, event.event);
    if (index !== null) this.selectMachineAt(index);
  }

  clearSelectedMachine(): void {
    this.selectedMachineId.set(null);
  }
}
