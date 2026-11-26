export interface IBulkRequisitionItemsRequest {
  UnitID: number;
  BusinessID: number;
  FromDate: string;
  ToDate: string;
  SizeID: number;
  SubCategoryID: number;
  GradeID?: number;
  ProductTypeId: number;
  ExcludeReqId: number;
}

export interface IBulkRequisitionItem {
  ItemID: number;
  ItemName: string;
  UOMID: number;
  StockQuantity: number;
  SalesQuantity: number;
  Count: number | null;
  TotalRequestedQuantity: number | null;
  TotalRemainingQuantity: number | null;
  SizeId: number | null;
  Size: string | null;

  CountedRequisitions: Record<string, string>;
}