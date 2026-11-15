export interface IUpdateRequisitionHeaderRequest {
  ReqID: number;
  Remarks: string | null;
  Enroll: number;
}

export interface IAddRequisitionLineInput {
  ProductTypeId: number;
  ItemId: number;
  SizeID: number | null;
  Size: string | null;
  Priority: number | null;
  UOMId: number;
  Quantity: number;
  StockQuantity: number | null;
  SalesQuantity: number | null;
  Remarks: string | null;
}

export interface IAddRequisitionLinesRequest {
  ReqID: number;
  Enroll: number;
  Lines: IAddRequisitionLineInput[];
}

export interface IUpdateRequisitionLineRequest {
  ReqLineID: number;
  Quantity: number;
  Priority: number | null;
  Remarks: string | null;
  Enroll: number;
}

export interface IDeleteRequisitionLineRequest {
  ReqLineID: number;
  Enroll: number;
}

export interface IAddRequisitionLineRequest extends IAddRequisitionLinesRequest {
  RequesterMessage: string | null;
}

export interface IChangeRequisitionLineRequest {
  ReqLineID: number;
  AdditionalRequestedQuantity: number;
  Enroll: number;
  RequesterMessage: string | null;
}

export interface IRequisitionLineHistory {
  ID: number;
  RequestBatchId: string;
  ReqHeaderID: number;
  ReqLineID: number;
  QuantityAtRequest: number;
  AdditionalRequestedQuantity: number;
  QtyAfterAction: number | null;
  CurrentQuantity: number;
  StatusId: number;
  StatusCode: string;
  StatusName: string;
  RequestDate: string;
  RequestBy: number;
  RequestByName: string | null;
  RequesterMessage: string | null;
  ActionTaker: number;
  ActionTakerName: string | null;
  ActionTakenBy: number | null;
  ActionTakenByName: string | null;
  ActionDate: string | null;
  ActionTakerRemarks: string | null;
  IsActive: boolean;
}