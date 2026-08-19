import {
  Component,
  EventEmitter,
  input,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import { IMergedPlanningLine } from 'src/app/core/model/MergedPlanning/merged-planning-model';
import { ProcessStepFrom } from '../process-step-from/process-step-from';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { Subject } from 'rxjs';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';

@Component({
  selector: 'app-production-steps',
  imports: [ProcessStepFrom],
  templateUrl: './production-steps.html',
  styleUrl: './production-steps.scss',
})
export class ProductionSteps {
  @Input() line: IMergedPlanningLine | null = null;
  @Input() machineOptions: IMachine[] = [];

  steps = input<IBusinessFlowForPlanning[]>([]);
  isLoading = input<boolean>(true);
  loadError = input<boolean>(false);

  @Output() GetSteps = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  constructor(private CommonService: CommonService) {}

  // onStepSaved(step: string, data: IProcessStepInput): void {
  //   console.log('Step saved:', data);
  // }

  GetProductionSteps() {
    this.GetSteps.emit();
  }
}
