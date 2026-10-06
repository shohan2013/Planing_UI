import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';

import {
  IPvpFilter,
  IPvpOption,
  PVP_STATUSES,
  PvpStatus,
} from 'src/app/core/model/PlanningVsProduction/planning-vs-production.model';

@Component({
  selector: 'app-pvp-filter-bar',
  standalone: true,
  imports: [FormsModule, NgSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pvp-filter-bar.html',
  styleUrl: './pvp-filter-bar.scss',
})
export class PvpFilterBar {
  /** Applied filter from the parent; the bar edits a draft copy until Apply. */
  readonly filter = input.required<IPvpFilter>();
  readonly customers = input<IPvpOption[]>([]);
  readonly deliveryOrders = input<IPvpOption[]>([]);
  readonly loading = input(false);

  readonly apply = output<IPvpFilter>();
  readonly reset = output<void>();
  readonly customerChange = output<number | null>();

  readonly statuses: PvpStatus[] = PVP_STATUSES;
  readonly draft = signal<IPvpFilter>({} as IPvpFilter);

  constructor() {
    effect(() => this.draft.set({ ...this.filter() }));
  }

  patch(change: Partial<IPvpFilter>): void {
    this.draft.update((d) => ({ ...d, ...change }));
  }

  onCustomerChange(id: number | null): void {
    this.patch({ CustomerId: id ?? null, DeliveryOrderId: null });
    this.customerChange.emit(id ?? null);
  }

  onApply(): void {
    this.apply.emit({ ...this.draft(), ItemSearch: (this.draft().ItemSearch ?? '').trim() });
  }
}
