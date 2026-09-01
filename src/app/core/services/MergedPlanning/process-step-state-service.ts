import { Injectable, signal } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { IProcessStepInput } from '../../model/MergedPlanning/planning-processes-model';

@Injectable({
  providedIn: 'root',
})
export class ProcessStepStateService {
  private readonly _processSteps = signal<IProcessStepInput[]>([]);
  private readonly _recentlyAddedStepIds = signal<Set<number>>(new Set());

  readonly processSteps = this._processSteps.asReadonly();
  readonly recentlyAddedStepIds = this._recentlyAddedStepIds.asReadonly();

  updateProcessStep(step: IProcessStepInput): void {
    this._processSteps.update((steps) => {
      const index = steps.findIndex(
        (x) => x.lineId === step.lineId && x.stepId == step.stepId,
      );

      if (index === -1) {
        this.markRecentlyAdded(step.stepId);
        return [...steps, step];
      }

      return steps.map((x, i) => (i === index ? step : x));
    });
  }

  // Marks a step as "just added" so the desk card entrance animation can be
  // scoped to genuine additions only, never to a reorder-triggered DOM move
  // (which would otherwise replay the keyframe animation and flash the card).
  private markRecentlyAdded(stepId: number): void {
    this._recentlyAddedStepIds.update((ids) => new Set(ids).add(stepId));

    setTimeout(() => {
      this._recentlyAddedStepIds.update((ids) => {
        if (!ids.has(stepId)) return ids;
        const next = new Set(ids);
        next.delete(stepId);
        return next;
      });
    }, 200);
  }

  removeProcessStep(lineId: number, stepId: number): void {
    this._processSteps.update((steps) =>
      steps.filter((x) => !(x.lineId === lineId && x.stepId === stepId)),
    );
  }

  getStepsForLine(lineId: number): IProcessStepInput[] {
    return this._processSteps().filter((x) => x.lineId === lineId);
  }

  reorderWithinLine(
    lineId: number,
    previousIndex: number,
    currentIndex: number,
  ): void {
    this._processSteps.update((steps) => {
      const lineSteps = steps.filter((x) => x.lineId === lineId);
      const otherSteps = steps.filter((x) => x.lineId !== lineId);

      moveItemInArray(lineSteps, previousIndex, currentIndex);

      return [...otherSteps, ...lineSteps];
    });
  }

  clear(): void {
    this._processSteps.set([]);
  }
}
