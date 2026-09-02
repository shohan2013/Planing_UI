import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import {
  IMachineDashboardData,
  IMachineSlot,
  IMachineUtilization,
  MachineSlotType,
} from 'src/app/core/model/Common/Machine/machine-utilization';

// Mock machine catalogue per unit/business, kept small and readable.
// When the backend endpoint (GlobalConstant.API_END_POINTS.MachineUtilization)
// is ready, replace GetMachineUtilization() body with an HttpClient call — the
// return shape (IMachineDashboardData) already matches what the UI expects.
const MOCK_MACHINE_NAMES = [
  'Extruder Line A',
  'Extruder Line B',
  'Mixer M-101',
  'Packing Unit P-1',
  'Boiler B-1',
  'Cutting Machine C-3',
  'Filling Line F-2',
  'Sterilizer S-1',
];

@Injectable({
  providedIn: 'root',
})
export class MachineDashboardService {
  GetMachineUtilization(
    unitId: number,
    businessId: number,
    fromDate: string,
    toDate: string,
  ): Observable<IMachineDashboardData> {
    const data = this.buildMockData(unitId, businessId, fromDate, toDate);

    // Simulated network latency so the loading state is visible with mock data.
    return of(data).pipe(delay(400));
  }

  private buildMockData(
    unitId: number,
    businessId: number,
    fromDate: string,
    toDate: string,
  ): IMachineDashboardData {
    const start = fromDate ? new Date(fromDate) : new Date();
    const end = toDate ? new Date(toDate) : new Date();
    const totalMinutes = Math.max(
      60,
      Math.round((end.getTime() - start.getTime()) / 60000) || 24 * 60,
    );

    const machineCount = unitId > 0 || businessId > 0 ? 5 : MOCK_MACHINE_NAMES.length;

    const machines: IMachineUtilization[] = MOCK_MACHINE_NAMES.slice(
      0,
      machineCount,
    ).map((name, index) =>
      this.buildMachine(index + 1, name, unitId, businessId, start, totalMinutes),
    );

    const totalAllocated = machines.reduce((s, m) => s + m.AllocatedMinutes, 0);
    const totalFree = machines.reduce((s, m) => s + m.FreeMinutes, 0);
    const totalDowntime = machines.reduce((s, m) => s + m.DowntimeMinutes, 0);
    const avgUtilization =
      machines.length > 0
        ? machines.reduce((s, m) => s + m.UtilizationPercent, 0) / machines.length
        : 0;

    return {
      Summary: {
        TotalMachines: machines.length,
        AvgUtilizationPercent: Math.round(avgUtilization * 10) / 10,
        TotalAllocatedHours: Math.round((totalAllocated / 60) * 10) / 10,
        TotalFreeHours: Math.round((totalFree / 60) * 10) / 10,
        TotalDowntimeHours: Math.round((totalDowntime / 60) * 10) / 10,
      },
      Machines: machines,
    };
  }

  private buildMachine(
    machineId: number,
    name: string,
    unitId: number,
    businessId: number,
    start: Date,
    totalMinutes: number,
  ): IMachineUtilization {
    const slots: IMachineSlot[] = [];
    let cursor = new Date(start);
    let remaining = totalMinutes;

    let allocatedMinutes = 0;
    let freeMinutes = 0;
    let downtimeMinutes = 0;

    // Weighted-random segments: mostly allocated/free, occasional downtime.
    while (remaining > 0) {
      const roll = Math.random();
      const type: MachineSlotType =
        roll < 0.55 ? 'Allocated' : roll < 0.85 ? 'Free' : 'Downtime';

      const maxChunk = Math.min(remaining, 240);
      const minChunk = Math.min(remaining, 30);
      const duration = Math.max(
        minChunk,
        Math.round(Math.random() * (maxChunk - minChunk) + minChunk),
      );

      const slotStart = new Date(cursor);
      const slotEnd = new Date(cursor.getTime() + duration * 60000);

      slots.push({
        Type: type,
        StartTime: slotStart.toISOString(),
        EndTime: slotEnd.toISOString(),
        Label:
          type === 'Allocated'
            ? `Job Order #${1000 + machineId * 10 + slots.length}`
            : type === 'Downtime'
              ? this.randomDowntimeReason()
              : 'Idle',
      });

      if (type === 'Allocated') allocatedMinutes += duration;
      else if (type === 'Free') freeMinutes += duration;
      else downtimeMinutes += duration;

      cursor = slotEnd;
      remaining -= duration;
    }

    const utilizationPercent =
      totalMinutes > 0 ? (allocatedMinutes / totalMinutes) * 100 : 0;

    return {
      MachineId: machineId,
      MachineName: name,
      UnitId: unitId,
      UnitName: unitId > 0 ? `Unit ${unitId}` : 'All Units',
      BusinessId: businessId,
      BusinessName: businessId > 0 ? `Business ${businessId}` : 'All Businesses',
      TotalMinutes: totalMinutes,
      AllocatedMinutes: allocatedMinutes,
      FreeMinutes: freeMinutes,
      DowntimeMinutes: downtimeMinutes,
      UtilizationPercent: Math.round(utilizationPercent * 10) / 10,
      Slots: slots,
    };
  }

  private randomDowntimeReason(): string {
    const reasons = [
      'Mechanical Breakdown',
      'Changeover / Setup',
      'Power Outage',
      'Preventive Maintenance',
      'Material Shortage',
      'Quality Hold',
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }
}
