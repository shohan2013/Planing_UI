import { Injectable, signal } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { IProcessStepInput } from '../../model/MergedPlanning/planning-processes-model';

@Injectable({
  providedIn: 'root',
})
export class ProcessStepStateService {
  private readonly _processSteps = signal<IProcessStepInput[]>([]);

  readonly processSteps = this._processSteps.asReadonly();

  updateProcessStep(step: IProcessStepInput): void {
    this._processSteps.update((steps) => {
      const index = steps.findIndex(
        (x) => x.lineId === step.lineId && x.stepId == step.stepId,
      );

      if (index === -1) return [...steps, step];

      return steps.map((x, i) => (i === index ? step : x));
    });
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
