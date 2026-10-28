import { ServerQueryResponse } from '../Common/Pagination/ServerQueryRequest';

/** Item-level status as the API sends it (numeric), or derived client-side when absent. */
export enum PvpStatus {
  NotPlanned = 1,
  PartiallyPlanned = 2,
  FullyPlanned = 3,
  InProduction = 4,
  Completed = 5,
}

export const PVP_STATUS_LABELS: Record<PvpStatus, string> = {
  [PvpStatus.NotPlanned]: 'Not Planned',
  [PvpStatus.PartiallyPlanned]: 'Partially Planned',
  [PvpStatus.FullyPlanned]: 'Fully Planned',
  [PvpStatus.InProduction]: 'In Production',
  [PvpStatus.Completed]: 'Completed',
};

/** Status dropdown options: `id` is sent to the API, `name` is shown. */
export const PVP_STATUSES = Object.values(PvpStatus)
  .filter((value): value is PvpStatus => typeof value === 'number')
  .map((value) => ({
    id: value,
    name: PVP_STATUS_LABELS[value],
  }));

/** Display name of a numeric status ('' when missing or unknown). */
export function pvpStatusLabel(status: PvpStatus | null | undefined): string {
  return status ? (PVP_STATUS_LABELS[status] ?? '') : '';
}

/**
 * One aggregated row per delivery order (MDO / MREQ), as GetOverview returns it.
 * Its items are loaded separately (GetOverviewItems) when the row is expanded.
 */
export interface IPvpOrderRow {
  CustomerId: number;
  CustomerName: string;
  DeliveryOrderId: number;
  DeliveryOrderNo: string;
  OrderDate: string; // ISO date (yyyy-MM-dd)
  OrderQty: number;
  PlannedQty: number;
  ProducedQty: number;
}

/**
 * One flat row per delivery-order item, as GetOverviewItems (one order) and
 * GetOverviewExport (every order) return it.
 */
export interface IPvpItemRow {
  UnitId: number;
  BusinessId: number;
  CustomerId: number;
  CustomerName: string;
  DeliveryOrderId: number;
  DeliveryOrderNo: string;
  OrderDate: string; // ISO date (yyyy-MM-dd)
  ItemId: number;
  ItemCode: string;
  ItemName: string;
  OrderQty: number;
  PlannedQty: number;
  ProducedQty: number;
  Status?: PvpStatus | null;
}

/** Filter payload sent to the API. */
export interface IPvpFilter {
  UnitId: number;
  BusinessId: number;
  CustomerId: number;
  DeliveryOrderId: number;
  ItemId: number;
  FromDate: string;
  ToDate: string;
  Status: PvpStatus | null;
}

/** Unit selection plus typed text that scope the customer dropdown. */
export interface IPvpCustomerScope {
  UnitId: number | null;
  Prefix?: string;
}

/** Selections plus typed text that scope the delivery order dropdown (null = all). */
export interface IPvpDeliveryOrderScope extends Pick<
  IPvpFilter,
  'UnitId' | 'BusinessId' | 'CustomerId'
> {
  Prefix?: string;
}

/** Unit selection plus typed text that scope the item search (Common/ItemList). */
export interface IPvpItemScope {
  UnitId: number | null;
  Prefix?: string;
}

/**
 * GetOverview response, the project's paged shape (ServerQueryResponse):
 * - Data: the delivery orders on this page, aggregated (no items);
 * - Total: number of delivery orders matching the filter + search (the paging unit).
 * KPI totals come from GetOverviewTotals instead, so paging / search / sort don't touch them.
 */
export type IPvpOverviewResponse = ServerQueryResponse<IPvpOrderRow>;

/** Lookup option for customer / delivery order dropdowns. */
export interface IPvpOption {
  Id: number;
  Name: string;
  ParentId?: number; // Delivery order -> customer
}

/** Aggregated quantities shared by every tree level and the KPI cards. */
export interface IPvpTotals {
  OrderQty: number;
  PlannedQty: number;
  ProducedQty: number;
  PendingProduction: number; // Planned - Produced
  RemainToPlan: number; // Order - Planned
  PlanningPercent: number; // Planned / Order
  ProductionPercent: number; // Produced / Order
}

export type PvpNodeLevel = 'order' | 'item';

export interface IPvpTreeNode extends IPvpTotals {
  Key: string;
  Level: PvpNodeLevel;
  Label: string; // DO no (MDO / MREQ) / item code
  SubLabel?: string; // item name
  CustomerName?: string; // order rows only
  OrderId?: number; // order rows only: DeliveryOrderId, used to load its items
  ItemsLoaded?: boolean; // order rows only: Children hold the order's items (possibly none)
  OrderDate?: string;
  Status?: PvpStatus;
  Children: IPvpTreeNode[];
}

export type PvpSortKey =
  | 'Label'
  | 'CustomerName'
  | 'OrderDate'
  | 'OrderQty'
  | 'PlannedQty'
  | 'ProducedQty'
  | 'PendingProduction'
  | 'RemainToPlan';

export interface IPvpColumn {
  Key: string;
  Title: string;
  Visible: boolean;
  Sortable?: PvpSortKey;
}
