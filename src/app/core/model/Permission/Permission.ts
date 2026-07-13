export interface IPermission {
  Id: number;
  SubMenuId: number;
  SubMenu: string;
  Menu: string;
  CanInsert: boolean;
  CanUpdate: boolean;
  CanDelete: boolean;
  CanView: boolean;
  CanPrint: boolean;
  CreatedBy: number;
  UpdatedBy: number;
  CreatedDate: string;   // or Date if you convert it
  UpdatedDate: string;   // or Date if you convert it
  IsActive: boolean;
  UnitID: number;
}