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
 * One flat row per delivery-order item, exactly as the API is expected to return it.
 * The page builds the Customer -> Delivery Order -> Item tree from these rows.
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
 * GetOverview response, the project's paged shape (ServerQueryResponse) plus LastUpdated:
 * - Data: item rows of the customers on this page;
 * - Total: number of customers matching the filter + search (the paging unit).
 * KPI totals come from GetOverviewTotals instead, so paging / search / sort don't touch them.
 */
export interface IPvpOverviewResponse extends ServerQueryResponse<IPvpItemRow> {
  LastUpdated: string; // ISO date-time
}

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

export type PvpNodeLevel = 'customer' | 'order' | 'item';

export interface IPvpTreeNode extends IPvpTotals {
  Key: string;
  Level: PvpNodeLevel;
  Label: string; // customer name / DO no / item code
  SubLabel?: string; // item name
  OrderDate?: string;
  Status?: PvpStatus;
  Children: IPvpTreeNode[];
}

export type PvpSortKey =
  | 'Label'
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
