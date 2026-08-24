import { computed, Injectable, signal } from '@angular/core';
import { IItemPlanningInput } from '../../model/MergedPlanning/planning-processes-model';

@Injectable({
  providedIn: 'root',
})
export class ItemPlanningStateService {
  private readonly _items = signal<IItemPlanningInput[]>([]);

  readonly items = this._items.asReadonly();

  readonly allValid = computed(() => this._items().every((x) => x.IsValid));

  updateItem(item: IItemPlanningInput): void {
    this._items.update((items) => {
      const index = items.findIndex((x) => x.LineId == item.LineId);

      if (index === -1) {
        return [...items, item];
      }
      return items.map((x, i) => (i === index ? item : x));
    });
  }

  removeItem(lineId: number): void {
    this._items.update((items) => items.filter((x) => x.LineId !== lineId));
  }

  clear(): void {
    this._items.set([]);
  }
}
