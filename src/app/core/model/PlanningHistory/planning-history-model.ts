export interface IPlanningHistory {
  Id: number;
  PPNO: string;
  DOCode: string;
  CreatedBy: string;
  DocumentStatus: string;
  CreatedDate: Date;
  Unit: string;
  Business: string;
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
}

export interface IPlanningHistoryDetails {
  Header: IPlanningHistory;
  Lines: IPlanningHistoryLine[];
}
