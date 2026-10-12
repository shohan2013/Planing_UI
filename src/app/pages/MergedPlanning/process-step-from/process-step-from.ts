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
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';

import { IProcessStepInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';
import {
  IMachineJob,
  MachineBusyAction,
} from 'src/app/core/model/MergedPlanning/machine-schedule-model';
import { MachineScheduleService } from 'src/app/core/services/MergedPlanning/machine-schedule-service';

import { MachineBusyDialog } from './machine-busy-dialog/machine-busy-dialog';

/** Machine + slot whose availability is checked. */
interface ISlot {
  machineId: number;
  startDate: string;
  endDate: string;
}

/** Availability of the chosen machine in the chosen slot. */
type Availability = 'idle' | 'checking' | 'free' | 'busy' | 'error';

/** Wait this long after the last machine / date change before checking availability. */
const AVAILABILITY_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-process-step-from',
  standalone: true,
  imports: [ReactiveFormsModule, CdkDragHandle],
  templateUrl: './process-step-from.html',
  styleUrl: './process-step-from.scss',
})
export class ProcessStepFrom implements OnInit, OnChanges {
  private readonly machineSchedule = inject(MachineScheduleService);
  private readonly modalService = inject(NgbModal);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('startDateInput') private startDateInput?: ElementRef<HTMLInputElement>;
  @ViewChild('machineSelect') private machineSelect?: ElementRef<HTMLSelectElement>;

  @Input() lineId!: number;
  @Input() step!: IBusinessFlowForPlanning;
  @Input() machineOptions: IMachine[] = [];
  /** Seeds the form with an already-saved value (e.g. editing a saved plan) instead of starting blank. */
  @Input() initialValue: IProcessStepInput | null = null;

  @Output() formValueChange = new EventEmitter<IProcessStepInput | null>();

  form = new FormGroup({
    machineId: new FormControl<number | null>(0),

    startDate: new FormControl<string | null>(''),

    endDate: new FormControl<string | null>(''),
  });

  submitted = false;

  /** Signals so the template updates when the (async) availability check returns. */
  readonly availability = signal<Availability>('idle');
  readonly busyJobs = signal<IMachineJob[]>([]);

  /** Slots to check; debounced and switched so only the latest slot's answer counts. */
  private readonly slotToCheck = new Subject<ISlot | null>();
  /** Key of the slot last sent for checking, so unrelated re-emits don't re-check. */
  private lastSlotKey = '';
  private busyModal: NgbModalRef | null = null;

  ngOnInit(): void {
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.onSlotMaybeChanged();
        this.emitValue();
      });

    this.slotToCheck
      .pipe(
        debounceTime(AVAILABILITY_DEBOUNCE_MS),
        switchMap((slot) =>
          !slot
            ? of(null)
            : this.machineSchedule
                .GetMachineJobs({
                  BusinessFlowConfigureId: this.step.Id, // the selected step
                  MachineId: slot.machineId,
                  StartDate: slot.startDate,
                  EndDate: slot.endDate,
                })
                .pipe(
                  map((jobs) => ({ slot, jobs: jobs ?? [] })),
                  catchError(() => of({ slot, jobs: null as IMachineJob[] | null })),
                ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (!result) return;
        if (result.jobs === null) {
          // Could not check: say so, but don't block the user.
          this.availability.set('error');
          this.busyJobs.set([]);
        } else if (result.jobs.length > 0) {
          this.availability.set('busy');
          this.busyJobs.set(result.jobs);
          this.openBusyDialog();
        } else {
          this.availability.set('free');
          this.busyJobs.set([]);
        }
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
      this.lastSlotKey = this.slotKey(this.currentSlot);
      this.availability.set('idle');
      this.busyJobs.set([]);

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
  private get currentSlot(): ISlot | null {
    if (!this.machineNumber || !this.startDate || !this.endDate || this.isDateRangeInvalid) {
      return null;
    }
    return { machineId: this.machineNumber, startDate: this.startDate, endDate: this.endDate };
  }

  private slotKey(slot: ISlot | null): string {
    return slot ? `${slot.machineId}|${slot.startDate}|${slot.endDate}` : '';
  }

  /** Re-check availability when machine / start / end changed into a complete slot. */
  private onSlotMaybeChanged(): void {
    const slot = this.currentSlot;
    const key = this.slotKey(slot);
    if (key === this.lastSlotKey) return;
    this.lastSlotKey = key;
    this.busyJobs.set([]);
    this.availability.set(slot ? 'checking' : 'idle');
    this.slotToCheck.next(slot);
  }

  /** Shows the busy-machine dialog (blurred backdrop) for the current clash. */
  openBusyDialog(): void {
    if (this.busyModal || !this.busyJobs().length) return;

    const machineName =
      this.machineOptions.find((m) => m.Id === this.machineNumber)?.Name ?? `Machine #${this.machineNumber}`;

    // The browser's native date/time picker is drawn above the page and can't be
    // covered by CSS, so close it (by blurring its input) before the dialog opens.
    (document.activeElement as HTMLElement | null)?.blur();

    this.busyModal = this.modalService.open(MachineBusyDialog, {
      centered: true,
      backdropClass: 'machine-busy-backdrop',
      windowClass: 'machine-busy-modal',
      ariaLabelledBy: 'machineBusyTitle',
    });
    (this.busyModal.componentInstance as MachineBusyDialog).info.set({
      machineName,
      startDate: this.startDate,
      endDate: this.endDate,
      jobs: this.busyJobs(),
    });

    // NgbModal restores focus to the previously focused element while closing, so the
    // chosen action (which moves focus) runs only once the modal is fully hidden.
    let action: MachineBusyAction | null = null;
    this.busyModal.result.then(
      (a: MachineBusyAction) => (action = a),
      () => {}, // dismissed (X / Esc / backdrop): leave the form as it is
    );
    this.busyModal.hidden.subscribe(() => {
      this.busyModal = null;
      if (action) this.onBusyDialogAction(action);
    });
  }

  private onBusyDialogAction(action: MachineBusyAction): void {
    if (action === 'change-machine') {
      this.form.controls.machineId.setValue(0);
      this.machineSelect?.nativeElement.focus();
    } else {
      this.startDateInput?.nativeElement.focus();
    }
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
