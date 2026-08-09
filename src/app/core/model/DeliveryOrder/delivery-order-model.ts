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
  ProductName: String;
  Quantity: number;
  Price: number;
}
