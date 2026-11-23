import { Injectable, inject, signal } from '@angular/core';

import { IMachineJob } from '../../model/MergedPlanning/machine-schedule-model';
import { IProcessStepInput } from '../../model/MergedPlanning/planning-processes-model';
import { ItemPlanningStateService } from './item-planning-state-service';
import { ProcessStepStateService } from './process-step-state-service';

/** What a planning line contributes to an unsaved job's description. */
export interface IDeskJobLine {
  Id: number;
  ProductName: string | null;
  UOM: string | null;
  Quantity: number;
  /** Saved steps of the line (edit view only); their Id is the saved job id. */
  Steps?: { Id: number }[] | null;
}

/** A desk step, identified by its line and planning step. */
export interface IDeskStepRef {
  lineId: number;
  stepId: number;
}

/**
 * Machine jobs from the Planning Desk that aren't saved yet, so availability checks and
 * the schedule see them alongside the API's jobs. Provided next to ProcessStepStateService
 * by the planning views (merged planning, planning-history edit), which pass their lines.
 */
@Injectable()
export class DeskMachineJobsService {
  private readonly processStepState = inject(ProcessStepStateService);
  private readonly itemPlanningState = inject(ItemPlanningStateService);

  private readonly lines = signal<IDeskJobLine[]>([]);

  setLines(lines: IDeskJobLine[]): void {
    this.lines.set(lines ?? []);
  }

  /**
   * Saved jobs of the plan being edited. The desk holds their current (possibly changed
   * or removed) version, so the API's copy of them is ignored.
   */
  savedJobIds(): Set<number> {
    return new Set(
      this.lines().flatMap((line) => (line.Steps ?? []).map((s) => s.Id)).filter((id) => !!id),
    );
  }

  /** Desk steps planned on `machineId` (with both dates), except the asking step itself. */
  jobsOnMachine(machineId: number, self: IDeskStepRef): IMachineJob[] {
    if (!machineId) return [];
    return this.processStepState
      .processSteps()
      .filter(
        (step) =>
          (step.machineIds ?? []).includes(machineId) &&
          !!step.startDate &&
          !!step.endDate &&
          !(step.lineId === self.lineId && step.stepId === self.stepId),
      )
      .map((step) => this.toJob(step, machineId));
  }

  /** Desk steps on any of `machineIds` that overlap [startDate, endDate]. */
  overlappingJobs(machineIds: number[], startDate: string, endDate: string, self: IDeskStepRef): IMachineJob[] {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    return machineIds.flatMap((machineId) =>
      this.jobsOnMachine(machineId, self).filter(
        (job) => new Date(job.StartDate).getTime() < end && new Date(job.EndDate).getTime() > start,
      ),
    );
  }

  private toJob(step: IProcessStepInput, machineId: number): IMachineJob {
    const line = this.lines().find((l) => l.Id === step.lineId);
    const item = this.itemPlanningState.items().find((x) => x.LineId === step.lineId);
    return {
      // Negative, so it never collides with a saved job id.
      // Machine is part of the id: one desk step can run on several machines.
      JobId: -(step.lineId * 100000000 + step.stepId * 10000 + machineId),
      JobNo: 'Unsaved',
      MachineId: machineId,
      ProductName: `${line?.ProductName ?? 'This plan'} · ${step.stepName}`,
      UOM: line?.UOM ?? '',
      PlannedQty: item?.TakenQty ?? line?.Quantity ?? 0,
      StartDate: step.startDate!,
      EndDate: step.endDate!,
    };
  }
}
