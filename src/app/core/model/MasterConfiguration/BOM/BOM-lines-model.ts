export interface ProductionBOMMaterialLine {
  ID: number;
  BoMId: number | null;
  ItemID: number | null;
  ItemName: string | null;
  Quantity: number | null;
  WastagePercent: number | null;
  Rate: number | null;
  UoM: string | null;
  CUoM: string | null;
  ConvertedQty: number | null;
  CValue: number;
  ProcessLoss: number | null;
  WarehouseID: number | null;
  WarehouseName: string | null;
  Remarks: string | null;
}

export interface ProductionBOMResourceLine {
  ID: number;
  BoMId: number | null;
  ItemID: number | null;
  ItemName: string | null;
  Quantity: number | null;
  Rate: number | null;
  UoM: string | null;
  WarehouseID: number | null;
  WarehouseName: string | null;
  Remarks: string | null;
}

export interface ProductionBOMLinesResponse {
  MaterialLines: ProductionBOMMaterialLine[];
  ResourceLines: ProductionBOMResourceLine[];
}