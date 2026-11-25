import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs';

import {
  IMachineJob,
  IMachineRef,
  IMachineScheduleContext,
  IMachineSlotPick,
} from 'src/app/core/model/MergedPlanning/machine-schedule-model';
import { MachineScheduleService } from 'src/app/core/services/MergedPlanning/machine-schedule-service';

import {
  IInterval,
  buildSummary,
  buildTimeline,
  ceilMinute,
  formatDuration,
  overlapMs,
  parseLocal,
  toLocalInput,
} from './machine-schedule.util';

type ScheduleTab = 'jobs' | 'free';
/** A single machine, or 'all' = the selected machines together. */
type MachineView = number | 'all';

/** A machine pill: its name and how many of its jobs clash with the card's slot. */
interface IMachinePill {
  machine: IMachineRef;
  jobCount: number;
  conflictCount: number;
}

/**
 * Content of the NgbModal opened by "View schedule": the selected machines' jobs from now
 * to their last planned job (one request for all of them), as stats, a day-by-day
 * timeline and tables. With several machines, "All selected" combines them: a slot is
 * free there only when every machine is free, since they all share the step's slot. Each
 * machine can also be viewed alone. If the step card already has a slot, it is checked
 * against the schedule and the earliest free slot that fits is suggested. Closes with an
 * IMachineSlotPick when the user picks a slot.
 */
@Component({
  selector: 'app-machine-schedule-dialog',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './machine-schedule-dialog.html',
  styleUrl: './machine-schedule-dialog.scss',
})
export class MachineScheduleDialog {
  readonly modal = inject(NgbActiveModal);
  private readonly service = inject(MachineScheduleService);
  private readonly destroyRef = inject(DestroyRef);

  readonly context = signal<IMachineScheduleContext | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  /** Jobs of every selected machine. */
  readonly allJobs = signal<IMachineJob[]>([]);
  readonly view = signal<MachineView>('all');

  readonly machines = computed(() => this.context()?.machines ?? []);
  readonly isMulti = computed(() => this.machines().length > 1);
  readonly isAllView = computed(() => this.view() === 'all');

  /** Jobs of the current view: every machine, or just the chosen one. */
  readonly jobs = computed(() => {
    const view = this.view();
    const jobs = this.allJobs();
    return view === 'all' ? jobs : jobs.filter((j) => j.MachineId === view);
  });

  /** Machine shown in the title: the chosen one, or the only one. */
  readonly currentMachine = computed<IMachineRef | null>(() => {
    const view = this.view();
    const machines = this.machines();
    if (view !== 'all') return machines.find((m) => m.Id === view) ?? null;
    return machines.length === 1 ? machines[0] : null;
  });

  /** One pill per machine, with its upcoming jobs and clashes with the card's slot. */
  readonly pills = computed<IMachinePill[]>(() => {
    const ctx = this.context();
    const from = this.from();
    const s = parseLocal(ctx?.slotStart);
    const e = parseLocal(ctx?.slotEnd);
    const slot = s !== null && e !== null && e > s ? { start: s, end: e } : null;
    return this.machines().map((machine) => {
      const jobs = this.allJobs()
        .filter((j) => j.MachineId === machine.Id)
        .map((j) => ({ start: parseLocal(j.StartDate), end: parseLocal(j.EndDate) }))
        .filter((j) => j.start !== null && j.end !== null && j.end > from);
      return {
        machine,
        jobCount: jobs.length,
        conflictCount: slot ? jobs.filter((j) => overlapMs(slot, j) > 0).length : 0,
      };
    });
  });
  /** "Now" is fixed when the schedule loads, so every figure uses the same instant. */
  readonly now = signal(Date.now());
  /**
   * Start of the schedule window: the card's requested start date/time (jobs
   * are fetched and shown from there), or `now` when no start is set.
   */
  readonly from = computed(() => parseLocal(this.context()?.slotStart) ?? this.now());
  readonly tab = signal<ScheduleTab>('jobs');

  readonly hourTicks = ['00:00', '06:00', '12:00', '18:00', '24:00'];
  readonly formatDuration = formatDuration;

  readonly summary = computed(() => {
    const ctx = this.context();
    return buildSummary(
      this.jobs(),
      this.now(),
      ctx?.slotStart ?? null,
      ctx?.slotEnd ?? null,
      this.from(),
    );
  });
  readonly timeline = computed(() => buildTimeline(this.summary(), this.isMulti() && this.isAllView()));

  /** Opener passes the card's machines / step / slot, then the schedule is fetched. */
  init(context: IMachineScheduleContext): void {
    this.context.set(context);
    const focus = context.focusMachineId;
    const machines = context.machines ?? [];
    this.view.set(
      focus && machines.some((m) => m.Id === focus)
        ? focus
        : machines.length === 1
          ? machines[0].Id
          : 'all',
    );
    this.load();
  }

  showMachine(view: MachineView): void {
    this.view.set(view);
  }

  machineName(machineId: number): string {
    return this.machines().find((m) => m.Id === machineId)?.Name ?? `Machine #${machineId}`;
  }

  load(): void {
    const ctx = this.context();
    if (!ctx) return;
    const now = Date.now();
    this.now.set(now);
    this.loading.set(true);
    this.error.set(false);
    // Fetch from the card's requested start date/time (`from`); the current
    // time is only the fallback when no start is set yet.
    this.service
      .GetMachineSchedule({
        BusinessFlowConfigureId: ctx.businessFlowConfigureId,
        MachineIds: ctx.machines.map((m) => m.Id),
        FromDate: toLocalInput(this.from()),
        ExcludeJobId: ctx.excludeJobId,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        // The plan's own job (when editing) is never shown as booked or as a clash; its
        // other saved jobs are replaced by their desk version.
        next: (jobs) => {
          const hidden = new Set(ctx.hiddenJobIds ?? []);
          if (ctx.excludeJobId) hidden.add(ctx.excludeJobId);
          this.allJobs.set(
            this.withMachine([...jobs.filter((j) => !hidden.has(j.JobId)), ...(ctx.deskJobs ?? [])]),
          );
        },
        error: () => {
          // Unsaved desk jobs are still known.
          this.allJobs.set(this.withMachine(ctx.deskJobs ?? []));
          this.error.set(true);
        },
      });
  }

  /**
   * Fills each job's machine name; a job without MachineId (an API that doesn't send it
   * yet) belongs to the only machine when just one was asked for.
   */
  private withMachine(jobs: IMachineJob[]): IMachineJob[] {
    const machines = this.machines();
    return jobs.map((job) => {
      const machineId = job.MachineId || (machines.length === 1 ? machines[0].Id : 0);
      return {
        ...job,
        MachineId: machineId,
        MachineName: job.MachineName || (machineId ? this.machineName(machineId) : null),
      };
    });
  }

  /** Length of the card's slot, used to offer free gaps that fit it. */
  readonly slotDurationMs = computed(() => {
    const slot = this.summary().slot;
    return slot ? slot.end - slot.start : null;
  });

  /** Free gap -> a slot of the card's length at its start, if it fits. */
  fitInGap(gap: IInterval): IInterval | null {
    const d = this.slotDurationMs();
    if (!d) return null;
    return gap.end - gap.start >= d ? { start: gap.start, end: gap.start + d } : null;
  }

  /** Picks a slot; the start is rounded up to a whole minute (inputs have minute precision). */
  use(slot: IInterval): void {
    const start = ceilMinute(slot.start);
    const end = start + (slot.end - slot.start);
    const pick: IMachineSlotPick = { startDate: toLocalInput(start), endDate: toLocalInput(end) };
    this.modal.close(pick);
  }
}
