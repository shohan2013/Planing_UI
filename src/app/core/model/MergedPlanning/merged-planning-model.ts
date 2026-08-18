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
  TakenQty?: number | null;
  AdvanceProductionQty?: number | null;
  RecipeVersionId?: number | null;
  PriorityId?: number | null;
}

export interface IRecipeVersionOption {
  Id: number;
  VersionName: string;
}

export interface IItemPlanningInput {
  LineId: number;
  TakenQty: number | null;
  AdvanceProductionQty: number | null;
  RecipeVersionId: number | null;
  PriorityId: number | null;
  IsValid: boolean;
}

export interface IMergedPlanningDetails {
  Header: IMergedPlanning;
  Lines: IMergedPlanningLine[];
}
