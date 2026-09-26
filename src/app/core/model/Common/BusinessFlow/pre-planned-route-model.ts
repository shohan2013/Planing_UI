export interface IPrePlannedRoute {
  Id: number;
  Name: string | null;
}

export interface IPrePlannedRouteStep {
  /** BusinessConfigure (production step) id, same id as the Planning Process list. */
  BusinessFlowConfiguration: number;
  Slno: number;
}
