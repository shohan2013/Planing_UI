import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { DatePipe, DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, Subscription, debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import {
  IPvpColumn,
  IPvpItemRow,
  IPvpOrderRow,
  IPvpTreeNode,
  PvpSortKey,
  PvpStatus,
  pvpStatusLabel,
} from 'src/app/core/model/PlanningVsProduction/planning-vs-production.model';
import { buildPvpTree, deriveStatus } from 'src/app/core/model/PlanningVsProduction/planning-vs-production.util';
import { ServerQueryRequest } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { PvpLiveStatus } from 'src/app/core/services/PlanningVsProduction/planning-vs-production-live.service';
import { PvpCount } from '../pvp-live/pvp-count';
import { PvpFlash } from '../pvp-live/pvp-flash.directive';
import { PvpProgressBar } from '../pvp-progress-bar/pvp-progress-bar';

/** Copy of a set without one value (signals need a new instance to notice the change). */
function without<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  next.delete(value);
  return next;
}

interface IFlatRow {
  /** Unique per rendered row (node rows use node.Key; status rows add a suffix). */
  key: string;
  /** Status rows under an expanded order: items loading, failed to load, or none found. */
  kind: 'node' | 'loading' | 'error' | 'empty';
  node: IPvpTreeNode;
  depth: number;
  expandable: boolean;
  expanded: boolean;
}

const LIVE_LABELS: Record<PvpLiveStatus, string> = {
  connecting: 'Connecting…',
  live: 'Live',
  reconnecting: 'Reconnecting…',
  offline: 'Offline',
};

const LIVE_TITLES: Record<PvpLiveStatus, string> = {
  connecting: 'Connecting to live updates…',
  live: 'Live: planning and production changes appear here automatically',
  reconnecting: 'Connection lost, reconnecting. The table refreshes once it is back.',
  offline: 'Live updates unavailable, retrying. Use Apply to reload the data.',
};

/** Wait this long after the last keystroke before searching on the server. */
const SEARCH_DEBOUNCE_MS = 300;

const DEFAULT_COLUMNS: IPvpColumn[] = [
  { Key: 'CustomerName', Title: 'Customer', Visible: true, Sortable: 'CustomerName' },
  { Key: 'OrderDate', Title: 'Order Date', Visible: true, Sortable: 'OrderDate' },
  { Key: 'PlanningProgress', Title: 'Planning Progress', Visible: true },
  { Key: 'ProductionProgress', Title: 'Production Progress', Visible: true },
  { Key: 'OrderQty', Title: 'Order Qty', Visible: true, Sortable: 'OrderQty' },
  { Key: 'PlannedQty', Title: 'Planned Qty', Visible: true, Sortable: 'PlannedQty' },
  { Key: 'ProducedQty', Title: 'Produced Qty', Visible: true, Sortable: 'ProducedQty' },
  { Key: 'PendingProduction', Title: 'Pending Production', Visible: true, Sortable: 'PendingProduction' },
  { Key: 'RemainToPlan', Title: 'Remain To Plan', Visible: true, Sortable: 'RemainToPlan' },
  { Key: 'Status', Title: 'Status', Visible: true },
];

