import {
  Component,
  EventEmitter,
  input,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CdkDragEnd,
  CdkDragMove,
  CdkDragRelease,
  DragDropModule,
} from '@angular/cdk/drag-drop';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import { IMergedPlanningLine } from 'src/app/core/model/MergedPlanning/merged-planning-model';
import { ProcessStepFrom } from '../process-step-from/process-step-from';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';
import { IProcessStepInput } from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { ProcessStepStateService } from 'src/app/core/services/MergedPlanning/process-step-state-service';

@Component({
  selector: 'app-production-steps',
  standalone: true,
  imports: [ProcessStepFrom, FormsModule, DragDropModule],
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
  @Output() dragStateChange = new EventEmitter<boolean>();

  selectedStepId = signal<number | null>(null);
  pendingFormValue: IProcessStepInput | null = null;

  /**
   * Suppresses the wrapper's visibility once a drop lands on the Desk.
   * CDK has no drop-list target for this freestanding cdkDrag (see class
   * doc below), so it always plays its own snap-back animation on drag end
   * regardless of outcome. On a successful drop the app removes this form
   * (selectedStepId reset) and creates a separate desk-card instead — but
   * that removal happens on the next change-detection pass, after CDK has
   * already started animating the original element back to its origin.
   * Without this flag the user briefly sees that snap-back travel across/
   * behind the Planning Desk panel, reading as a duplicated/copied card.
   * Set synchronously in onFormDragEnded, before CDK's own reset kicks in.
   */
  dropSucceeded = signal(false);

  private hoveredDropTarget: HTMLElement | null = null;

  constructor(public processStepStateService: ProcessStepStateService) {}

  /**
   * The wrapping cdkDropList exists only so CDK builds its floating "global"
   * preview clone (see cdkDragPreviewContainer="global" in the template) —
   * that clone is what escapes .mpv-items-col's overflow clipping during the
   * drag. Actual drop handling stays hit-test based (onFormDragEnded), so no
   * other draggable should ever be accepted into this single-item list.
   */
  denyEnter = (): boolean => false;

  /**
   * CDK's connected cdkDropList transfer doesn't reliably register when the
   * draggable and the drop list live in different components' templates (row
   * card vs. Planning Desk sidebar), so dropping is resolved by hit-testing
   * the cursor against the Desk panel itself rather than CDK's connected-list
   * transfer event. The card already carries its own lineId (pendingFormValue
   * is built from this row), so the item it belongs to never needs to be
   * "aimed at" — dropping anywhere on the Desk is enough; it attaches to this
   * row's own item automatically, same as before.
   */
  onFormDragMoved(event: CdkDragMove): void {
    const { x, y } = event.pointerPosition;
    const target = this.findDeskAt(x, y);

    if (target === this.hoveredDropTarget) return;

    this.hoveredDropTarget?.classList.remove('desk-drag-hover');
    target?.classList.add('desk-drag-hover');
    this.hoveredDropTarget = target;
  }

  /**
   * .ps-active-form carries a real cdkDropList (see the template), so CDK
   * treats this drag as having a drop container of its own — even though
   * denyEnter blocks every other list from accepting it, releasing over the
   * Desk still counts as "returned to its own list" from CDK's point of
   * view. That means CDK always plays its return-to-placeholder snap-back
   * animation and only fires (cdkDragEnded) AFTER that animation finishes
   * (see DragRef._endDragSequence -> _animatePreviewToPlaceholder().then(...)
   * in @angular/cdk/drag-drop). By the time onFormDragEnded used to run, the
   * flight back to the source card had already played — hiding things there
   * was too late. (cdkDragReleased) fires synchronously at pointer-up,
   * before that animation starts, so the drop outcome must be decided and
   * the preview hidden here instead.
   */
  onFormDragReleased(_event: CdkDragRelease): void {
    const value = this.pendingFormValue;
    if (!value || !this.line || !this.hoveredDropTarget) return;

    this.dropSucceeded.set(true);
    this.hidePreviewInstantly();
    this.processStepStateService.updateProcessStep(value);
    this.selectedStepId.set(null);
    this.pendingFormValue = null;
  }

  onFormDragEnded(_event: CdkDragEnd): void {
    this.dragStateChange.emit(false);

    this.hoveredDropTarget?.classList.remove('desk-drag-hover');
    this.hoveredDropTarget = null;
  }

  private findDeskAt(x: number, y: number): HTMLElement | null {
    return document
      .elementFromPoint(x, y)
      ?.closest('.planning-desk') as HTMLElement | null;
  }

  /**
   * Hides the floating global preview clone (appended to document.body via
   * cdkDragPreviewContainer="global", so it lives outside this component's
   * view and .ps-drag-dropped can't reach it) before CDK's own snap-back
   * transition gets a chance to start.
   */
  private hidePreviewInstantly(): void {
    document
      .querySelectorAll<HTMLElement>('.cdk-drag-preview')
      .forEach((preview) => {
        // A quick fade instead of a hard display:none cut — CDK keeps
        // transform-animating this same element back toward the (now
        // hidden) placeholder underneath, so an instant cut still reads as
        // a jarring pop/flicker at the drop point. Fading it out over the
        // same short span smooths that away instead of hard-cutting it.
        preview.style.transition = 'opacity 100ms ease-out';
        preview.style.opacity = '0';
        preview.style.pointerEvents = 'none';
      });
  }

  get droppedSteps(): IProcessStepInput[] {
    if (!this.line) return [];

    return this.processStepStateService.getStepsForLine(this.line.Id);
  }

  get availableSteps(): IBusinessFlowForPlanning[] {
    const droppedIds = new Set(this.droppedSteps.map((x) => x.stepId));

    return this.steps().filter((s) => !droppedIds.has(s.Id));
  }

  get selectedStep(): IBusinessFlowForPlanning | undefined {
    return this.steps().find((s) => s.Id === this.selectedStepId());
  }

  onStepSelected(): void {
    this.pendingFormValue = null;
    this.dropSucceeded.set(false);
  }

  onFormChange(value: IProcessStepInput | null): void {
    this.pendingFormValue = value;
  }

  getAllocatedTimeLabel(step: IProcessStepInput): string {
    if (!step.startDate || !step.endDate) return '';

    const start = new Date(step.startDate);
    const end = new Date(step.endDate);

    let totalSeconds = Math.max(
      0,
      Math.floor((end.getTime() - start.getTime()) / 1000),
    );

    const days = Math.floor(totalSeconds / 86400);
    totalSeconds -= days * 86400;

    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds -= hours * 3600;

    const minutes = Math.floor(totalSeconds / 60);

    return `${days}d ${hours}h ${minutes}m`;
  }

  getMachineName(machineId: number): string {
    return (
      this.machineOptions.find((m) => m.Id === machineId)?.Name ??
      `#${machineId}`
    );
  }
}
