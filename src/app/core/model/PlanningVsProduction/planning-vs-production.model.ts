/** Item-level status returned by the API (or derived client-side when absent). */
export type PvpStatus =
  | 'Not Planned'
  | 'Partially Planned'
  | 'Fully Planned'
  | 'In Production'
  | 'Completed';

export const PVP_STATUSES: PvpStatus[] = [
  'Not Planned',
  'Partially Planned',
  'Fully Planned',
  'In Production',
  'Completed',
];

/**
 * One flat row per delivery-order item, exactly as the API is expected to return it.
 * The page builds the Customer -> Delivery Order -> Item tree from these rows.
 */
export interface IPvpItemRow {
  UnitId?: number;
  BusinessId?: number;
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
  UnitId: number | null;
  BusinessId: number | null;
  CustomerId: number | null;
  DeliveryOrderId: number | null;
  ItemId: number | null;
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
export interface IPvpDeliveryOrderScope
  extends Pick<IPvpFilter, 'UnitId' | 'BusinessId' | 'CustomerId'> {
  Prefix?: string;
}

/** Unit selection plus typed text that scope the item search (Common/ItemList). */
export interface IPvpItemScope {
  UnitId: number | null;
  Prefix?: string;
}

export interface IPvpOverviewResponse {
  Rows: IPvpItemRow[];
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
