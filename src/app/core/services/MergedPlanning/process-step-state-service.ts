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
        const nextOrderNo =
          steps.filter((x) => x.lineId === step.lineId).length + 1;
        return [...steps, { ...step, orderNo: nextOrderNo }];
      }

      return steps.map((x, i) =>
        i === index ? { ...step, orderNo: x.orderNo } : x,
      );
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
    this._processSteps.update((steps) => {
      const remaining = steps.filter(
        (x) => !(x.lineId === lineId && x.stepId === stepId),
      );

      let orderCounter = 0;
      return remaining.map((x) =>
        x.lineId === lineId ? { ...x, orderNo: ++orderCounter } : x,
      );
    });
  }

  removeStepsForLine(lineId: number): void {
    this._processSteps.update((steps) =>
      steps.filter((x) => x.lineId !== lineId),
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
      // Sort by orderNo first — the backing array's insertion order can
      // drift from display order (e.g. after a removal reassigns orderNo
      // without physically reordering the array), while previousIndex/
      // currentIndex from CDK always refer to the rendered (orderNo) order.
      // Indexing into an out-of-sync array here moves the wrong step and
      // the next render then has to silently correct it — seen as a stray
      // reorder animation replaying after the drop.
      const lineSteps = steps
        .filter((x) => x.lineId === lineId)
        .sort((a, b) => a.orderNo - b.orderNo);
      const otherSteps = steps.filter((x) => x.lineId !== lineId);

      moveItemInArray(lineSteps, previousIndex, currentIndex);

      const reindexedLineSteps = lineSteps.map((step, i) => ({
        ...step,
        orderNo: i + 1,
      }));

      return [...otherSteps, ...reindexedLineSteps];
    });
  }

  clear(): void {
    this._processSteps.set([]);
  }
}
