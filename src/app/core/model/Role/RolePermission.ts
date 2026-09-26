export interface IRolePermissionSelection 
{
  SubMenuID: number;

  CanView: boolean;
  CanInsert: boolean;
  CanUpdate: boolean;
  CanDelete: boolean;
  CanPrint: boolean;
}

export interface IRolePermissionMatrix extends IRolePermissionSelection 
{
  ID: number;
  MenuID: number | null;
  MenuName: string;
  SubMenuName: string;
}

export interface IRolePermissionLanding 
{
  ID: number;
  RoleName: string;
  IsActive: boolean;

  CreatedBy: number;
  CreatedDate: Date | string;

  UpdatedBy: number | null;
  UpdatedDate: Date | string | null;
}

export interface ICreateRolePermission 
{
  RoleName: string;
  CreatedBy: number;
  Permissions: IRolePermissionSelection[];
}

export interface IUpdateRolePermission 
{
  ID: number;
  RoleName: string;
  UpdatedBy: number;
  Permissions: IRolePermissionSelection[];
}

export interface IViewRolePermission 
{
  ID: number;
  RoleName: string;
  IsActive: boolean;

  CreatedBy: number;
  CreatedDate: Date | string;

  UpdatedBy: number | null;
  UpdatedDate: Date | string | null;

  Permissions: IRolePermissionMatrix[];
}

export interface IDeleteRolePermission 
{
  ID: number;
  UpdatedBy: number;
}



