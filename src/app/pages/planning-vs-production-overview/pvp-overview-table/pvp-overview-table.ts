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
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IPvpColumn,
  IPvpItemRow,
  IPvpTreeNode,
  PvpSortKey,
  PvpStatus,
} from 'src/app/core/model/PlanningVsProduction/planning-vs-production.model';
import { buildPvpTree, deriveStatus, sortPvpTree } from 'src/app/core/model/PlanningVsProduction/planning-vs-production.util';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { PvpProgressBar } from '../pvp-progress-bar/pvp-progress-bar';

interface IFlatRow {
  node: IPvpTreeNode;
  depth: number;
  expandable: boolean;
  expanded: boolean;
}

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
  private readonly destroyRef = inject(DestroyRef);

  readonly rows = input<IPvpItemRow[]>([]);
  readonly loading = input(false);

  readonly search = signal('');
  readonly sortKey = signal<PvpSortKey | null>(null);
  readonly sortDir = signal<1 | -1>(1);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly expanded = signal<Set<string>>(new Set());
  readonly columns = signal<IPvpColumn[]>(DEFAULT_COLUMNS.map((c) => ({ ...c })));

  readonly visibleColumns = computed(() => this.columns().filter((c) => c.Visible));
  readonly visibleKeys = computed(() => new Set(this.visibleColumns().map((c) => c.Key)));

  /** Quick "search in results" is applied on item rows, then the tree is rebuilt so totals stay correct. */
  readonly filteredRows = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.rows();
    return this.rows().filter((r) =>
      [r.CustomerName, r.DeliveryOrderNo, r.ItemCode, r.ItemName, deriveStatus(r)].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  });

  readonly tree = computed(() => sortPvpTree(buildPvpTree(this.filteredRows()), this.sortKey(), this.sortDir()));

  readonly counts = computed(() => {
    const rows = this.filteredRows();
    return {
      customers: this.tree().length,
      orders: new Set(rows.map((r) => r.DeliveryOrderId)).size,
      items: rows.length,
    };
  });

  /** Paging is done on customer groups so a customer's orders never split across pages. */
  readonly pagedTree = computed(() => {
    const size = Number(this.pageSize()) || 10;
    const start = (this.page() - 1) * size;
    return this.tree().slice(start, start + size);
  });

  readonly flatRows = computed<IFlatRow[]>(() => {
    const open = this.expanded();
    const forceOpen = !!this.search().trim();
    const out: IFlatRow[] = [];
    const walk = (nodes: IPvpTreeNode[], depth: number) => {
      for (const node of nodes) {
        const expandable = node.Children.length > 0;
        const expanded = expandable && (forceOpen || open.has(node.Key));
        out.push({ node, depth, expandable, expanded });
        if (expanded) walk(node.Children, depth + 1);
      }
    };
    walk(this.pagedTree(), 0);
    return out;
  });

  readonly allExpanded = computed(() => this.flatRows().every((r) => !r.expandable || r.expanded));

  readonly skeletonRows = Array.from({ length: 8 });

  /** Horizontal scroll state, used to show where the frozen column ends and that more columns exist. */
  readonly scrolledLeft = signal(false);
  readonly canScrollRight = signal(false);
  readonly hasHScroll = computed(() => this.scrolledLeft() || this.canScrollRight());
  /** The custom scrollbar starts at the frozen column's right edge. */
  readonly frozenWidth = signal(0);
  readonly scrollableWidth = signal(0);
  readonly vScrollbarWidth = signal(0);
  private readonly scrollWrap = viewChild<ElementRef<HTMLElement>>('scrollWrap');
  private readonly scrollTable = viewChild<ElementRef<HTMLElement>>('scrollTable');
  private readonly frozenHeader = viewChild<ElementRef<HTMLElement>>('frozenHeader');
  private readonly hScroll = viewChild<ElementRef<HTMLElement>>('hScroll');

  constructor() {
    afterNextRender(() => {
      const wrap = this.scrollWrap()?.nativeElement;
      const table = this.scrollTable()?.nativeElement;
      if (!wrap || !table || typeof ResizeObserver === 'undefined') return;
      // Table width changes on column toggle / expand / data load; the wrapper on window resize.
      const observer = new ResizeObserver(() => this.updateScrollState());
      observer.observe(wrap);
      observer.observe(table);
      this.updateScrollState();
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // New data from the API: back to page 1 and open the first customer like the design.
    effect(() => {
      const rows = this.rows();
      untracked(() => {
        this.page.set(1);
        const first = buildPvpTree(rows)[0];
        this.expanded.set(new Set(first ? [first.Key, ...first.Children.map((c) => c.Key)] : []));
      });
    });
  }

  updateScrollState(): void {
    const el = this.scrollWrap()?.nativeElement;
    if (!el) return;
    this.scrolledLeft.set(el.scrollLeft > 2);
    this.canScrollRight.set(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);

    const frozen = this.frozenHeader()?.nativeElement.offsetWidth ?? 0;
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

  scrollRight(): void {
    const el = this.scrollWrap()?.nativeElement;
    el?.scrollBy({ left: Math.max(el.clientWidth * 0.6, 240), behavior: 'smooth' });
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
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

  sortBy(key: PvpSortKey | undefined): void {
    if (!key) return;
    if (this.sortKey() !== key) {
      this.sortKey.set(key);
      this.sortDir.set(1);
    } else if (this.sortDir() === 1) {
      this.sortDir.set(-1);
    } else {
      this.sortKey.set(null); // third click clears sorting
    }
  }

  sortIcon(key: PvpSortKey | undefined): string {
    if (!key || this.sortKey() !== key) return 'fa-sort';
    return this.sortDir() === 1 ? 'fa-sort-up' : 'fa-sort-down';
  }

  toggleColumn(key: string): void {
    this.columns.update((cols) => cols.map((c) => (c.Key === key ? { ...c, Visible: !c.Visible } : c)));
  }

  onPageSizeChange(size: number | string): void {
    this.pageSize.set(Number(size) || 10);
    this.page.set(1);
  }

  statusClass(status: PvpStatus | undefined): string {
    return 'pvp-badge--' + (status ?? '').toLowerCase().replace(/\s+/g, '-');
  }

  /** Exports item-level rows (respecting search + visible columns) as an Excel-friendly CSV. */
  exportExcel(): void {
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
      ['Status', 'Status', (r) => deriveStatus(r)],
    ];
    const active = pick.filter(([key]) => cols.has(key));
    const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const lines = [
      [...header, ...active.map(([, title]) => title)].map(esc).join(','),
      ...this.filteredRows().map((r) =>
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
