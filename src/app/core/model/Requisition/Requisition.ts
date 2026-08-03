export interface IRequisitionHeader {
  ReqID: number;
  RequisitionNumber: string;
  UnitId: number;
  BusinessId: number;
  ReqDate: Date;

  StartDate: Date;
  EndDate: Date;

  Remarks: string;
  FileStatusId: number;
  IsActive: boolean;
  CREATEDBY: number;
  UPDATEDBY: number;
  CREATEDDATE: Date;
  UPDATEDDATE: Date;
}

export interface IRequisitionLine {
  ID: number;
  ReqID: number;
  ProductTypeId: number;
  ItemId: number;
  ItemName: string | null;
  UOMId: number;
  Quantity: number;

  StockQuantity: number;
  SalesQuantity: number;

  Remarks: string | null;
  FileStatusId: number;
  IsActive: boolean;
}

export interface IRequisition {
  Header: IRequisitionHeader;
  Lines: IRequisitionLine[];
  DeletedLineIds: number[];
}