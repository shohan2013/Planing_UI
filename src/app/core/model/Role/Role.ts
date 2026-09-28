export interface IActiveRole {
  ID: number;
  RoleName: string;
}

export interface IRoleAssignment {
  RoleID: number;
  CreatedBy: number;
  Enrolls: number[];
}

export interface ITerminateRole {
  UpdatedBy: number;
  Enrolls: number[];
}

export interface ISelectedEmployee {
  Enroll: number;
  Name: string;
}