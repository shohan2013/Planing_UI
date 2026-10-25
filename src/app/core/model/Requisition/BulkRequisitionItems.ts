export interface IBulkRequisitionItemsRequest {
  UnitID: number;
  BusinessID: number;
  FromDate: string;
  ToDate: string;
  SizeID: number;
  SubCategoryID: number;
}

export interface IBulkRequisitionItem {
  ItemID: number;
  ItemName: string;
  UOMID: number;
  StockQuantity: number;
  SalesQuantity: number;
}