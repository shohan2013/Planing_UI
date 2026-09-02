import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

import { IMachineUtilization } from 'src/app/core/model/Common/Machine/machine-utilization';
import {
  SLOT_COLORS,
  utilizationBadgeClass,
} from '../machine-dashboard.constants';
import { ISlotStyle } from '../machine-dashboard.model';

@Component({
  selector: 'app-machine-timeline-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './machine-timeline-tab.html',
  styleUrl: './machine-timeline-tab.scss',
})
export class MachineTimelineTab {
  private readonly machinesSignal = signal<IMachineUtilization[]>([]);

  @Input() loading = false;

  @Input()
  set machines(value: IMachineUtilization[] | null) {
    this.machinesSignal.set(value ?? []);
  }
  get machines(): IMachineUtilization[] {
    return this.machinesSignal();
  }

  readonly slotColors = SLOT_COLORS;
  readonly utilizationBadgeClass = utilizationBadgeClass;

  slotSegments(machine: IMachineUtilization): ISlotStyle[] {
    if (machine.TotalMinutes <= 0) return [];

    return machine.Slots.map((slot) => {
      const start = new Date(slot.StartTime);
      const end = new Date(slot.EndTime);
      const minutes = Math.max(1, (end.getTime() - start.getTime()) / 60000);

      return {
        type: slot.Type,
        label: slot.Label,
        widthPercent: (minutes / machine.TotalMinutes) * 100,
        tooltip: `${slot.Type} — ${slot.Label}\n${start.toLocaleString()} → ${end.toLocaleString()}`,
      };
    });
  }

  trackByMachine(_: number, machine: IMachineUtilization): number {
    return machine.MachineId;
  }
}
