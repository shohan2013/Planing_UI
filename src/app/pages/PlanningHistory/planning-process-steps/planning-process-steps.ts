import {
  afterNextRender,
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';
import { IProcessStepInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { IPlanningHistoryStep } from 'src/app/core/model/PlanningHistory/planning-history-model';
import { ProcessStepStateService } from 'src/app/core/services/MergedPlanning/process-step-state-service';
import { ProcessStepFrom } from '../../MergedPlanning/process-step-from/process-step-from';

/**
 * Renders the process steps already saved for one plan line as editable
 * cards, and lets the user attach additional steps to the same line. Unlike
 * app-production-steps (used by the merge/split drag-and-drop desk), there
 * is no drag target here — steps are added/edited/removed directly in place,
 * matching the plain "populate saved data into a form" style of the older
 * merged-planning-view layout.
 */
@Component({
  selector: 'app-planning-process-steps',
  standalone: true,
  imports: [FormsModule, ProcessStepFrom],
  templateUrl: './planning-process-steps.html',
  styleUrl: './planning-process-steps.scss',
})
export class PlanningProcessSteps implements OnChanges {
  @Input({ required: true }) lineId!: number;
  @Input() steps: IBusinessFlowForPlanning[] = [];
  @Input() machineOptions: IMachine[] = [];
  @Input() isLoading = false;
  @Input() loadError = false;
  @Input() savedSteps: IPlanningHistoryStep[] = [];

  @Output() GetSteps = new EventEmitter<void>();

  @ViewChild('cardsContainer') cardsContainer?: ElementRef<HTMLDivElement>;

  activeStepIds = signal<number[]>([]);
  newStepId: number | null = null;

  constructor(
    public processStepStateService: ProcessStepStateService,
    private injector: Injector,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['savedSteps'] && this.savedSteps?.length) {
      for (const saved of this.savedSteps) {
        this.processStepStateService.updateProcessStep({
          lineId: this.lineId,
          stepId: saved.stepId,
          stepName: saved.stepName,
          machineId: saved.machineId,
          startDate: saved.startDate,
          endDate: saved.endDate,
        });
      }

      this.activeStepIds.set(this.savedSteps.map((s) => s.stepId));
    }
  }

  get activeSteps(): IBusinessFlowForPlanning[] {
    const ids = new Set(this.activeStepIds());
    return this.steps.filter((s) => ids.has(s.Id));
  }

  get availableStepsToAdd(): IBusinessFlowForPlanning[] {
    const ids = new Set(this.activeStepIds());
    return this.steps.filter((s) => !ids.has(s.Id));
  }

  initialValueFor(stepId: number): IProcessStepInput | null {
    return (
      this.processStepStateService
        .getStepsForLine(this.lineId)
        .find((x) => x.stepId === stepId) ?? null
    );
  }

  addStep(): void {
    if (this.newStepId === null) return;

    this.activeStepIds.update((ids) =>
      ids.includes(this.newStepId!) ? ids : [...ids, this.newStepId!],
    );
    this.newStepId = null;

    // New cards are appended at the end of the horizontally-scrolling row —
    // bring the just-added one into view instead of leaving the user to
    // hunt for it themselves.
    afterNextRender(
      () => {
        const el = this.cardsContainer?.nativeElement;
        el?.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
      },
      { injector: this.injector },
    );
  }

  removeStep(stepId: number): void {
    this.activeStepIds.update((ids) => ids.filter((id) => id !== stepId));
    this.processStepStateService.removeProcessStep(this.lineId, stepId);
  }

  onFormChange(value: IProcessStepInput | null): void {
    if (value) {
      this.processStepStateService.updateProcessStep(value);
    }
  }
}
