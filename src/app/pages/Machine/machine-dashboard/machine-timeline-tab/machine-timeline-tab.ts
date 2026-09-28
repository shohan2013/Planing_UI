import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import {
  SLOT_COLORS,
  utilizationBadgeClass,
} from '../../../../core/model/MachineDashboard/machine-dashboard.constants';
import {
  IMachineUtilization,
  ISlotStyle,
} from '../../../../core/model/MachineDashboard/machine-dashboard.model';

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

  /** The bar only visualizes worked time (Allocated/Free slots); Downtime is
   * surfaced as a status figure next to the machine name instead, not as a
   * segment in the bar itself. Widths are rescaled against the Allocated +
   * Free total (not the machine's full TotalMinutes) so those slots still
   * fill the bar edge-to-edge once Downtime is left out. */
  slotSegments(machine: IMachineUtilization): ISlotStyle[] {
    const slots = machine.Slots.filter((slot) => slot.Type !== 'Downtime');
    if (slots.length === 0) return [];

    const durations = slots.map((slot) => {
      const start = new Date(slot.StartTime);
      const end = new Date(slot.EndTime);
      return {
        slot,
        start,
        end,
        minutes: Math.max(1, (end.getTime() - start.getTime()) / 60000),
      };
    });

    const totalMinutes = durations.reduce((sum, d) => sum + d.minutes, 0);
    if (totalMinutes <= 0) return [];

    return durations.map(({ slot, start, end, minutes }) => ({
      type: slot.Type,
      label: slot.Label,
      widthPercent: (minutes / totalMinutes) * 100,
      tooltip: `${slot.Type} — ${slot.Label}\n${start.toLocaleString()} → ${end.toLocaleString()}`,
    }));
  }

  trackByMachine(_: number, machine: IMachineUtilization): number {
    return machine.MachineId;
  }
}
