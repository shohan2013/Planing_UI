/* eslint-disable @angular-eslint/no-output-native */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';
import { Subject, debounceTime } from 'rxjs';

import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import {
  IPvpCustomerScope,
  IPvpDeliveryOrderScope,
  IPvpFilter,
  IPvpItemScope,
  IPvpOption,
  PVP_STATUSES,
} from 'src/app/core/model/PlanningVsProduction/planning-vs-production.model';

/** Wait this long after the last keystroke before asking the API. */
const SEARCH_DEBOUNCE_MS = 300;


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
  readonly units = input<IUnit[]>([]);
  readonly businesses = input<IBusiness[]>([]);
  readonly customers = input<IPvpOption[]>([]);
  readonly deliveryOrders = input<IPvpOption[]>([]);
  readonly businessesLoading = input(false);
  readonly customersLoading = input(false);
  readonly deliveryOrdersLoading = input(false);
  readonly items = input<IPvpOption[]>([]);
  readonly itemsLoading = input(false);
  readonly loading = input(false);

  readonly apply = output<IPvpFilter>();
  readonly reset = output<void>();
  readonly unitChange = output<number | null>();
  /** Unit plus typed prefix that scopes the customer list. */
  readonly customerSearch = output<IPvpCustomerScope>();
  /** Unit / business / customer selection plus typed prefix that scopes the delivery order list. */
  readonly deliveryOrderScopeChange = output<IPvpDeliveryOrderScope>();
  /** Unit plus typed prefix for the item search. */
  readonly itemScopeChange = output<IPvpItemScope>();

  /** { id, name } options; the numeric id goes to the API as Status. */
  readonly statuses = PVP_STATUSES;
  readonly draft = signal<IPvpFilter>({} as IPvpFilter);
  /** Businesses are loaded from the API for the chosen unit only. */
  readonly canPickBusiness = computed(() => !!this.draft().UnitId);
  /** Customers are only listed once a unit is chosen. */
  readonly canPickCustomer = computed(() => !!this.draft().UnitId);
  /** Delivery orders are only listed once both unit and business are chosen. */
  readonly canPickDeliveryOrder = computed(
    () => !!this.draft().UnitId && !!this.draft().BusinessId,
  );
  /** Items are searched within the chosen unit only. */
  readonly canPickItem = computed(() => !!this.draft().UnitId);

  /** Typed text from the searchable dropdowns. */
  readonly customerTypeahead = new Subject<string>();
  readonly deliveryOrderTypeahead = new Subject<string>();
  readonly itemTypeahead = new Subject<string>();

  /**
   * Suggestions are exactly what the API returned for the typed prefix (no client-side
   * filtering). The selected option is bound as the model object, so ng-select keeps
   * showing its name even when a later search doesn't return it.
   */
  readonly selectedCustomer = signal<IPvpOption | null>(null);
  readonly selectedDeliveryOrder = signal<IPvpOption | null>(null);
  readonly selectedItem = signal<IPvpOption | null>(null);
  readonly compareById = (a: IPvpOption, b: IPvpOption): boolean => a?.Id === b?.Id;

  constructor() {
    effect(() => {
      const filter = this.filter();
      this.draft.set({ ...filter });
      // Forget cached options the applied filter no longer holds (e.g. after Reset).
      untracked(() => {
        if (this.selectedCustomer()?.Id !== filter.CustomerId)
          this.selectedCustomer.set(null);
        if (this.selectedDeliveryOrder()?.Id !== filter.DeliveryOrderId)
          this.selectedDeliveryOrder.set(null);
        if (this.selectedItem()?.Id !== filter.ItemId) this.selectedItem.set(null);
      });
    });

    this.customerTypeahead
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe((term) =>
        this.customerSearch.emit({
          UnitId: this.draft().UnitId,
          Prefix: term ?? '',
        }),
      );

    this.deliveryOrderTypeahead
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe((term) => this.emitDeliveryOrderScope(term ?? ''));

    this.itemTypeahead
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe((term) => this.emitItemScope(term ?? ''));
  }

  patch(change: Partial<IPvpFilter>): void {
    this.draft.update((d) => ({ ...d, ...change }));
  }

  onUnitChange(id: number | null): void {
    // Business and customer lists are scoped to the unit, so their selections are cleared.
    this.patch({
      UnitId: id ?? null,
      BusinessId: null,
      CustomerId: null,
      DeliveryOrderId: null,
    });
    this.selectedCustomer.set(null);
    this.selectedDeliveryOrder.set(null);
    this.unitChange.emit(id ?? null);
    this.emitDeliveryOrderScope();
    this.clearItem();
  }

  onBusinessChange(id: number | null): void {
    this.patch({ BusinessId: id ?? null, DeliveryOrderId: null });
    this.selectedDeliveryOrder.set(null);
    this.emitDeliveryOrderScope();
  }

  onCustomerChange(option: IPvpOption | null): void {
    this.patch({ CustomerId: option?.Id ?? null, DeliveryOrderId: null });
    this.selectedCustomer.set(option ?? null);
    this.selectedDeliveryOrder.set(null);
    this.emitDeliveryOrderScope();
  }

  onDeliveryOrderChange(option: IPvpOption | null): void {
    this.patch({ DeliveryOrderId: option?.Id ?? null });
    this.selectedDeliveryOrder.set(option ?? null);
  }

  onItemChange(option: IPvpOption | null): void {
    this.patch({ ItemId: option?.Id ?? null });
    this.selectedItem.set(option ?? null);
  }

  /** The item search is scoped to the unit, so a unit change drops the selected item and its old suggestions. */
  private clearItem(): void {
    this.patch({ ItemId: null });
    this.selectedItem.set(null);
    this.emitItemScope();
  }

  /**
   * Leaving a search box for another field closes it (clearing the typed text, see
   * below). Focus moving out of the page (DevTools, another window/app) is not
   * "leaving": the typed text and any search in flight are kept.
   */
  onSearchBoxBlur(select: NgSelectComponent): void {
    if (document.hasFocus()) select.close();
  }

  /**
   * Closing (including leaving the box without picking) clears the typed text in
   * ng-select; an empty term through the debounced stream also cancels a pending
   * search and drops the old suggestions (an empty prefix fetches nothing).
   */
  onCustomerClose(): void {
    this.customerTypeahead.next('');
  }

  onDeliveryOrderClose(): void {
    this.deliveryOrderTypeahead.next('');
  }

  onItemClose(): void {
    this.itemTypeahead.next('');
  }

  private emitItemScope(prefix = ''): void {
    this.itemScopeChange.emit({ UnitId: this.draft().UnitId, Prefix: prefix });
  }

  private emitDeliveryOrderScope(prefix = ''): void {
    const { UnitId, BusinessId, CustomerId } = this.draft();
    this.deliveryOrderScopeChange.emit({
      UnitId,
      BusinessId,
      CustomerId,
      Prefix: prefix,
    });
  }

  /** Length of the typed prefix an option label starts with (0 = no match), for highlighting. */
  prefixLength(
    label: string | null | undefined,
    term: string | null | undefined,
  ): number {
    const prefix = term?.trim().toLowerCase();
    return prefix && label?.toLowerCase().startsWith(prefix)
      ? prefix.length
      : 0;
  }

  onApply(): void {
    this.apply.emit({ ...this.draft() });
  }
}
