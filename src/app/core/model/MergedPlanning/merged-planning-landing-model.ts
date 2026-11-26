/**
 * Landing list of Merged Planning (MergedPlanning/GetAllData).
 * Used only by the landing page. The details view keeps using
 * IMergedPlanning / IMergedPlanningDetails from merged-planning-model.ts.
 */
export interface IMergedPlanningLanding {
  Id: number;
  DOCode: string;
  DocumentStatus: string;
  Remarks: string | null;
  DocumentCreatedDate: Date;
  DocumentCreatedBy: string;
  IsCombineDO: boolean;
  Business: string;
  Unit: string;
  IsActive: boolean;
  WorkTypeCode: string;
  MergePolicy: string | null;
  /** The DOs / Requisitions this merged document was created from. */
  OriginalDOInformation: IOriginalDOInformation[] | null;
}

export interface IOriginalDOInformation {
  /** SOID of the original DO / Requisition. */
  ID: number;
  Code: string;
}
