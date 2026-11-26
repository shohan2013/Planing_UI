export interface IMergedPlanning {
  Id: number;
  DOCode: string;
  DocumentStatus: string;
  Remarks: string | null;
  DocumentCreatedDate: Date;
  DocumentCreatedBy: string;
  IsCombineDO: boolean;
  BusinessId: number;
  Business: string;
  Unit: string;
  UnitId: number;
  IsActive: boolean;
  MergePolicyId: number;
  WorkTypeId: number;
  WorkTypeCode: string;
  MergePolicy: string;
}

export interface IMergedPlanningLine {
  Id: number;
  ProductId: number;
  ProductName: string | null;
  UOMId: number;
  UOM: string | null;
  Size: string | null;
  Quantity: number;
  PlannedQuantity: number;
  PriorityId?: number | null;
  Remarks: string | null;
  TakenQty?: number | null;
  AdvanceProductionQty?: number | null;
  RecipeVersionId?: number | null;
}

export interface IMergedPlanningDetails {
  Header: IMergedPlanning;
  Lines: IMergedPlanningLine[];
}
