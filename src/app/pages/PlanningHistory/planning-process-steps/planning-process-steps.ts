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
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
} from '@angular/cdk/drag-drop';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';
import { IProcessStepInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { IPlanningHistoryStep } from 'src/app/core/model/PlanningHistory/planning-history-model';
import { ProcessStepStateService } from 'src/app/core/services/MergedPlanning/process-step-state-service';
import { ProcessStepFrom } from '../../MergedPlanning/process-step-from/process-step-from';
import { MachineAvailabilityState } from '../../MergedPlanning/process-step-from/machine-availability';

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
  /** Machines per production step, keyed by step (BusinessFlowConfigure) Id. */
  @Input() machinesByStep: Record<number, IMachine[]> = {};
  @Input() isLoading = false;
  @Input() loadError = false;
  @Input() savedSteps: IPlanningHistoryStep[] = [];

  @Output() GetSteps = new EventEmitter<void>();
  /** Emits a newly added step's Id so its machines can be loaded. */
  @Output() stepAdded = new EventEmitter<number>();
  /** A step card's machine availability changed ('idle' once the card is removed). */
  @Output() stepAvailabilityChange = new EventEmitter<{
    stepId: number;
    state: MachineAvailabilityState;
  }>();

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
          machineIds: [...(saved.MachineIds ?? [])],
          startDate: saved.StartDate,
          endDate: saved.EndDate,
          orderNo: saved.OrderNo ?? index + 1,
        });
      });

      this.activeStepIds.set(
        this.savedSteps
          .map((saved, index) => ({ id: saved.StepId, order: saved.OrderNo ?? index + 1 }))
          .sort((a, b) => a.order - b.order)
          .map((x) => x.id),
      );
      this.syncOrder();
    }
  }

  /**
   * Cards render in activeStepIds order. That list (not the state service) is
   * the source of truth for position, because a card leaves the state service
   * whenever it's not ready (busy machine, availability check running, date
   * cleared). Ordering by state orderNo used to push such a card to the end.
   */
  get activeSteps(): IBusinessFlowForPlanning[] {
    const byId = new Map(this.steps.map((s) => [s.Id, s]));
    return this.activeStepIds()
      .map((id) => byId.get(id))
      .filter((s): s is IBusinessFlowForPlanning => !!s);
  }

  onDrop(event: CdkDragDrop<IBusinessFlowForPlanning[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    // CDK indexes refer to the rendered cards (activeSteps), so move within
    // that list, then renumber the stored steps to match.
    const ids = this.activeSteps.map((s) => s.Id);
    moveItemInArray(ids, event.previousIndex, event.currentIndex);
    const notRendered = this.activeStepIds().filter((id) => !ids.includes(id));
    this.activeStepIds.set([...ids, ...notRendered]);
    this.syncOrder();
  }

  /** Renumbers stored steps (orderNo, sent on save) to follow the card order. */
  private syncOrder(): void {
    this.processStepStateService.setLineOrder(this.lineId, this.activeStepIds());
  }

  get availableStepsToAdd(): IBusinessFlowForPlanning[] {
    const ids = new Set(this.activeStepIds());
    return this.steps.filter((s) => !ids.has(s.Id));
  }

  machinesForStep(stepId: number): IMachine[] {
    return this.machinesByStep[stepId] ?? [];
  }

  /** The saved job (ProductionPlanConfigure Id) of a step, so its own booking isn't a clash. */
  savedJobIdFor(stepId: number): number | null {
    return this.savedSteps.find((s) => s.StepId === stepId)?.Id ?? null;
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

    this.stepAdded.emit(this.newStepId);
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
    this.syncOrder();
    // A removed card no longer blocks saving.
    this.stepAvailabilityChange.emit({ stepId, state: 'idle' });
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
    // Re-added steps are appended with the last orderNo; put every stored
    // step back at its card's position.
    this.syncOrder();
  }
}
