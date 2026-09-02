import { MachineSlotType } from 'src/app/core/model/Common/Machine/machine-utilization';

export const SLOT_COLORS: Record<MachineSlotType, string> = {
  Allocated: '#3ac47d',
  Free: '#16aaff',
  Downtime: '#d92550',
};

export function utilizationColor(percent: number): string {
  if (percent >= 75) return SLOT_COLORS.Allocated;
  if (percent >= 45) return '#f7b924';
  return SLOT_COLORS.Downtime;
}

export function utilizationBadgeClass(percent: number): string {
  if (percent >= 75) return 'badge bg-success';
  if (percent >= 45) return 'badge bg-warning text-dark';
  return 'badge bg-danger';
}
