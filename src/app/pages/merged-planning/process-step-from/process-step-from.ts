import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IProcessStepInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';

@Component({
  selector: 'app-process-step-from',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './process-step-from.html',
  styleUrl: './process-step-from.scss',
})
export class ProcessStepFrom {
  @Input() lineId!: number;
  @Input() stepName!: string;
  @Output() save = new EventEmitter<IProcessStepInput>();

  startDate: string | null = null;
  endDate: string | null = null;
  machineNumber = '';

  submitted = false;

  get isDateRangeInvalid(): boolean {
    return !!(this.startDate && this.endDate && this.endDate < this.startDate);
  }

  onSave(): void {
    this.submitted = true;

    if (!this.startDate || !this.endDate || !this.machineNumber.trim()) {
      return;
    }

    if (this.isDateRangeInvalid) {
      return;
    }

    this.save.emit({
      lineId: this.lineId,
      stepName: this.stepName,
      startDate: this.startDate,
      endDate: this.endDate,
      machineNumber: this.machineNumber.trim(),
    });
  }
}
