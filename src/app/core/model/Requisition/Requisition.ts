export interface IRequisitionHeader {
  ReqID: number;
  RequisitionNumber: string;
  UnitId: number;
  BusinessId: number;
  ReqDate: Date;
  Remarks: string;
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
  Remarks: string | null;
  IsActive: boolean;
}

export interface IRequisition {
  Header: IRequisitionHeader;
  Lines: IRequisitionLine[];
}