import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CdkDragHandle } from '@angular/cdk/drag-drop';

import { IProcessStepInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';

@Component({
  selector: 'app-process-step-from',
  standalone: true,
  imports: [ReactiveFormsModule, CdkDragHandle],
  templateUrl: './process-step-from.html',
  styleUrl: './process-step-from.scss',
})
export class ProcessStepFrom implements OnInit, OnChanges {
  @Input() lineId!: number;
  @Input() step!: IBusinessFlowForPlanning;
  @Input() machineOptions: IMachine[] = [];
  /** Seeds the form with an already-saved value (e.g. editing a saved plan) instead of starting blank. */
  @Input() initialValue: IProcessStepInput | null = null;

  @Output() formValueChange = new EventEmitter<IProcessStepInput | null>();

  form = new FormGroup({
    machineId: new FormControl<number | null>(0),

    startDate: new FormControl<string | null>(''),

    endDate: new FormControl<string | null>(''),
  });

  submitted = false;

  ngOnInit(): void {
    this.form.valueChanges.subscribe(() => {
      this.emitValue();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['step'] && this.step) {
      const seed = this.initialValue;

      this.form.reset(
        {
          machineId: seed?.machineId ?? 0,
          startDate: seed?.startDate ?? '',
          endDate: seed?.endDate ?? '',
        },
        {
          emitEvent: false,
        },
      );

      this.formValueChange.emit(this.dragData);
    }
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

  get isReadyToDrop(): boolean {
    return (
      !!this.machineNumber &&
      !!this.startDate &&
      !!this.endDate &&
      !this.isDateRangeInvalid
    );
  }

  get allocatedTimeBreakdown(): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null {
    if (!this.startDate || !this.endDate || this.isDateRangeInvalid) {
      return null;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    let totalSeconds = Math.floor(
      (end.getTime() - start.getTime()) / 1000,
    );

    if (totalSeconds < 0) {
      return null;
    }

    const days = Math.floor(totalSeconds / 86400);
    totalSeconds -= days * 86400;

    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds -= hours * 3600;

    const minutes = Math.floor(totalSeconds / 60);
    totalSeconds -= minutes * 60;

    const seconds = totalSeconds;

    return { days, hours, minutes, seconds };
  }

  get dragData(): IProcessStepInput | null {
    if (!this.isReadyToDrop) {
      return null;
    }

    return {
      lineId: this.lineId,
      stepId: this.step.Id,
      stepName: this.step.Name,
      machineId: this.machineNumber,
      startDate: this.startDate,
      endDate: this.endDate,
      // Placeholder — ProcessStepStateService.updateProcessStep assigns the
      // real position (append on add, preserved on edit) when this is stored.
      orderNo: this.initialValue?.orderNo ?? 0,
    };
  }

  private emitValue(): void {
    this.formValueChange.emit(this.dragData);
  }
}
