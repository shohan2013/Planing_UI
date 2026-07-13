export interface ISubMenuView {
  Id: number;
  SubMenuName: string;
  MenuID: number;
  MenuName: string;
  Code: string;
  RouterLink: string;
  Icon: string;
  Description: string;
  Sequence: number;
  IsActive: boolean;
  CreatedBy: number;
  CreatedDate: Date;
  UpdatedBy: number;
  UpdatedDate: Date;
}

export interface ISubMenu {
  Id: number;
  SubMenuName: string;
  MenuID: number;
  Code: string;
  RouterLink: string;
  Icon: string;
  Description: string;
  Sequence: number;
  IsActive: boolean;
  CreatedBy: number;
  CreatedDate: Date;
  UpdatedBy: number;
  UpdatedDate: Date;
}