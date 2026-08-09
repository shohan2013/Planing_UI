export interface IViewRequisitionHeader {
  ReqID: number;
  RequisitionNumber: string;
  UnitId: number;
  UnitName: string;
  BusinessId: number;
  BusinessName: string;
  ReqDate: Date | null;
  StartDate: Date | null;
  EndDate: Date | null;
  Remarks: string | null;
  CREATEDBY: number | null;
  UPDATEDBY: number | null;
  CREATEDDATE: Date | null;
  UPDATEDDATE: Date | null;
  DocStatusId: number;
  IsActive: boolean;
}

export interface IViewRequisitionLine {
  ID: number;
  ReqID: number;
  ProductTypeId: number;
  ProductTypeName: string;
  ItemId: number;
  ItemName: string;
  UOMId: number;
  UOMName: string;
  Quantity: number;
  StockQuantity: number | null;
  SalesQuantity: number | null;
  Remarks: string | null;
  DocStatusId: number;
  IsActive: boolean;
}


export interface IViewRequisition {
  Header: IViewRequisitionHeader;
  Lines: IViewRequisitionLine[];
}