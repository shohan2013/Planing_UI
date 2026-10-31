import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subject, catchError, debounceTime, map, of, switchMap } from 'rxjs';

import {
  IMachineJob,
  IMachineSlotPick,
  MachineBusyAction,
} from 'src/app/core/model/MergedPlanning/machine-schedule-model';
import { MachineScheduleService } from 'src/app/core/services/MergedPlanning/machine-schedule-service';
import {
  DeskMachineJobsService,
  IDeskStepRef,
} from 'src/app/core/services/MergedPlanning/desk-machine-jobs-service';

import { MachineBusyDialog } from './machine-busy-dialog/machine-busy-dialog';
import { MachineScheduleDialog } from './machine-schedule-dialog/machine-schedule-dialog';

/** Machine + slot whose availability is checked. */
export interface IMachineSlot {
  machineId: number;
  startDate: string;
  endDate: string;
}

/** Availability of the chosen machine in the chosen slot. */
export type MachineAvailabilityState = 'idle' | 'checking' | 'free' | 'busy' | 'error';

/** What the card using MachineAvailability supplies and how it reacts to the dialogs. */
export interface IMachineAvailabilityHost {
  /** The planning line; with stepId, identifies this step among the desk's unsaved steps. */
  readonly lineId: number;
  /** The planning step (IBusinessFlowForPlanning.Id). */
  readonly stepId: number;
  readonly stepName: string | null;
  /** The plan's own saved job when editing a saved plan; never counts as a clash. */
  readonly excludeJobId: number | null;
  readonly machineName: string;
  /** User left the busy dialog with an action (runs once the dialog is fully hidden). */
  onBusyAction(action: MachineBusyAction): void;
  /** User picked a slot in the schedule dialog. */
  onSlotPicked(pick: IMachineSlotPick): void;
  /** An availability check finished (any outcome). */
  onChecked?(): void;
}

/** Wait this long after the last machine / date change before checking availability. */
const AVAILABILITY_DEBOUNCE_MS = 400;

/**
 * Machine availability for one step card: debounced clash check, busy dialog and
 * schedule dialog. Provided per card (`providers: [MachineAvailability]`) and shared
 * by the step form (ProcessStepFrom) and the Planning Desk card (DeskStepCard).
 */
@Injectable()
export class MachineAvailability {
  private readonly machineSchedule = inject(MachineScheduleService);
  private readonly modalService = inject(NgbModal);
  private readonly destroyRef = inject(DestroyRef);
  /** Unsaved Planning Desk jobs; absent outside the planning views. */
  private readonly deskJobs = inject(DeskMachineJobsService, { optional: true });

  /** Signals so the template updates when the (async) availability check returns. */
  readonly availability = signal<MachineAvailabilityState>('idle');
  readonly busyJobs = signal<IMachineJob[]>([]);

  private host!: IMachineAvailabilityHost;
  /** Slots to check; debounced and switched so only the latest slot's answer counts. */
  private readonly slotToCheck = new Subject<IMachineSlot | null>();
  /** Key of the slot last sent for checking, so unrelated re-emits don't re-check. */
  private lastSlotKey = '';
  /** The slot last sent for checking; the busy dialog describes this one. */
  private slot: IMachineSlot | null = null;
  private busyModal: NgbModalRef | null = null;
  private scheduleModal: NgbModalRef | null = null;

