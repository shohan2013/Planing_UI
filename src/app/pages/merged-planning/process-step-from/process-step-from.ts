import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { IProcessStepInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';
import { ProcessStepStateService } from 'src/app/core/services/MergedPlanning/process-step-state-service';

@Component({
  selector: 'app-process-step-from',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './process-step-from.html',
  styleUrl: './process-step-from.scss',
})
export class ProcessStepFrom implements OnInit, OnChanges {
  @Input() lineId!: number;
  @Input() step!: IBusinessFlowForPlanning;
  @Input() machineOptions: IMachine[] = [];

  form = new FormGroup({
    enabled: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    machineId: new FormControl<number | null>(0),

    startDate: new FormControl<string | null>(''),

    endDate: new FormControl<string | null>(''),
  });

  submitted = false;

  constructor(private processStepStateService: ProcessStepStateService) {}

  ngOnInit(): void {
    this.updateFormEnabledState();

    this.form.controls.enabled.valueChanges.subscribe((enabled) => {
      this.updateFormEnabledState();

      if (!enabled) {
        // Remove the step from shared state
        this.processStepStateService.removeProcessStep(
          this.lineId,
          this.step.Id,
        );

        return;
      }

      // If enabled, let the normal form validation/state
      // logic decide whether it should be stored.
      this.updateState();
    });

    this.form.valueChanges.subscribe(() => {
      this.updateState();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['step'] && this.step) {
      this.form.patchValue(
        {
          enabled: false,
          machineId: 0,
          startDate: '',
          endDate: '',
        },
        {
          emitEvent: false,
        },
      );

      this.updateFormEnabledState();

      // Make sure a previous state for this
      // line/step doesn't remain.
      this.processStepStateService.removeProcessStep(this.lineId, this.step.Id);
    }
  }

  get enabled(): boolean {
    return this.form.controls.enabled.value;
  }

  get machineNumber(): number {
    return this.form.controls.machineId.value ?? 0;
  }

  get startDate(): string {
    return this.form.controls.startDate.value ?? '';
  }

  get endDate(): string {
    return this.form.controls.endDate.value ?? '';
  }

  get isDateRangeInvalid(): boolean {
    if (!this.startDate || !this.endDate) {
      return false;
    }

    return this.endDate < this.startDate;
  }

  get totalAllocatedTime(): string {
    if (!this.startDate || !this.endDate || this.isDateRangeInvalid) {
      return '';
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    const days =
      Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return `${days} day${days === 1 ? '' : 's'}`;
  }

  private updateFormEnabledState(): void {
    if (this.enabled) {
      this.form.controls.machineId.enable({
        emitEvent: false,
      });

      this.form.controls.startDate.enable({
        emitEvent: false,
      });

      this.form.controls.endDate.enable({
        emitEvent: false,
      });
    } else {
      this.form.controls.machineId.disable({
        emitEvent: false,
      });

      this.form.controls.startDate.disable({
        emitEvent: false,
      });

      this.form.controls.endDate.disable({
        emitEvent: false,
      });
    }
  }

  private updateState(): void {
    if (!this.enabled) {
      return;
    }

    if (!this.startDate || !this.endDate || !this.machineNumber) {
      return;
    }

    if (this.isDateRangeInvalid) {
      return;
    }

    const value = this.form.getRawValue();

    const stepsData: IProcessStepInput = {
      lineId: this.lineId,
      stepId: this.step.Id,
      stepName: this.step.Name,
      machineId: value.machineId,
      startDate: value.startDate,
      endDate: value.endDate,
    };
    //console.log(this.form);
    this.processStepStateService.updateProcessStep(stepsData);
  }
}
