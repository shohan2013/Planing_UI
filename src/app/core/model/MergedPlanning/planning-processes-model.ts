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
  machineId: number;
  /** 1-based position of this step within its line's Planning Desk order; persisted as OrderNo. */
  orderNo: number;
}

export interface IProductionPlanHeader {
  DOStatusId: number;
  DocCreatedBy: number;
  BusinessId: number;
  UnitId: number;
  Remarks?: string | null;
}

export interface IProductionPlanLine {
  ProductId: number;
  Quantity: number;
  TakenQuantity: number;
  AdvanceProductionQuantity: number | null;
  Rate: number;
  RecipeVersionId: number | null;
  PriorityId: number | null;
  Remarks?: string | null;
  ProductionPlanConfigures: IProductionPlanConfigures[] | null;
}

export interface IProductionPlanConfigures {
  BusinessConfigureId: number;
  ProductId: number;
  StartDate: string | null;
  EndDate: string | null;
  MachineId: number | null;
  OrderNo: number;
}

export interface IProductionPlanSaveRequest {
  Header: IProductionPlanHeader;
  Lines: IProductionPlanLine[];
}
