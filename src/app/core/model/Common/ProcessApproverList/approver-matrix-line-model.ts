export interface IProcessApprover {
  ApprovalHistoryId: number;
  ProcessId: number;
  BatchSequenceId: string | null;
  ApproverMatrixHeaderId: number;
  ApproverMatrixLineId: number;
  ApprovalSequence: number | null;
  InitiatorId: number;
  InitiatorName: string | null;
  ApproverId: number;
  ApproverName: string | null;
  ApprovalStatusId: number;
  ApprovalStatusCode: string;
  ApprovalStatusName: string;
  ActionTakenById: number | null;
  ActionTakenByName: string | null;
  UnitId: number;
  DocumentCreatedDate: string | null;
  Descriptions: string | null;
}