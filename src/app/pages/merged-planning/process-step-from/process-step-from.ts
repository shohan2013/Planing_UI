import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IProcessStepInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';

@Component({
  selector: 'app-process-step-from',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './process-step-from.html',
  styleUrl: './process-step-from.scss',
})
export class ProcessStepFrom {
  @Input() lineId!: number;
  @Input() step: IBusinessFlowForPlanning;
  @Input() machineOptions: IMachine[] = [];
  @Output() save = new EventEmitter<IProcessStepInput>();

  startDate: string | null = null;
  endDate: string | null = null;
  machineNumber = '';
  enabled = false;

  submitted = false;
  saved = false;

  get isDateRangeInvalid(): boolean {
    return !!(this.startDate && this.endDate && this.endDate < this.startDate);
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

  onFieldChange(): void {
    // Any edit after a save invalidates the "saved" state until re-saved
    this.saved = false;
  }

  onEnabledChange(): void {
    this.submitted = false;
    this.saved = false;
  }

  onSave(): void {
    if (!this.enabled) return;

    this.submitted = true;

    if (!this.startDate || !this.endDate || !this.machineNumber.trim()) {
      return;
    }

    if (this.isDateRangeInvalid) {
      return;
    }

    this.saved = true;

    this.save.emit({
      lineId: this.lineId,
      stepName: this.step.Name,
      startDate: this.startDate,
      endDate: this.endDate,
      machineNumber: this.machineNumber.trim(),
    });
  }
}
