import { Injectable, signal } from '@angular/core';
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

  clear(): void {
    this._processSteps.set([]);
  }
}