@Component({
  selector: 'app-pvp-overview-table',
  standalone: true,
  imports: [
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkScrollable,
    DatePipe,
    DecimalPipe,
    FormsModule,
    PaginationComponent,
    PvpCount,
    PvpFlash,
    PvpProgressBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pvp-overview-table.html',
  styleUrl: './pvp-overview-table.scss',
})
export class PvpOverviewTable {

  /** Aggregated delivery orders on the current page (already searched / sorted / paged by the API). */
  readonly rows = input<IPvpOrderRow[]>([]);
  readonly loading = input(false);
  /** Delivery orders matching the filter + search: the paging total. */
  readonly totalOrders = input(0);
  readonly pageQuery = input.required<ServerQueryRequest>();
  /** Loads every item row for the current filter / search / sort (all orders), for the export. */
  readonly fetchAllRows = input<(() => Observable<IPvpItemRow[]>) | null>(null);
  /** Loads the item rows of one delivery order, called the first time it is expanded. */
  readonly fetchOrderItems = input<((deliveryOrderId: number) => Observable<IPvpItemRow[]>) | null>(null);
  /**
   * Bumped by the parent on every real reload (Apply / Reset / Refresh / page / search / sort):
   * clears loaded items and collapses all orders. Live updates change `rows` without bumping it,
   * so expanded orders stay open.
   */
  readonly resetKey = input(0);
  /** SignalR connection state, shown as the Live badge in the toolbar. */
  readonly liveStatus = input<PvpLiveStatus>('offline');

  /** True after a live update until the next real reload: changed cells flash and count up. */
  readonly liveFlash = signal(false);

  readonly liveLabel = computed(() => LIVE_LABELS[this.liveStatus()]);
  readonly liveTitle = computed(() => LIVE_TITLES[this.liveStatus()]);

  /** Page, page size, search or sort changed: the parent re-queries the API. */
  readonly pageQueryChange = output<Partial<ServerQueryRequest>>();

  /** Text typed in "Search in results"; sent to the API after a pause. */
  readonly searchText = signal('');
  private readonly searchInput = new Subject<string>();
  readonly exporting = signal(false);
  readonly expanded = signal<Set<string>>(new Set());
  readonly columns = signal<IPvpColumn[]>(DEFAULT_COLUMNS.map((c) => ({ ...c })));

  readonly visibleColumns = computed(() => this.columns().filter((c) => c.Visible));
  readonly visibleKeys = computed(() => new Set(this.visibleColumns().map((c) => c.Key)));

  /** Items loaded so far, per DeliveryOrderId; cleared on every real reload (see resetKey). */
  readonly itemsByOrder = signal<ReadonlyMap<number, IPvpItemRow[]>>(new Map());
  readonly itemsLoading = signal<ReadonlySet<number>>(new Set());
  readonly itemsFailed = signal<ReadonlySet<number>>(new Set());
  private readonly itemSubs = new Map<number, Subscription>();

  /** Rows arrive in the API order (search / sort / paging done there); the tree keeps that order. */
  readonly tree = computed(() => buildPvpTree(this.rows(), this.itemsByOrder()));

  /** Delivery orders on the current page (item counts are only known once expanded). */
  readonly pageOrderCount = computed(() => this.rows().length);

  readonly sortKey = computed(() => this.pageQuery().sortBy ?? null);

  readonly flatRows = computed<IFlatRow[]>(() => {
    const open = this.expanded();
    const loadingIds = this.itemsLoading();
    const failedIds = this.itemsFailed();
    const out: IFlatRow[] = [];
    for (const node of this.tree()) {
      // Every order can be expanded; whether it has items is only known after loading them.
      const expanded = open.has(node.Key);
      out.push({ key: node.Key, kind: 'node', node, depth: 0, expandable: true, expanded });
      if (!expanded) continue;

      if (loadingIds.has(node.OrderId)) {
        out.push({ key: `${node.Key}-loading`, kind: 'loading', node, depth: 1, expandable: false, expanded: false });
      } else if (failedIds.has(node.OrderId)) {
        out.push({ key: `${node.Key}-error`, kind: 'error', node, depth: 1, expandable: false, expanded: false });
      } else if (node.ItemsLoaded && !node.Children.length) {
        out.push({ key: `${node.Key}-empty`, kind: 'empty', node, depth: 1, expandable: false, expanded: false });
      } else {
        for (const child of node.Children) {
          out.push({ key: child.Key, kind: 'node', node: child, depth: 1, expandable: false, expanded: false });
        }
      }
    }
    return out;
  });

  readonly allExpanded = computed(() => {
    const open = this.expanded();
    return this.tree().every((n) => open.has(n.Key));
  });

  readonly skeletonRows = Array.from({ length: 8 });

  /** The horizontal scrollbar is drawn separately so it starts after the frozen column. */
  readonly frozenWidth = signal(0);
  readonly scrollableWidth = signal(0);
  readonly vScrollbarWidth = signal(0);
  readonly hasHScroll = signal(false);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scrollWrap = viewChild<ElementRef<HTMLElement>>('scrollWrap');
  private readonly scrollTable = viewChild<ElementRef<HTMLElement>>('scrollTable');
  private readonly frozenHeader = viewChild<ElementRef<HTMLElement>>('frozenHeader');
  private readonly hScroll = viewChild<ElementRef<HTMLElement>>('hScroll');

  constructor() {
    afterNextRender(() => {
      const wrap = this.scrollWrap()?.nativeElement;
      const table = this.scrollTable()?.nativeElement;
      if (!wrap || !table || typeof ResizeObserver === 'undefined') return;
      // Table width changes on expand / column toggle / data load; the wrapper on window resize.
      const observer = new ResizeObserver(() => this.updateScrollState());
      observer.observe(wrap);
      observer.observe(table);
      this.updateScrollState();
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // Keep the search box in sync when the parent resets the query (Reset button).
    effect(() => {
      const term = this.pageQuery().globalSearch ?? '';
      untracked(() => {
        if (term !== this.searchText().trim()) this.searchText.set(term);
      });
    });

    this.searchInput
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        if (term !== (this.pageQuery().globalSearch ?? '')) this.pageQueryChange.emit({ globalSearch: term });
      });

    // Real reload from the parent: drop the old items and start with every order collapsed;
    // items are fetched only when the user expands an order (or uses Expand All). Values that
    // differ from the previous page are not "changes", so the live flash is switched off.
    effect(() => {
      this.resetKey();
      untracked(() => {
        this.liveFlash.set(false);
        this.clearItems();
        this.expanded.set(new Set());
      });
    });

    this.destroyRef.onDestroy(() => this.clearItems());
  }

  /** Opens these orders and loads the items of any not loaded yet. */
  private expandOrders(orderIds: number[], keepOpen = false): void {
    const next = new Set(keepOpen ? this.expanded() : []);
    orderIds.forEach((id) => next.add(`o-${id}`));
    this.expanded.set(next);
    orderIds.forEach((id) => this.loadItems(id));
  }

  /** Fetches one order's items unless they are already loaded or on the way. */
  private loadItems(orderId: number): void {
    const fetch = this.fetchOrderItems();
    if (!fetch || this.itemsByOrder().has(orderId) || this.itemsLoading().has(orderId)) return;

    this.itemsFailed.update((s) => without(s, orderId));
    this.itemsLoading.update((s) => new Set(s).add(orderId));
    const sub = fetch(orderId)
      .pipe(
        finalize(() => {
          this.itemSubs.delete(orderId);
          this.itemsLoading.update((s) => without(s, orderId));
        }),
      )
      .subscribe({
        next: (items) => this.itemsByOrder.update((m) => new Map(m).set(orderId, items)),
        error: () => this.itemsFailed.update((s) => new Set(s).add(orderId)),
      });
    this.itemSubs.set(orderId, sub);
  }

  /** Cancels item requests in flight and forgets loaded items (new page / filter / search). */
  private clearItems(): void {
    this.itemSubs.forEach((sub) => sub.unsubscribe());
    this.itemSubs.clear();
    this.itemsByOrder.set(new Map());
    this.itemsLoading.set(new Set());
    this.itemsFailed.set(new Set());
  }

  /**
   * Live update: the parent has just set fresh `rows` for the same page. Turns the change
   * animation on and quietly re-fetches the items of every expanded order on this page (old
   * items stay visible until the new ones arrive). Items of collapsed orders, or of orders no
   * longer on the page, are dropped and load again on the next expand.
   */
  applyLiveUpdate(rows: IPvpOrderRow[]): void {
    this.liveFlash.set(true);
    const open = this.expanded();
    const keep = new Set(rows.map((r) => r.DeliveryOrderId).filter((id) => open.has(`o-${id}`)));

    this.itemSubs.forEach((sub, id) => {
      if (!keep.has(id)) sub.unsubscribe();
    });
    this.itemsByOrder.update((m) => new Map([...m].filter(([id]) => keep.has(id))));
    this.itemsFailed.update((s) => new Set([...s].filter((id) => keep.has(id))));

    keep.forEach((id) => this.reloadItems(id));
  }

  /** Re-fetches one order's items in place, without the "Loading items…" row. */
  private reloadItems(orderId: number): void {
    // Not loaded yet (or failed / still loading): the normal load shows its own status row.
    if (!this.itemsByOrder().has(orderId) || this.itemsLoading().has(orderId)) {
      this.loadItems(orderId);
      return;
    }
    const fetch = this.fetchOrderItems();
    if (!fetch) return;

    this.itemSubs.get(orderId)?.unsubscribe();
    const sub: Subscription = fetch(orderId)
      .pipe(
        finalize(() => {
          if (this.itemSubs.get(orderId) === sub) this.itemSubs.delete(orderId);
        }),
      )
      .subscribe({
        next: (items) => this.itemsByOrder.update((m) => new Map(m).set(orderId, items)),
        // Keep showing the previous items; the next live update tries again.
        error: () => undefined,
      });
    this.itemSubs.set(orderId, sub);
  }

  /** "Retry" on an order whose items failed to load. */
  retryItems(row: IFlatRow, event: Event): void {
    event.stopPropagation();
    if (row.node.OrderId) this.loadItems(row.node.OrderId);
  }

  updateScrollState(): void {
    const el = this.scrollWrap()?.nativeElement;
    if (!el) return;
    const frozen = this.frozenHeader()?.nativeElement.offsetWidth ?? 0;
    this.hasHScroll.set(el.scrollWidth > el.clientWidth + 2);
    this.frozenWidth.set(frozen);
    this.scrollableWidth.set(Math.max(el.scrollWidth - frozen, 0));
    this.vScrollbarWidth.set(el.offsetWidth - el.clientWidth);

    const bar = this.hScroll()?.nativeElement;
    if (bar && Math.abs(bar.scrollLeft - el.scrollLeft) > 1) bar.scrollLeft = el.scrollLeft;
  }

  /** Custom scrollbar dragged: move the table by the same amount. */
  onHScroll(): void {
    const bar = this.hScroll()?.nativeElement;
    const el = this.scrollWrap()?.nativeElement;
    if (bar && el && Math.abs(el.scrollLeft - bar.scrollLeft) > 1) el.scrollLeft = bar.scrollLeft;
  }

  /** Typing searches on the server after a pause. */
  onSearch(value: string): void {
    this.searchText.set(value);
    this.searchInput.next(value.trim());
  }

  toggle(row: IFlatRow): void {
    if (!row.expandable || !row.node.OrderId) return;
    if (row.expanded) {
      this.expanded.update((set) => without(set, row.node.Key));
    } else {
      this.expandOrders([row.node.OrderId], true);
    }
  }

  /** Expand All loads every order on the page that isn't loaded yet (one request each). */
  toggleAll(): void {
    if (this.allExpanded()) {
      this.expanded.set(new Set());
      return;
    }
    this.expandOrders(this.rows().map((r) => r.DeliveryOrderId));
  }

  /** Sorting is done by the API: asc -> desc -> off. */
  sortBy(key: PvpSortKey | undefined): void {
    if (!key) return;
    const { sortBy: current, sortOrder } = this.pageQuery();
    if (current !== key) {
      this.pageQueryChange.emit({ sortBy: key, sortOrder: 'asc' });
    } else if (sortOrder === 'asc') {
      this.pageQueryChange.emit({ sortBy: key, sortOrder: 'desc' });
    } else {
      this.pageQueryChange.emit({ sortBy: null, sortOrder: null }); // third click clears sorting
    }
  }

  sortIcon(key: PvpSortKey | undefined): string {
    const { sortBy: current, sortOrder } = this.pageQuery();
    if (!key || current !== key) return 'fa-sort';
    return sortOrder === 'desc' ? 'fa-sort-down' : 'fa-sort-up';
  }

  toggleColumn(key: string): void {
    this.columns.update((cols) => cols.map((c) => (c.Key === key ? { ...c, Visible: !c.Visible } : c)));
  }

  /** Column dragged in the Columns menu: the table and the export follow the new order. */
  moveColumn(event: CdkDragDrop<IPvpColumn[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.columns.update((cols) => {
      const next = [...cols];
      moveItemInArray(next, event.previousIndex, event.currentIndex);
      return next;
    });
  }

  onPageChange(page: number): void {
    if (page !== this.pageQuery().page) this.pageQueryChange.emit({ page });
  }

  onPageSizeChange(size: number | string): void {
    this.pageQueryChange.emit({ pageSize: Number(size) || 10, page: 1 });
  }

  /** Status name for display ("In Production"); the API sends the numeric code. */
  statusLabel(status: PvpStatus | undefined): string {
    return pvpStatusLabel(status);
  }

  /** Badge modifier from the name, e.g. 'pvp-badge--in-production'. */
  statusClass(status: PvpStatus | undefined): string {
    return 'pvp-badge--' + pvpStatusLabel(status).toLowerCase().replace(/\s+/g, '-');
  }

  /**
   * Exports every row for the current filter / search / sort (all pages, fetched from the
   * API) with the visible columns, as an Excel-friendly CSV.
   */
  exportExcel(): void {
    const fetchAll = this.fetchAllRows();
    if (!fetchAll) {
      // No export API: fall back to the items loaded on this page.
      this.downloadCsv([...this.itemsByOrder().values()].flat());
      return;
    }
    this.exporting.set(true);
    fetchAll()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.exporting.set(false)),
      )
      .subscribe({ next: (rows) => this.downloadCsv(rows) });
  }

  private downloadCsv(rows: IPvpItemRow[]): void {
    const header = ['Delivery Order', 'Item Code', 'Item Name'];
    const pick: [string, string, (r: IPvpItemRow) => string | number][] = [
      ['CustomerName', 'Customer', (r) => r.CustomerName],
      ['OrderDate', 'Order Date', (r) => r.OrderDate],
      ['PlanningProgress', 'Planning %', (r) => (r.OrderQty ? ((r.PlannedQty / r.OrderQty) * 100).toFixed(1) : 0)],
      ['ProductionProgress', 'Production %', (r) => (r.OrderQty ? ((r.ProducedQty / r.OrderQty) * 100).toFixed(1) : 0)],
      ['OrderQty', 'Order Qty', (r) => r.OrderQty],
      ['PlannedQty', 'Planned Qty', (r) => r.PlannedQty],
      ['ProducedQty', 'Produced Qty', (r) => r.ProducedQty],
      ['PendingProduction', 'Pending Production', (r) => Math.max(r.PlannedQty - r.ProducedQty, 0)],
      ['RemainToPlan', 'Remain To Plan', (r) => Math.max(r.OrderQty - r.PlannedQty, 0)],
      ['Status', 'Status', (r) => pvpStatusLabel(deriveStatus(r))],
    ];
    // Visible columns in the order the user arranged them.
    const active = this.visibleColumns()
      .map((c) => pick.find(([key]) => key === c.Key))
      .filter((p): p is (typeof pick)[number] => !!p);
    const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const lines = [
      [...header, ...active.map(([, title]) => title)].map(esc).join(','),
      ...rows.map((r) =>
        [r.DeliveryOrderNo, r.ItemCode, r.ItemName, ...active.map(([, , fn]) => fn(r))]
          .map(esc)
          .join(','),
      ),
    ];

    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planning-vs-production-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
