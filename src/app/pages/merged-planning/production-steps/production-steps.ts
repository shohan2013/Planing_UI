import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { IBusinessFlowForPlanning } from 'src/app/core/model/MergedPlanning/business-flow-for-planning-model';
import { IMergedPlanningLine } from 'src/app/core/model/MergedPlanning/merged-planning-model';
import {
  IProcessStepInput,
  PRODUCTION_STEPS,
} from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { ProcessStepFrom } from '../process-step-from/process-step-from';

@Component({
  selector: 'app-production-steps',
  imports: [ProcessStepFrom],
  templateUrl: './production-steps.html',
  styleUrl: './production-steps.scss',
})
export class ProductionSteps {
  @Input() isOpen = false;
  @Input() line: IMergedPlanningLine | null = null;
  @Output() closeView = new EventEmitter<void>();
  //steps = signal<IBusinessFlowForPlanning>(null);

  steps = PRODUCTION_STEPS;

  // Which step's input form is currently expanded
  activeStep = signal<string | null>(null);

  // Steps that already have saved data, for the check-mark indicator
  savedSteps = signal<Set<string>>(new Set());

  toggleStep(step: string): void {
    this.activeStep.set(this.activeStep() === step ? null : step);
  }

  onStepSaved(step: string, data: IProcessStepInput): void {
    // TODO: wire this up to a service call to persist the step data
    console.log('Step saved:', data);

    const updated = new Set(this.savedSteps());
    updated.add(step);
    this.savedSteps.set(updated);
    this.activeStep.set(null);
  }

  close(): void {
    this.activeStep.set(null);
    this.closeView.emit();
  }
}
