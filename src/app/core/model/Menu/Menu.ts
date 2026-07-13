export interface IMenu {
  Id: number;
  ModuleID: number;
  Code: string;
  Name: string;
  Icon: string;
  Description: string;
  Sequence: number;
  IsActive: boolean;
  CreatedBy: number;
  CreatedDate: Date; // or Date
  UpdatedBy: number;
  UpdatedDate: Date; // or Date
}