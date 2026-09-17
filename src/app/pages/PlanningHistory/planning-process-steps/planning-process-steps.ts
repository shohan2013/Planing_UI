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
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
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
  imports: [FormsModule, ProcessStepFrom, DragDropModule],
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
      this.savedSteps.forEach((saved, index) => {
        this.processStepStateService.updateProcessStep({
          lineId: this.lineId,
          stepId: saved.StepId,
          stepName: saved.StepName,
          machineId: saved.MachineId,
          startDate: saved.StartDate,
          endDate: saved.EndDate,
          orderNo: saved.OrderNo ?? index + 1,
        });
      });

      this.activeStepIds.set(this.savedSteps.map((s) => s.StepId));
    }
  }

  get activeSteps(): IBusinessFlowForPlanning[] {
    const ids = new Set(this.activeStepIds());
    const orderNoFor = new Map(
      this.processStepStateService
        .getStepsForLine(this.lineId)
        .map((x) => [x.stepId, x.orderNo]),
    );

    return this.steps
      .filter((s) => ids.has(s.Id))
      .sort(
        (a, b) =>
          (orderNoFor.get(a.Id) ?? Number.MAX_SAFE_INTEGER) -
          (orderNoFor.get(b.Id) ?? Number.MAX_SAFE_INTEGER),
      );
  }

  onDrop(event: CdkDragDrop<IBusinessFlowForPlanning[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    this.processStepStateService.reorderWithinLine(
      this.lineId,
      event.previousIndex,
      event.currentIndex,
    );
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

  // A card only carries state here once its form is fully valid (see
  // onFormChange) — so its presence doubles as the "ready" flag that gates
  // both dragging and inclusion in the save payload.
  isStepReady(stepId: number): boolean {
    return this.initialValueFor(stepId) !== null;
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

  onFormChange(value: IProcessStepInput | null, stepId: number): void {
    if (value) {
      this.processStepStateService.updateProcessStep(value);
    } else if (this.isStepReady(stepId)) {
      // Was valid, isn't any more (e.g. a date got cleared) — drop it from
      // state so it stops being draggable and stops going out in the save
      // payload until it's valid again.
      this.processStepStateService.removeProcessStep(this.lineId, stepId);
    }
  }
}
