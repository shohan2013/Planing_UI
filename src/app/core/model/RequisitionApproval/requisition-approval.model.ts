import { IProcessApprover } from "../Common/ProcessApproverList/approver-matrix-line-model";
import { IViewRequisitionLine } from "../Requisition/ViewRequisition";

export interface IRequisitionApprovalHeader {
  ApprovalHistoryId: number;
  ApproverMatrixHeaderId: number;
  ApproverMatrixLineId: number;
  BatchSequenceId: string | null;
  InitiatorId: number;
  InitiatorName: string | null;
  ActionTakerId: number;
  ActionTakerName: string | null;
  ApprovalStatusId: number;
  ApprovalStatusCode: string;
  ApprovalStatusName: string;
  ActionTakenById: number | null;
  ActionTakenByName: string | null;
  ReqID: number;
  RequisitionNumber: string;
  UnitId: number;
  UnitName: string | null;
  BusinessId: number;
  BusinessName: string | null;
  ReqDate: string;
  StartDate: string | null;
  EndDate: string | null;
  Remarks: string | null;
  DocStatusId: number;
  FacDocStatusId: number | null;
  CREATEDBY: number | null;
  CreatedByName: string | null;
  CREATEDDATE: string | null;
  UPDATEDBY: number | null;
  UpdatedByName: string | null;
  UPDATEDDATE: string | null;
}




export interface IRequisitionApprovalDetails {
  Lines: IViewRequisitionLine [];
  Approvers: IProcessApprover[];
}