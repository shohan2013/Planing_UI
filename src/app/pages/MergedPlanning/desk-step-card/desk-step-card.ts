import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectComponent, NgSelectModule } from '@ng-select/ng-select';

import { IProcessStepInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';
import {
  IMachineSlotPick,
  MachineBusyAction,
} from 'src/app/core/model/MergedPlanning/machine-schedule-model';

import {
  IMachineAvailabilityHost,
  IMachineSlot,
  MachineAvailability,
  MachineAvailabilityState,
} from '../process-step-from/machine-availability';

/** The desk card's editable fields. */
export type DeskStepPatch = Partial<Pick<IProcessStepInput, 'startDate' | 'endDate' | 'machineIds'>>;

/**
 * Body of a Planning Desk card: start / end / machine of a step already moved into the
 * desk. Changing them re-checks machine availability, like the step form does
 * (busy dialog, "View schedule"). The card's header (drag handle, remove) stays in
 * merged-planning-view.
 */
@Component({
  selector: 'app-desk-step-card',
  standalone: true,
  imports: [FormsModule, NgSelectModule],
  templateUrl: './desk-step-card.html',
  styleUrl: './desk-step-card.scss',
  providers: [MachineAvailability],
})
export class DeskStepCard implements OnInit, OnChanges, IMachineAvailabilityHost {
  private readonly machineAvailability = inject(MachineAvailability);

  @ViewChild('startDateInput') private startDateInput?: ElementRef<HTMLInputElement>;
  @ViewChild('machineSelect') private machineSelect?: NgSelectComponent;

  @Input({ required: true }) step!: IProcessStepInput;
  @Input() machineOptions: IMachine[] = [];

  @Output() stepChange = new EventEmitter<DeskStepPatch>();
  @Output() availabilityChange = new EventEmitter<MachineAvailabilityState>();

  readonly availability = this.machineAvailability.availability;
  readonly busyJobs = this.machineAvailability.busyJobs;

  constructor() {
    effect(() => this.availabilityChange.emit(this.availability()));
  }

  ngOnInit(): void {
    this.machineAvailability.attach(this);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const change = changes['step'];
    if (!change) return;

    if (change.firstChange) {
      // A step arrives here already checked by the step form (or blank from a
      // pre-planned route), so only later edits are checked.
      this.machineAvailability.seed(this.currentSlot);
    } else {
      this.machineAvailability.check(this.currentSlot);
    }
  }

  setStartDate(value: string): void {
    this.stepChange.emit({ startDate: value });
  }

  setEndDate(value: string): void {
    this.stepChange.emit({ endDate: value });
  }

  setMachines(value: number[] | null): void {
    this.stepChange.emit({ machineIds: [...(value ?? [])] });
  }

  get machineIds(): number[] {
    return this.step.machineIds ?? [];
  }

  get hasMachines(): boolean {
    return this.machineIds.length > 0;
  }

  get isDateRangeInvalid(): boolean {
    if (!this.step.startDate || !this.step.endDate) return false;
    return this.step.endDate < this.step.startDate;
  }

  /** Machine chosen but a date missing: both dates are required for the check. */
  get needsDatesForMachine(): boolean {
    return this.hasMachines && (!this.step.startDate || !this.step.endDate);
  }

  get isMachineBusy(): boolean {
    return this.availability() === 'busy';
  }

  /** Machine + a complete, valid slot, or null. */
  private get currentSlot(): IMachineSlot | null {
    const { startDate, endDate } = this.step;
    if (!this.hasMachines || !startDate || !endDate || this.isDateRangeInvalid) return null;
    return { machineIds: this.machineIds, startDate, endDate };
  }

  openBusyDialog(): void {
    this.machineAvailability.openBusyDialog();
  }

  /** "Schedule": the selected machines' schedule (one request for all of them). */
  openScheduleDialog(): void {
    this.machineAvailability.openScheduleDialog(this.machineIds, this.currentSlot);
  }

  get allocatedTimeBreakdown(): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null {
    if (!this.step.startDate || !this.step.endDate) return null;

    const start = new Date(this.step.startDate);
    const end = new Date(this.step.endDate);

    let totalSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (totalSeconds < 0) return null;

    const days = Math.floor(totalSeconds / 86400);
    totalSeconds -= days * 86400;

    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds -= hours * 3600;

    const minutes = Math.floor(totalSeconds / 60);
    totalSeconds -= minutes * 60;

    const seconds = totalSeconds;

    return { days, hours, minutes, seconds };
  }

  // ---------- IMachineAvailabilityHost ----------

  readonly excludeJobId = null;

  get lineId(): number {
    return this.step.lineId;
  }

  get stepId(): number {
    return this.step.stepId;
  }

  get stepName(): string | null {
    return this.step.stepName;
  }

  get machineNames(): string {
    return this.machineIds.map((id) => this.machineNameOf(id)).join(', ');
  }

  machineNameOf(machineId: number): string {
    return this.machineOptions.find((m) => m.Id === machineId)?.Name ?? `Machine #${machineId}`;
  }

  onBusyAction(action: MachineBusyAction): void {
    if (action === 'change-machine') {
      this.setMachines(this.machinesWithoutBusy());
      this.machineSelect?.focus();
    } else {
      this.startDateInput?.nativeElement.focus();
    }
  }

  /** Selected machines minus the busy ones (all of them if the busy ones aren't known). */
  private machinesWithoutBusy(): number[] {
    const busy = new Set(this.busyJobs().map((j) => j.MachineId));
    const free = this.machineIds.filter((id) => !busy.has(id));
    return free.length < this.machineIds.length ? free : [];
  }

  onSlotPicked(pick: IMachineSlotPick): void {
    // One patch for both dates: two separate emits would apply the second to a stale step.
    this.stepChange.emit({ startDate: pick.startDate, endDate: pick.endDate });
  }
}
