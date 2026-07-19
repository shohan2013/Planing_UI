export interface IRequisitionHeader {
  ReqID: number;
  RequisitionNumber: string;
  UnitId: number;
  BusinessId: number;
  ReqDate: Date;
  ProductTypeId: number;
  Remarks: string;
}

export interface IRequisitionLine {
  ID: number;
  ReqID: number;
  ItemId: number;
  UOMId: number;
  Quantity: number;
  Remarks: string;
  IsActive: boolean;
}

export interface IRequisition {
  Header: IRequisitionHeader;
  Lines: IRequisitionLine[];
}