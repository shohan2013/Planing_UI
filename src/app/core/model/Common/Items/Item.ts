export interface IItem {
  Id: number;
  Name: string;
  UnitId: number | null;
  TypeId: number;
  SizeId: number | null;
  Size: string | null;

  LevelOneId: number;
}