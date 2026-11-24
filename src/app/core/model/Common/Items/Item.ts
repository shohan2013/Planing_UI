export interface IItem {
  Id: number;
  Name: string;
  UnitId: number | null;
  TypeId: number;
  SizeId: number | null;
  Size: string | null;

  Count: number | null;
  TotalRequestedQuantity: number | null;
  TotalRemainingQuantity: number | null;
  RemainingQuantity: number | null;

  CountedRequisitions: Record<string, string>;
}