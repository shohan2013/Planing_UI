export type MachineSlotType = 'Allocated' | 'Free' | 'Downtime';

export interface IMachineSlot {
  Type: MachineSlotType;
  StartTime: string;
  EndTime: string;
  Label: string;
}

export interface IMachineUtilization {
  MachineId: number;
  MachineName: string;
  UnitId: number;
  UnitName: string;
  BusinessId: number;
  BusinessName: string;
  TotalMinutes: number;
  AllocatedMinutes: number;
  FreeMinutes: number;
  DowntimeMinutes: number;
  UtilizationPercent: number;
  Slots: IMachineSlot[];
}

export interface IMachineDashboardSummary {
  TotalMachines: number;
  AvgUtilizationPercent: number;
  TotalAllocatedHours: number;
  TotalFreeHours: number;
  TotalDowntimeHours: number;
}

export interface IMachineDashboardData {
  Summary: IMachineDashboardSummary;
  Machines: IMachineUtilization[];
}
