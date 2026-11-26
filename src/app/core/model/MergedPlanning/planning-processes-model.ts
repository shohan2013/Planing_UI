export interface IItemPlanningInput {
  LineId: number;
  TakenQty: number | null;
  AdvanceProductionQty: number | null;
  RecipeVersionId: number | null;
  PriorityId: number | null;
  IsValid: boolean;
}

export interface IProcessStepInput {
  lineId: number;
  stepId: number;
  stepName: string;
  startDate: string | null;
  endDate: string | null;
  /** Machines that run this step in the same Start/End slot (one or more). */
  machineIds: number[];
  /** 1-based position of this step within its line's Planning Desk order; persisted as OrderNo. */
  orderNo: number;
}

export interface IProductionPlanHeader {
  DOStatusId: number;
  DocCreatedBy: number;
  BusinessId: number;
  UnitId: number;
  MergePolicyId: number;
  WorkTypeId: number;
  Remarks?: string | null;
}

export interface IProductionPlanLine {
  DoStatusLineId: number;
  ProductId: number;
  UOMId: number;
  UOM: string | null;
  Size: string | null;
  Quantity: number;
  TakenQuantity: number;
  AdvanceProductionQuantity: number | null;
  RecipeVersionId: number | null;
  PriorityId: number | null;
  Remarks?: string | null;
  ProductionPlanConfigures: IProductionPlanConfigures[] | null;
}

export interface IProductionPlanConfigures {
  BusinessConfigureId: number;
  StartDate: string | null;
  EndDate: string | null;
  MachineIds: number[];
  OrderNo: number;
}

export interface IProductionPlanSaveRequest {
  Header: IProductionPlanHeader;
  Lines: IProductionPlanLine[];
}
