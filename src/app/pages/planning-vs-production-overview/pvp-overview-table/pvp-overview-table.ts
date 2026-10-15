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
import { Observable, Subject, debounceTime, distinctUntilChanged, finalize } from 'rxjs';

import {
  IPvpColumn,
  IPvpItemRow,
  IPvpTreeNode,
  PvpSortKey,
  PvpStatus,
  pvpStatusLabel,
} from 'src/app/core/model/PlanningVsProduction/planning-vs-production.model';
import { buildPvpTree, deriveStatus } from 'src/app/core/model/PlanningVsProduction/planning-vs-production.util';
import { ServerQueryRequest } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { PvpProgressBar } from '../pvp-progress-bar/pvp-progress-bar';

interface IFlatRow {
  node: IPvpTreeNode;
  depth: number;
  expandable: boolean;
  expanded: boolean;
}

/** Wait this long after the last keystroke before searching on the server. */
const SEARCH_DEBOUNCE_MS = 300;

const DEFAULT_COLUMNS: IPvpColumn[] = [
  { Key: 'OrderDate', Title: 'Order Date', Visible: true, Sortable: 'OrderDate' },
  { Key: 'OrderQty', Title: 'Order Qty', Visible: true, Sortable: 'OrderQty' },
  { Key: 'PlannedQty', Title: 'Planned Qty', Visible: true, Sortable: 'PlannedQty' },
  { Key: 'ProducedQty', Title: 'Produced Qty', Visible: true, Sortable: 'ProducedQty' },
  { Key: 'PendingProduction', Title: 'Pending Production', Visible: true, Sortable: 'PendingProduction' },
  { Key: 'RemainToPlan', Title: 'Remain To Plan', Visible: true, Sortable: 'RemainToPlan' },
  { Key: 'PlanningProgress', Title: 'Planning Progress', Visible: true },
  { Key: 'ProductionProgress', Title: 'Production Progress', Visible: true },
  { Key: 'Status', Title: 'Status', Visible: true },
];

@Component({
  selector: 'app-pvp-overview-table',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, PaginationComponent, PvpProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pvp-overview-table.html',
  styleUrl: './pvp-overview-table.scss',
})
export class PvpOverviewTable {

  /** Item rows of the customers on the current page (already searched / sorted / paged by the API). */
  readonly rows = input<IPvpItemRow[]>([]);
  readonly loading = input(false);
  /** Customers matching the filter + search: the paging total. */
  readonly totalCustomers = input(0);
  readonly pageQuery = input.required<ServerQueryRequest>();
  /** Loads every row for the current filter / search / sort (all pages), for the export. */
  readonly fetchAllRows = input<(() => Observable<IPvpItemRow[]>) | null>(null);

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

  /** Rows arrive in the API order (search / sort / paging done there); the tree keeps that order. */
  readonly tree = computed(() => buildPvpTree(this.rows()));

  /** Counts for the current page. */
  readonly counts = computed(() => {
    const rows = this.rows();
    return {
      orders: new Set(rows.map((r) => r.DeliveryOrderId)).size,
      items: rows.length,
    };
  });

  readonly sortKey = computed(() => this.pageQuery().sortBy ?? null);

  readonly flatRows = computed<IFlatRow[]>(() => {
    const open = this.expanded();
    const forceOpen = !!this.pageQuery().globalSearch?.trim();
    const out: IFlatRow[] = [];
    const walk = (nodes: IPvpTreeNode[], depth: number) => {
      for (const node of nodes) {
        const expandable = node.Children.length > 0;
        const expanded = expandable && (forceOpen || open.has(node.Key));
        out.push({ node, depth, expandable, expanded });
        if (expanded) walk(node.Children, depth + 1);
      }
    };
    walk(this.tree(), 0);
    return out;
  });

  readonly allExpanded = computed(() => this.flatRows().every((r) => !r.expandable || r.expanded));

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

    // New page from the API: open the first customer like the design.
    effect(() => {
      const rows = this.rows();
      untracked(() => {
        const first = buildPvpTree(rows)[0];
        this.expanded.set(new Set(first ? [first.Key, ...first.Children.map((c) => c.Key)] : []));
      });
    });
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
    if (!row.expandable) return;
    this.expanded.update((set) => {
      const next = new Set(set);
      next.has(row.node.Key) ? next.delete(row.node.Key) : next.add(row.node.Key);
      return next;
    });
  }

  toggleAll(): void {
    if (this.allExpanded()) {
      this.expanded.set(new Set());
      return;
    }
    const keys = new Set<string>();
    const walk = (nodes: IPvpTreeNode[]) =>
      nodes.forEach((n) => {
        if (n.Children.length) {
          keys.add(n.Key);
          walk(n.Children);
        }
      });
    walk(this.tree());
    this.expanded.set(keys);
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
      this.downloadCsv(this.rows());
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
    const cols = this.visibleKeys();
    const header = ['Customer', 'Delivery Order', 'Item Code', 'Item Name'];
    const pick: [string, string, (r: IPvpItemRow) => string | number][] = [
      ['OrderDate', 'Order Date', (r) => r.OrderDate],
      ['OrderQty', 'Order Qty', (r) => r.OrderQty],
      ['PlannedQty', 'Planned Qty', (r) => r.PlannedQty],
      ['ProducedQty', 'Produced Qty', (r) => r.ProducedQty],
      ['PendingProduction', 'Pending Production', (r) => Math.max(r.PlannedQty - r.ProducedQty, 0)],
      ['RemainToPlan', 'Remain To Plan', (r) => Math.max(r.OrderQty - r.PlannedQty, 0)],
      ['PlanningProgress', 'Planning %', (r) => (r.OrderQty ? ((r.PlannedQty / r.OrderQty) * 100).toFixed(1) : 0)],
      ['ProductionProgress', 'Production %', (r) => (r.OrderQty ? ((r.ProducedQty / r.OrderQty) * 100).toFixed(1) : 0)],
      ['Status', 'Status', (r) => pvpStatusLabel(deriveStatus(r))],
    ];
    const active = pick.filter(([key]) => cols.has(key));
    const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const lines = [
      [...header, ...active.map(([, title]) => title)].map(esc).join(','),
      ...rows.map((r) =>
        [r.CustomerName, r.DeliveryOrderNo, r.ItemCode, r.ItemName, ...active.map(([, , fn]) => fn(r))]
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
