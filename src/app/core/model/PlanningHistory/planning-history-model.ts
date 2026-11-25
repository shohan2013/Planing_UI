// used for viewing

export interface IPlanningHistoryDetails {
  Header: IPlanningHistory;
  Lines: IPlanningHistoryLine[];
}

export interface IPlanningHistory {
  Id: number;
  PPNO: string;
  MergeCode: string;
  DocumentStatus: string;
  CreatedBy: string;
  CreatedDate: Date;
  Unit: string;
  Business: string;
  UnitId?: number;
  BusinessId?: number;
  IsCombineDO?: boolean;
  MergePolicy: string;
  WorkType: string;
}

export interface IPlanningHistoryLine {
  Id: number;
  ProductId: number;
  ProductName: string | null;
  UOMId: number;
  UOM: string | null;
  Size: string | null;
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

export interface IPlanningHistoryStep {
  Id: number;
  StepId: number;
  StepName: string;
  StartDate: string | null;
  EndDate: string | null;
  MachineIds: number[];
  ProductionPlanLineId?: number;
  OrderNo?: number;
}

// used for update save changes

export interface IPlanningHistoryUpdateRequest {
  Header: {
    DocUpdatedBy: number;
    BusinessId: number;
    UnitId: number;
    Remarks?: string | null;
  };
  Lines: IPlanningHistoryUpdateLine[];
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

export interface IPlanningHistoryUpdateConfigure {
  Id: number;
  BusinessConfigureId: number;
  ProductId: number;
  StartDate: string | null;
  EndDate: string | null;
  /** Machines the step runs on in this slot (one or more). */
  MachineIds: number[];
  OrderNo: number;
  IsActive: boolean;
}
