export interface IPlanningHistory {
  Id: number;
  PPNO: string;
  DOCode: string;
  CreatedBy: string;
  DocumentStatus: string;
  CreatedDate: Date;
  Unit: string;
  Business: string;
  UnitId?: number;
  BusinessId?: number;
  IsCombineDO?: boolean;
}

export interface IPlanningHistoryStep {
  Id: number;
  StepId: number;
  StepName: string;
  StartDate: string | null;
  EndDate: string | null;
  MachineId: number;
  ProductionPlanLineId?: number;
  OrderNo?: number;
}

export interface IPlanningHistoryLine {
  Id: number;
  ProductId: number;
  ProductName: string | null;
  UOM: string | null;
  Quantity: number;
  PlannedQuantity: number;
  Rate: number;
  Remarks: string | null;
  TakenQty?: number | null;
  AdvanceProductionQty?: number | null;
  RecipeVersionId?: number | null;
  PriorityId?: number | null;
  Steps?: IPlanningHistoryStep[];
}

export interface IPlanningHistoryDetails {
  Header: IPlanningHistory;
  Lines: IPlanningHistoryLine[];
}

export interface IPlanningHistoryUpdateConfigure {
  Id: number;
  BusinessConfigureId: number;
  ProductId: number;
  StartDate: string | null;
  EndDate: string | null;
  MachineId: number | null;
  OrderNo: number;
  IsActive: boolean;
}

export interface IPlanningHistoryUpdateLine {
  Id: number;
  Quantity: number;
  TakenQuantity: number;
  AdvanceProductionQuantity: number | null;
  RecipeVersionId: number | null;
  PriorityId: number | null;
  Remarks?: string | null;
  ProductionPlanConfigures: IPlanningHistoryUpdateConfigure[] | null;
}

export interface IPlanningHistoryUpdateRequest {
  Header: {
    DocUpdatedBy: number;
    BusinessId: number;
    UnitId: number;
    Remarks?: string | null;
  };
  Lines: IPlanningHistoryUpdateLine[];
}
