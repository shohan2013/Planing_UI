import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { finalize } from 'rxjs';

import {
  IMachineJob,
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
  toLocalInput,
} from './machine-schedule.util';

type ScheduleTab = 'jobs' | 'free';

/**
 * Content of the NgbModal opened by "View schedule": the machine's jobs from now to its
 * last planned job, as stats, a day-by-day timeline and tables. If the step card already
 * has a slot, it is checked against the schedule and the earliest free slot that fits is
 * suggested. Closes with an IMachineSlotPick when the user picks a slot.
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
  readonly jobs = signal<IMachineJob[]>([]);
  /** "Now" is fixed when the schedule loads, so every figure uses the same instant. */
  readonly now = signal(Date.now());
  readonly tab = signal<ScheduleTab>('jobs');

  readonly hourTicks = ['00:00', '06:00', '12:00', '18:00', '24:00'];
  readonly formatDuration = formatDuration;

  readonly summary = computed(() => {
    const ctx = this.context();
    return buildSummary(this.jobs(), this.now(), ctx?.slotStart ?? null, ctx?.slotEnd ?? null);
  });
  readonly timeline = computed(() => buildTimeline(this.summary()));

  /** Opener passes the card's machine / step / slot, then the schedule is fetched. */
  init(context: IMachineScheduleContext): void {
    this.context.set(context);
    this.load();
  }

  load(): void {
    const ctx = this.context();
    if (!ctx) return;
    const now = Date.now();
    this.now.set(now);
    this.loading.set(true);
    this.error.set(false);
    this.service
      .GetMachineSchedule({
        BusinessFlowConfigureId: ctx.businessFlowConfigureId,
        MachineId: ctx.machineId,
        FromDate: toLocalInput(now),
        ExcludeJobId: ctx.excludeJobId,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        // The plan's own job (when editing) is never shown as booked or as a clash.
        next: (jobs) =>
          this.jobs.set(ctx.excludeJobId ? jobs.filter((j) => j.JobId !== ctx.excludeJobId) : jobs),
        error: () => {
          this.jobs.set([]);
          this.error.set(true);
        },
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