  /** Starts listening for slots; call once from the host's ngOnInit. */
  attach(host: IMachineAvailabilityHost): void {
    this.host = host;

    this.slotToCheck
      .pipe(
        debounceTime(AVAILABILITY_DEBOUNCE_MS),
        switchMap((slot) =>
          !slot
            ? of(null)
            : this.machineSchedule
                .GetMachineJobs({
                  BusinessFlowConfigureId: this.host.stepId,
                  MachineId: slot.machineId,
                  StartDate: slot.startDate,
                  EndDate: slot.endDate,
                  ExcludeJobId: this.host.excludeJobId,
                })
                .pipe(
                  // Also filtered here, in case the API returns the plan's own job anyway.
                  map((jobs) => this.withoutDeskCopies(jobs ?? [])),
                  catchError(() => of(null as IMachineJob[] | null)),
                  map((jobs) => ({ slot, jobs })),
                ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        if (!result) return;
        // Unsaved desk steps are known locally, so they are checked even if the API failed.
        const deskClashes = this.deskJobs?.overlappingJobs(
          result.slot.machineId,
          result.slot.startDate,
          result.slot.endDate,
          this.selfRef,
        ) ?? [];
        const clashes = [...(result.jobs ?? []), ...deskClashes];

        if (clashes.length > 0) {
          this.availability.set('busy');
          this.busyJobs.set(clashes);
          this.openBusyDialog();
        } else if (result.jobs === null) {
          // Could not check: say so, but don't block the user.
          this.availability.set('error');
          this.busyJobs.set([]);
        } else {
          this.availability.set('free');
          this.busyJobs.set([]);
        }
        this.host.onChecked?.();
      });
  }

  /** Takes `slot` as already known (e.g. a saved or already-checked slot) without checking it. */
  seed(slot: IMachineSlot | null): void {
    this.lastSlotKey = this.slotKey(slot);
    this.slot = slot;
    this.availability.set('idle');
    this.busyJobs.set([]);
  }

  /** Re-checks availability when machine / start / end changed (null = incomplete slot). */
  check(slot: IMachineSlot | null): void {
    const key = this.slotKey(slot);
    if (key === this.lastSlotKey) return;
    this.lastSlotKey = key;
    this.slot = slot;
    this.busyJobs.set([]);
    this.availability.set(slot ? 'checking' : 'idle');
    this.slotToCheck.next(slot);
  }

  /** Shows the busy-machine dialog (blurred backdrop) for the current clash. */
  openBusyDialog(): void {
    if (this.busyModal || !this.busyJobs().length || !this.slot) return;

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
      machineName: this.host.machineName,
      startDate: this.slot.startDate,
      endDate: this.slot.endDate,
      jobs: this.busyJobs(),
    });

    // NgbModal restores focus to the previously focused element while closing, so the
    // chosen action (which moves focus) runs only once the modal is fully hidden.
    let action: MachineBusyAction | null = null;
    this.busyModal.result.then(
      (a: MachineBusyAction) => (action = a),
      () => {}, // dismissed (X / Esc / backdrop): leave the card as it is
    );
    this.busyModal.hidden.subscribe(() => {
      this.busyModal = null;
      if (action === 'view-schedule') {
        this.openScheduleDialog(this.slot?.machineId ?? 0, this.slot);
      } else if (action) {
        this.host.onBusyAction(action);
      }
    });
  }

  /**
   * "View schedule": the machine's jobs from now to its last planned job. `slot` (if
   * complete) is checked against it; a picked slot is handed to the host.
   */
  openScheduleDialog(machineId: number, slot: IMachineSlot | null): void {
    if (!machineId || this.scheduleModal) return;
    (document.activeElement as HTMLElement | null)?.blur(); // close a native date picker

    this.scheduleModal = this.modalService.open(MachineScheduleDialog, {
      scrollable: true,
      backdropClass: 'machine-busy-backdrop',
      windowClass: 'machine-schedule-modal',
      ariaLabelledBy: 'machineScheduleTitle',
    });
    (this.scheduleModal.componentInstance as MachineScheduleDialog).init({
      businessFlowConfigureId: this.host.stepId,
      machineId,
      machineName: this.host.machineName,
      stepName: this.host.stepName,
      slotStart: slot?.startDate ?? null,
      slotEnd: slot?.endDate ?? null,
      excludeJobId: this.host.excludeJobId,
      hiddenJobIds: [...(this.deskJobs?.savedJobIds() ?? [])],
      deskJobs: this.deskJobs?.jobsOnMachine(machineId, this.selfRef) ?? [],
    });

    let pick: IMachineSlotPick | null = null;
    this.scheduleModal.result.then(
      (p: IMachineSlotPick) => (pick = p),
      () => {}, // closed without picking a slot
    );
    this.scheduleModal.hidden.subscribe(() => {
      this.scheduleModal = null;
      if (pick) this.host.onSlotPicked(pick);
    });
  }

  private get selfRef(): IDeskStepRef {
    return { lineId: this.host.lineId, stepId: this.host.stepId };
  }

  /**
   * API jobs minus the plan's own job and, when editing, the plan's other saved jobs:
   * the desk holds their current version, which is added separately.
   */
  private withoutDeskCopies(jobs: IMachineJob[]): IMachineJob[] {
    const hidden = this.deskJobs?.savedJobIds() ?? new Set<number>();
    if (this.host.excludeJobId) hidden.add(this.host.excludeJobId);
    return jobs.filter((j) => !hidden.has(j.JobId));
  }

  private slotKey(slot: IMachineSlot | null): string {
    return slot ? `${slot.machineId}|${slot.startDate}|${slot.endDate}` : '';
  }
}
