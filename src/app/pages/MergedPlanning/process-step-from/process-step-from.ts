import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CdkDragHandle } from '@angular/cdk/drag-drop';

import { IProcessStepInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';
import {
  IMachineSlotPick,
  MachineBusyAction,
} from 'src/app/core/model/MergedPlanning/machine-schedule-model';

import { IMachineAvailabilityHost, IMachineSlot, MachineAvailability } from './machine-availability';

@Component({
  selector: 'app-process-step-from',
  standalone: true,
  imports: [ReactiveFormsModule, CdkDragHandle],
  templateUrl: './process-step-from.html',
  styleUrl: './process-step-from.scss',
  providers: [MachineAvailability],
})
export class ProcessStepFrom implements OnInit, OnChanges, IMachineAvailabilityHost {
  private readonly machineAvailability = inject(MachineAvailability);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('startDateInput') private startDateInput?: ElementRef<HTMLInputElement>;
  @ViewChild('machineSelect') private machineSelect?: ElementRef<HTMLSelectElement>;

  @Input() lineId!: number;
  @Input() step!: IBusinessFlowForPlanning;
  @Input() machineOptions: IMachine[] = [];
  /** Seeds the form with an already-saved value (e.g. editing a saved plan) instead of starting blank. */
  @Input() initialValue: IProcessStepInput | null = null;
  /**
   * The saved job of this step when editing a saved plan (IPlanningHistoryStep.Id).
   * The plan's own job must not count as a clash, so it's excluded from the
   * availability check and the schedule view.
   */
  @Input() excludeJobId: number | null = null;

  @Output() formValueChange = new EventEmitter<IProcessStepInput | null>();

  form = new FormGroup({
    machineId: new FormControl<number | null>(0),

    startDate: new FormControl<string | null>(''),

    endDate: new FormControl<string | null>(''),
  });

  submitted = false;

  readonly availability = this.machineAvailability.availability;
  readonly busyJobs = this.machineAvailability.busyJobs;

  ngOnInit(): void {
    this.machineAvailability.attach(this);

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.machineAvailability.check(this.currentSlot);
        this.emitValue();
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['step'] && this.step) {
      const seed = this.initialValue;

      this.form.reset(
        {
          machineId: seed?.machineId ?? 0,
          startDate: seed?.startDate ?? '',
          endDate: seed?.endDate ?? '',
        },
        {
          emitEvent: false,
        },
      );

      // A seeded (already-saved) slot isn't re-checked until the user changes it:
      // its own job would otherwise show up as a clash.
      this.machineAvailability.seed(this.currentSlot);

      this.formValueChange.emit(this.dragData);
    }
  }

  /** Machine chosen but a date missing: both dates are required for the check. */
  get needsDatesForMachine(): boolean {
    return !!this.machineNumber && (!this.startDate || !this.endDate);
  }

  get isMachineBusy(): boolean {
    return this.availability() === 'busy';
  }

  /** Machine + a complete, valid slot, or null. */
  private get currentSlot(): IMachineSlot | null {
    if (!this.machineNumber || !this.startDate || !this.endDate || this.isDateRangeInvalid) {
      return null;
    }
    return { machineId: this.machineNumber, startDate: this.startDate, endDate: this.endDate };
  }

  /** Shows the busy-machine dialog (blurred backdrop) for the current clash. */
  openBusyDialog(): void {
    this.machineAvailability.openBusyDialog();
  }

  /**
   * "View schedule": the selected machine's jobs from now to its last planned job. The
   * card's slot (if complete) is checked against it; picking a slot there fills the
   * start / end inputs, which re-runs the availability check.
   */
  openScheduleDialog(): void {
    this.machineAvailability.openScheduleDialog(this.machineNumber, this.currentSlot);
  }

  // ---------- IMachineAvailabilityHost ----------

  get stepId(): number {
    return this.step.Id;
  }

  get stepName(): string | null {
    return this.step.Name;
  }

  get machineName(): string {
    return this.selectedMachineName;
  }

  onBusyAction(action: MachineBusyAction): void {
    if (action === 'change-machine') {
      this.form.controls.machineId.setValue(0);
      this.machineSelect?.nativeElement.focus();
    } else {
      this.startDateInput?.nativeElement.focus();
    }
  }

  onSlotPicked(pick: IMachineSlotPick): void {
    this.form.patchValue({ startDate: pick.startDate, endDate: pick.endDate });
  }

  onChecked(): void {
    this.emitValue();
  }

  get selectedMachineName(): string {
    return (
      this.machineOptions.find((m) => m.Id === this.machineNumber)?.Name ?? `Machine #${this.machineNumber}`
    );
  }

  get machineNumber(): number {
    return this.form.controls.machineId.value ?? 0;
  }

  get startDate(): string {
    return this.form.controls.startDate.value ?? '';
  }

  get endDate(): string {
    return this.form.controls.endDate.value ?? '';
  }

  get isDateRangeInvalid(): boolean {
    if (!this.startDate || !this.endDate) {
      return false;
    }

    return this.endDate < this.startDate;
  }

  get isReadyToDrop(): boolean {
    return (
      !!this.machineNumber &&
      !!this.startDate &&
      !!this.endDate &&
      !this.isDateRangeInvalid &&
      // A busy machine (or one still being checked) can't be planned into this slot.
      this.availability() !== 'busy' &&
      this.availability() !== 'checking'
    );
  }

  get allocatedTimeBreakdown(): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null {
    if (!this.startDate || !this.endDate || this.isDateRangeInvalid) {
      return null;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    let totalSeconds = Math.floor(
      (end.getTime() - start.getTime()) / 1000,
    );

    if (totalSeconds < 0) {
      return null;
    }

    const days = Math.floor(totalSeconds / 86400);
    totalSeconds -= days * 86400;

    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds -= hours * 3600;

    const minutes = Math.floor(totalSeconds / 60);
    totalSeconds -= minutes * 60;

    const seconds = totalSeconds;

    return { days, hours, minutes, seconds };
  }

  get dragData(): IProcessStepInput | null {
    if (!this.isReadyToDrop) {
      return null;
    }

    return {
      lineId: this.lineId,
      stepId: this.step.Id,
      stepName: this.step.Name,
      machineId: this.machineNumber,
      startDate: this.startDate,
      endDate: this.endDate,
      // Placeholder — ProcessStepStateService.updateProcessStep assigns the
      // real position (append on add, preserved on edit) when this is stored.
      orderNo: this.initialValue?.orderNo ?? 0,
    };
  }

  private emitValue(): void {
    this.formValueChange.emit(this.dragData);
  }
}
