export interface IMergedPlanning {
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
}

export interface IMergedPlanningLine {
  Id: number;
  ProductName: string | null;
  UOM: string | null;
  Quantity: number;
  Rate: number;
  Remarks: string | null;
}

export interface IMergedPlanningDetails {
  Header: IMergedPlanning;
  Lines: IMergedPlanningLine[];
}
