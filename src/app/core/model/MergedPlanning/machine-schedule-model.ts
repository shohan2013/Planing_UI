/**
 * Query for GET MergedPlanning/GetMachineJobs: jobs on `MachineId` that overlap
 * [StartDate, EndDate]. Dates are local date-times as the datetime-local input gives
 * them (yyyy-MM-ddTHH:mm).
 */
export interface IMachineJobsRequest {
  /** The planning step (IBusinessFlowForPlanning.Id), same id Common/GetMachine takes. */
  BusinessFlowConfigureId: number;
  MachineId: number;
  StartDate: string;
  EndDate: string;
  /**
   * The plan's own job (saved ProductionPlanConfigure Id) when editing a saved plan,
   * so it isn't reported as clashing with itself. Omitted for new plans.
   */
  ExcludeJobId?: number | null;
}

/**
 * A job already allocated to a machine. One row of both responses:
 * - GetMachineJobs: jobs overlapping a slot (empty list = the machine is free there);
 * - GetMachineSchedule: every job from now to the last planned job.
 */
export interface IMachineJob {
  JobId: number;
  JobNo: string;
  ItemName: string;
  UOM: string;
  PlannedQty: number;
  /** ISO date-time (yyyy-MM-ddTHH:mm). */
  StartDate: string;
  /** ISO date-time (yyyy-MM-ddTHH:mm). */
  EndDate: string;
}

/** What the busy-machine dialog shows. */
export interface IMachineBusyInfo {
  machineName: string;
  startDate: string;
  endDate: string;
  jobs: IMachineJob[];
}

/** How the user left the busy-machine dialog. */
export type MachineBusyAction =
  | 'change-time'
  | 'change-machine'
  | 'view-schedule';

/* ------------------------------ schedule view ------------------------------ */

/**
 * Query for GET MergedPlanning/GetMachineSchedule: every job on `MachineId` (for the
 * planning step) that ends after `FromDate` (now), up to its last planned job.
 */
export interface IMachineScheduleRequest {
  BusinessFlowConfigureId: number;
  MachineId: number;
  /** Local date-time, yyyy-MM-ddTHH:mm. */
  FromDate: string;
  /**
   * The plan's own job (saved ProductionPlanConfigure Id) when editing a saved plan,
   * so it isn't reported as clashing with itself. Omitted for new plans.
   */
  ExcludeJobId?: number | null;
}

/** What the schedule dialog needs from the step card that opens it. */
export interface IMachineScheduleContext {
  businessFlowConfigureId: number;
  machineId: number;
  machineName: string;
  stepName: string | null;
  /** The card's current slot, if complete; checked against the schedule. */
  slotStart: string | null;
  slotEnd: string | null;
  /** The plan's own job when editing a saved plan; left out of the schedule. */
  excludeJobId: number | null;
  /** Saved jobs whose current version is on the Planning Desk; left out of the API's jobs. */
  hiddenJobIds?: number[];
  /** Unsaved Planning Desk jobs on this machine, shown alongside the API's jobs. */
  deskJobs?: IMachineJob[];
}

/** A slot picked in the schedule dialog ("Use this slot"); local yyyy-MM-ddTHH:mm. */
export interface IMachineSlotPick {
  startDate: string;
  endDate: string;
}
