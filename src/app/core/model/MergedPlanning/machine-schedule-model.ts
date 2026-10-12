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
}

/**
 * A job already allocated to a machine, one row of the GetMachineJobs response
 * (IMachineJob[]; an empty list means the machine is free in that slot).
 */
export interface IMachineJob {
  JobId: number;
  JobNo: string;
  ItemName: string;
  DeliveryOrderNo: string;
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
export type MachineBusyAction = 'change-time' | 'change-machine';
