import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { IMergedPlanningLine } from 'src/app/core/model/MergedPlanning/merged-planning-model';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';
import { IProcessStepInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { ProcessStepStateService } from 'src/app/core/services/MergedPlanning/process-step-state-service';

@Component({
  selector: 'app-planning-desk',
  standalone: true,
  imports: [DragDropModule],
  templateUrl: './planning-desk.html',
  styleUrl: './planning-desk.scss',
})
export class PlanningDesk {
  @Input() lines: IMergedPlanningLine[] = [];
  @Input() machineOptions: IMachine[] = [];
  @Input() isSaving = false;
  @Input() isDragging = false;

  @Output() save = new EventEmitter<void>();

  constructor(public processStepState: ProcessStepStateService) {}

  deskListIdFor(lineId: number): string {
    return 'desk-list-' + lineId;
  }

  stepsForLine(lineId: number): IProcessStepInput[] {
    return this.processStepState.getStepsForLine(lineId);
  }

  totalPlannedSteps(): number {
    return this.processStepState.processSteps().length;
  }

  onDrop(event: CdkDragDrop<IProcessStepInput[]>, lineId: number): void {
    if (event.previousIndex === event.currentIndex) return;

    this.processStepState.reorderWithinLine(
      lineId,
      event.previousIndex,
      event.currentIndex,
    );
  }

  removeStep(lineId: number, stepId: number): void {
    this.processStepState.removeProcessStep(lineId, stepId);
  }

  getMachineName(machineId: number): string {
    return (
      this.machineOptions.find((m) => m.Id === machineId)?.Name ??
      `#${machineId}`
    );
  }

  getAllocatedTimeBreakdown(step: IProcessStepInput): {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null {
    if (!step.startDate || !step.endDate) return null;

    const start = new Date(step.startDate);
    const end = new Date(step.endDate);

    let totalSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
    if (totalSeconds < 0) return null;

    const days = Math.floor(totalSeconds / 86400);
    totalSeconds -= days * 86400;

    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds -= hours * 3600;

    const minutes = Math.floor(totalSeconds / 60);
    totalSeconds -= minutes * 60;

    const seconds = totalSeconds;

    return { days, hours, minutes, seconds };
  }
}
