import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';

import { IPvpTotals } from 'src/app/core/model/PlanningVsProduction/planning-vs-production.model';
import { EMPTY_PVP_TOTALS } from 'src/app/core/model/PlanningVsProduction/planning-vs-production.util';

interface IKpiCard {
  key: keyof IPvpTotals;
  title: string;
  icon: string;
  tone: 'blue' | 'green' | 'violet' | 'amber' | 'red';
  danger?: boolean;
  percent: number;
}

@Component({
  selector: 'app-pvp-kpi-cards',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pvp-kpi-cards.html',
  styleUrl: './pvp-kpi-cards.scss',
})
export class PvpKpiCards {
  readonly totals = input<IPvpTotals>(EMPTY_PVP_TOTALS);
  readonly loading = input(false);

  /** Values shown on screen; tweened toward `totals()` for a count-up effect. */
  readonly display = signal<IPvpTotals>(EMPTY_PVP_TOTALS);

  readonly cards = computed<IKpiCard[]>(() => {
    const t = this.totals();
    const ofOrder = (v: number) => (t.OrderQty > 0 ? (v / t.OrderQty) * 100 : 0);
    return [
      { key: 'OrderQty', title: 'Total Order Qty', icon: 'fa-clipboard-list', tone: 'blue', percent: t.OrderQty > 0 ? 100 : 0 },
      { key: 'PlannedQty', title: 'Total Planned Qty', icon: 'fa-calendar-check', tone: 'green', percent: ofOrder(t.PlannedQty) },
      { key: 'ProducedQty', title: 'Total Produced Qty', icon: 'fa-cogs', tone: 'violet', percent: ofOrder(t.ProducedQty) },
      { key: 'PendingProduction', title: 'Pending Production', icon: 'fa-industry', tone: 'amber', danger: true, percent: ofOrder(t.PendingProduction) },
      { key: 'RemainToPlan', title: 'Remain To Plan', icon: 'fa-list-ul', tone: 'red', danger: true, percent: ofOrder(t.RemainToPlan) },
    ];
  });

  private frame = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
    effect(() => this.animateTo(this.totals()));
  }

  private animateTo(target: IPvpTotals): void {
    cancelAnimationFrame(this.frame);
    const from = this.display();
    const start = performance.now();
    const duration = 700;
    const keys = Object.keys(target) as (keyof IPvpTotals)[];

    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = { ...target };
      keys.forEach((k) => (next[k] = Math.round(from[k] + (target[k] - from[k]) * eased)));
      this.display.set(p < 1 ? next : target);
      if (p < 1) this.frame = requestAnimationFrame(step);
    };
    this.frame = requestAnimationFrame(step);
  }
}
