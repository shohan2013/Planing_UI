import { IPvpItemRow, IPvpTotals, IPvpTreeNode, PvpSortKey, PvpStatus } from './planning-vs-production.model';

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
  if (r.OrderQty > 0 && r.ProducedQty >= r.OrderQty) return 'Completed';
  if (r.PlannedQty <= 0) return 'Not Planned';
  if (r.PlannedQty < r.OrderQty) return 'Partially Planned';
  return r.ProducedQty > 0 ? 'In Production' : 'Fully Planned';
}

/** Builds the Customer -> Delivery Order -> Item tree from flat API rows. */
export function buildPvpTree(rows: IPvpItemRow[]): IPvpTreeNode[] {
  const customers = new Map<number, { name: string; orders: Map<number, IPvpItemRow[]> }>();

  for (const r of rows) {
    let c = customers.get(r.CustomerId);
    if (!c) {
      c = { name: r.CustomerName, orders: new Map() };
      customers.set(r.CustomerId, c);
    }
    const list = c.orders.get(r.DeliveryOrderId) ?? [];
    list.push(r);
    c.orders.set(r.DeliveryOrderId, list);
  }

  const tree: IPvpTreeNode[] = [];
  customers.forEach((c, customerId) => {
    const orderNodes: IPvpTreeNode[] = [];
    const customerRows: IPvpItemRow[] = [];

    c.orders.forEach((items, orderId) => {
      customerRows.push(...items);
      orderNodes.push({
        Key: `o-${orderId}`,
        Level: 'order',
        Label: items[0].DeliveryOrderNo,
        OrderDate: items[0].OrderDate,
        ...computeTotals(items),
        Children: items.map((i) => ({
          Key: `i-${orderId}-${i.ItemId}`,
          Level: 'item',
          Label: i.ItemCode,
          SubLabel: i.ItemName,
          OrderDate: i.OrderDate,
          Status: deriveStatus(i),
          ...computeTotals([i]),
          Children: [],
        })),
      });
    });

    tree.push({
      Key: `c-${customerId}`,
      Level: 'customer',
      Label: c.name,
      ...computeTotals(customerRows),
      Children: orderNodes,
    });
  });

  return tree;
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
