export interface IDeliveryOrder {
  SOID: number;
  Code: String;
  CreatedDate: Date;
  ReqDeliveryDate: Date | null;
  Unit: String;
  Business: String | null;
  CustomerName: String | null;
  TotalQuantity: number;
}

export interface IDeliveryOrderLine {
  ID: number;
  ProductType: string;
  ProductId: number;
  ProductName: string;
  Size: string;
  Uom: string;
  Quantity: number;
  PriorityName: string;
}

export interface IMergeDeliveryOrderRequest {
  DeliveryOrderIds: number[] | null;
  MergePolicyId: number;
  WorkTypeCode: string;
  Remarks: string | null;
  DocumentCreatedBy: number;
  IsCombineDO: boolean;
  BusinessID: number;
  UnitID: number;
  Business: String;
  Unit: String;
}

export interface IMergePolicy {
  Id: number;
  Code: string | null;
  Name: string;
  Description: string | null;
  IsDefault: boolean;
}

/** Response of MergeDeliveryOrder/PreviewMerge (same body as MergeDOs). */
export interface IMergePreview {
  MergePolicyId: number;
  MergePolicyName: string;
  /** One row per product the policy produces after merging. */
  MergedProducts: IMergedProduct[];
}

/** A product after merging, with the original lines it was built from. */
export interface IMergedProduct {
  ProductId: number;
  ProductName: string;
  Size: string | null;
  UoM: string | null;
  /** Sum of the original lines' quantities. */
  TotalQuantity: number;
  /** Priority after merging, decided by the backend grouping logic. */
  PriorityName: string | null;
  OriginalLines: IMergePreviewOriginalLine[];
}

/** One line from a DO / Requisition in the cart. */
export interface IMergePreviewOriginalLine {
  LineId: number;
  /** DO or Requisition code, e.g. DO-2026-0101. */
  Code: string;
  ProductName: string;
  Size: string | null;
  UoM: string | null;
  Quantity: number;
  /** The line's own priority before merging. */
  PriorityName: string | null;
}
