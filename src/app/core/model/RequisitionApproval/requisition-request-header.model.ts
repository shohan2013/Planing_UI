export interface IRequisitionRequestNotification {
  ReqID: number;
  RequisitionNumber: string;
  UnitId: number;
  UnitName: string;
  BusinessId: number;
  BusinessName: string;
  ReqDate: string | null;
  StartDate: string | null;
  EndDate: string | null;
  Remarks: string | null;
  DocStatusId: number;
  CREATEDBY: number;
  CreatedByName: string | null;
  UnresolvedRequestCount: number;
}