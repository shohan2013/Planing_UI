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
}

export interface IMergedPlanningLine {
  Id: number;
  ProductId: number;
  ProductName: string | null;
  /** UOM id, sent back as IProductionPlanLine.UOM when the plan is saved. */
  UOMId: number;
  /** UOM display name (e.g. "Pcs"). */
  UOM: string | null;
  Quantity: number;
  PlannedQuantity: number;
  Rate: number;
  Remarks: string | null;
  TakenQty?: number | null;
  AdvanceProductionQty?: number | null;
  RecipeVersionId?: number | null;
  PriorityId?: number | null;
}

export interface IMergedPlanningDetails {
  Header: IMergedPlanning;
  Lines: IMergedPlanningLine[];
}
