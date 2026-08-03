export interface IDeliveryOrder {
  selected: any;
  SOID: Number;
  Code: String;
  CreatedDate: Date;
  ReqDeliveryDate: Date | null;
  Unit: String;
  Business: String | null;
  CustomerName: String | null;
  TotalAmount: Number;
}
