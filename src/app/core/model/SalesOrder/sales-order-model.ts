export interface IDeliveryOrder {
  SOID: number;
  Code: String;
  CreatedDate: Date;
  ReqDeliveryDate: Date | null;
  Unit: String;
  Business: String | null;
  CustomerName: String | null;
  TotalAmount: number;
}

export interface IDeliveryOrderLine {
  ID: number;
  ProductId: number;
  ProductName: string;
  PresentStock: number;
  Quantity: number;
  LastPrice: number;
}

export interface IMergeDeliveryOrderRequest {
  DeliveryOrderIds: number[] | null;
  Remarks: string | null;
  DocumentCreatedBy: number;
  IsCombineDO: boolean;
  BusinessID: number;
  UnitID: number;
  Business: String;
  Unit: String;
}
