import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { IBusinessFlowForPlanning } from 'src/app/core/model/MergedPlanning/business-flow-for-planning-model';
import { IMergedPlanningLine } from 'src/app/core/model/MergedPlanning/merged-planning-model';
import {
  IMachineOption,
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
  @Input() line: IMergedPlanningLine | null = null;
  @Input() machineOptions: IMachineOption[] = [];

  steps = PRODUCTION_STEPS;

  onStepSaved(step: string, data: IProcessStepInput): void {
    // TODO: wire this up to a service call to persist the step data
    console.log('Step saved:', data);
  }
}
