import { IPvpItemRow, IPvpOrderRow, IPvpTotals, IPvpTreeNode, PvpSortKey, PvpStatus } from './planning-vs-production.model';

export const EMPTY_PVP_TOTALS: IPvpTotals = {
  OrderQty: 0,
  PlannedQty: 0,
  ProducedQty: 0,
  PendingProduction: 0,
  RemainToPlan: 0,
  PlanningPercent: 0,
  ProductionPercent: 0,
};

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

export function computeTotals(rows: Pick<IPvpItemRow, 'OrderQty' | 'PlannedQty' | 'ProducedQty'>[]): IPvpTotals {
  let order = 0;
  let planned = 0;
  let produced = 0;
  for (const r of rows) {
    order += r.OrderQty || 0;
    planned += r.PlannedQty || 0;
    produced += r.ProducedQty || 0;
  }
  return {
    OrderQty: order,
    PlannedQty: planned,
    ProducedQty: produced,
    PendingProduction: Math.max(planned - produced, 0),
    RemainToPlan: Math.max(order - planned, 0),
    PlanningPercent: pct(planned, order),
    ProductionPercent: pct(produced, order),
  };
}

/** Used when the API does not send a status for an item. */
export function deriveStatus(r: IPvpItemRow): PvpStatus {
  if (r.Status) return r.Status;
  if (r.OrderQty > 0 && r.ProducedQty >= r.OrderQty) return PvpStatus.Completed;
  if (r.PlannedQty <= 0) return PvpStatus.NotPlanned;
  if (r.PlannedQty < r.OrderQty) return PvpStatus.PartiallyPlanned;
  return r.ProducedQty > 0 ? PvpStatus.InProduction : PvpStatus.FullyPlanned;
}

/**
 * Builds the Delivery Order (MDO / MREQ) -> Item tree: order rows from GetOverview,
 * children from the items loaded so far (an order not loaded yet has no children).
 */
export function buildPvpTree(orders: IPvpOrderRow[], itemsByOrder: ReadonlyMap<number, IPvpItemRow[]>): IPvpTreeNode[] {
  return orders.map((o) => ({
    Key: `o-${o.DeliveryOrderId}`,
    Level: 'order',
    Label: o.DeliveryOrderNo,
    CustomerName: o.CustomerName,
    OrderId: o.DeliveryOrderId,
    ItemsLoaded: itemsByOrder.has(o.DeliveryOrderId),
    OrderDate: o.OrderDate,
    ...computeTotals([o]),
    Children: (itemsByOrder.get(o.DeliveryOrderId) ?? []).map((i) => ({
      Key: `i-${o.DeliveryOrderId}-${i.ItemId}`,
      Level: 'item',
      Label: i.ItemCode,
      SubLabel: i.ItemName,
      OrderDate: i.OrderDate,
      Status: deriveStatus(i),
      ...computeTotals([i]),
      Children: [],
    })),
  }));
}

/** Sorts every level of the tree by the same key (non-mutating). */
export function sortPvpTree(nodes: IPvpTreeNode[], key: PvpSortKey | null, dir: 1 | -1): IPvpTreeNode[] {
  if (!key) return nodes;
  const cmp = (a: IPvpTreeNode, b: IPvpTreeNode): number => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  };
  return [...nodes]
    .sort(cmp)
    .map((n) => (n.Children.length ? { ...n, Children: sortPvpTree(n.Children, key, dir) } : n));
}
