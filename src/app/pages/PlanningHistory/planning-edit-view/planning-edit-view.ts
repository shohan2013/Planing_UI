import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { DateTimePipe } from 'src/app/shared/pipes/date-time-pipe';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { PlanningHistoryServices } from 'src/app/core/services/PlanningHistory/planning-history-services';
import { IPriority } from 'src/app/core/model/Common/Priority/Priority';
import { IRecipe } from 'src/app/core/model/Common/Recipe/Recipe';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import {
  IPlanningHistory,
  IPlanningHistoryDetails,
  IPlanningHistoryLine,
  IPlanningHistoryUpdateConfigure,
  IPlanningHistoryUpdateLine,
  IPlanningHistoryUpdateRequest,
} from 'src/app/core/model/PlanningHistory/planning-history-model';
import { ItemPlanningFields } from '../../MergedPlanning/item-planning-fields/item-planning-fields';
import { PlanningProcessSteps } from '../planning-process-steps/planning-process-steps';
import { ItemPlanningStateService } from 'src/app/core/services/MergedPlanning/item-planning-state-service';
import { ProcessStepStateService } from 'src/app/core/services/MergedPlanning/process-step-state-service';
import { IApiResponse } from 'src/app/core/model/Response/ApiResponse';

// This component is the CONTENT of an NgbModal (opened via `modalService.open`
// from planning-edit.ts). It renders its own .modal-header/.modal-body/
// .modal-footer — NgbModal supplies the dialog chrome, backdrop and stacking.
// Styled after the plain (non drag-and-drop) merged-planning-view table
// layout: item planning fields and process-step forms sit inline in the same
// row, prefilled with whatever was already saved for this plan.
@Component({
  selector: 'app-planning-edit-view',
  standalone: true,
  imports: [
    DateTimePipe,
    DecimalPipe,
    ItemPlanningFields,
    PlanningProcessSteps,
  ],
  templateUrl: './planning-edit-view.html',
  styleUrl: './planning-edit-view.scss',
  providers: [ItemPlanningStateService, ProcessStepStateService],
})
export class PlanningEditView implements OnInit, OnChanges, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() headerId: number | null = null;
  @Output() closeView = new EventEmitter<void>();
  @Output() planUpdated = new EventEmitter<void>();

  header = signal<IPlanningHistory | null>(null);
  lines = signal<IPlanningHistoryLine[]>([]);
  priorities = signal<IPriority[]>([]);
  recipeVersions = signal<IRecipe[]>([]);
  machines = signal<IMachine[]>([]);
  productionSteps = signal<IBusinessFlowForPlanning[]>([]);

  isLoading = signal(false);
  loadError = signal(false);
  stepsLoading = signal(false);
  stepsLoadError = signal(false);
  isSaving = signal(false);

  constructor(
    private planningHistoryService: PlanningHistoryServices,
    private commonService: CommonService,
    private itemPlanningState: ItemPlanningStateService,
    private processStepState: ProcessStepStateService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadPriorities();
    if (this.headerId) {
      this.GetPlanningHistoryDetails();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['headerId'] &&
      !changes['headerId'].firstChange &&
      this.headerId
    ) {
      this.GetPlanningHistoryDetails();
    }
  }

  private loadPriorities(): void {
    this.commonService
      .GetPriorityList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) =>
          this.priorities.set(
            data.filter((priority) => priority.IsActive !== false),
          ),
        error: () => this.priorities.set([]),
      });
  }

  GetPlanningHistoryDetails(): void {
    if (!this.headerId) return;

    this.isLoading.set(true);
    this.loadError.set(false);

    this.planningHistoryService
      .GetPlanningHistoryDetails(this.headerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: IPlanningHistoryDetails) => {
          console.log(data);
          this.header.set(data.Header);
          this.lines.set(data.Lines);
          this.loadProductionSteps();
          this.loadMachines();
          this.loadRecipes();
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.loadError.set(true);
        },
      });
  }

  loadProductionSteps(): void {
    const header = this.header();
    if (!header?.UnitId || !header?.BusinessId) return;

    this.stepsLoading.set(true);
    this.stepsLoadError.set(false);

    this.commonService
      .GetBusinessConfigure(header.UnitId, header.BusinessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.productionSteps.set(data);
          this.stepsLoading.set(false);
        },
        error: () => {
          this.stepsLoading.set(false);
          this.stepsLoadError.set(true);
        },
      });
  }

  loadMachines(): void {
    const header = this.header();
    if (!header?.UnitId || !header?.BusinessId) return;

    this.commonService
      .GetMachine(header.UnitId, header.BusinessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.machines.set(data),
        error: () => this.machines.set([]),
      });
  }

  loadRecipes(): void {
    const header = this.header();
    if (!header?.UnitId || !header?.BusinessId) return;

    this.commonService
      .GetRecipe(header.UnitId, header.BusinessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => this.recipeVersions.set(data),
        error: () => this.recipeVersions.set([]),
      });
  }

  get UserEnroll(): number {
    return Number(localStorage.getItem('Enroll'));
  }

  // Each active step is matched back to its originally-saved config (by
  // StepId) so an edit to an already-saved step keeps its row id (in-place
  // update); a step the user newly added has no match and goes out with
  // Id: 0 (insert). Anything originally saved that's no longer active is
  // still sent, but as IsActive: false with its original id, so the
  // backend deactivates that row instead of just losing track of it.
  private buildUpdateLines(): IPlanningHistoryUpdateLine[] {
    const itemPlanning = this.itemPlanningState.items();
    const processSteps = this.processStepState.processSteps();

    return this.lines()
      .map((line) => {
        const item = itemPlanning.find(
          (x) => x.LineId === line.Id && x.IsValid,
        );

        if (!item || item.TakenQty === null || item.TakenQty <= 0) {
          return null;
        }

        const activeSteps = processSteps
          .filter((x) => x.lineId === line.Id)
          .sort((a, b) => a.orderNo - b.orderNo);

        const originalSteps = line.Steps ?? [];
        const activeStepIds = new Set(activeSteps.map((s) => s.stepId));

        const deactivatedConfigures: IPlanningHistoryUpdateConfigure[] =
          originalSteps
            .filter((s) => !activeStepIds.has(s.StepId))
            .map((s) => ({
              Id: s.Id,
              BusinessConfigureId: s.StepId,
              ProductId: line.ProductId,
              StartDate: s.StartDate,
              EndDate: s.EndDate,
              MachineId: s.MachineId,
              OrderNo: s.OrderNo ?? 0,
              IsActive: false,
            }));

        const activeConfigures: IPlanningHistoryUpdateConfigure[] =
          activeSteps.map((step) => {
            const original = originalSteps.find(
              (s) => s.StepId === step.stepId,
            );

            return {
              Id: original?.Id ?? 0,
              BusinessConfigureId: step.stepId,
              ProductId: line.ProductId,
              StartDate: step.startDate,
              EndDate: step.endDate,
              MachineId: step.machineId,
              OrderNo: step.orderNo,
              IsActive: true,
            };
          });

        const configures = [...activeConfigures, ...deactivatedConfigures];

        return {
          Id: line.Id,
          Quantity: line.Quantity,
          TakenQuantity: item.TakenQty,
          AdvanceProductionQuantity: item.AdvanceProductionQty ?? 0,
          RecipeVersionId: item.RecipeVersionId ?? 0,
          PriorityId: item.PriorityId ?? 0,
          ProductionPlanConfigures: configures.length > 0 ? configures : null,
        };
      })
      .filter((line): line is IPlanningHistoryUpdateLine => line !== null);
  }

  onSaveAll(): void {
    if (!this.headerId) return;

    const header = this.header();
    const lines = this.buildUpdateLines();

    if (lines.length === 0) {
      this.toastr.error(
        'Enter a valid Taken Qty for at least one item before saving.',
      );
      return;
    }

    const request: IPlanningHistoryUpdateRequest = {
      Header: {
        DocUpdatedBy: this.UserEnroll,
        BusinessId: header?.BusinessId ?? 0,
        UnitId: header?.UnitId ?? 0,
      },
      Lines: lines,
    };

    this.isSaving.set(true);

    console.log(request);
    this.planningHistoryService
      .UpdatePlan(this.headerId, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: IApiResponse) => {
          if (response.Status) {
            this.toastr.success(
              response.Message || 'Plan updated successfully',
            );
            this.isSaving.set(false);
            this.planUpdated.emit();
            this.close();
          } else {
            this.toastr.error(response.Message || 'Failed to update plan');
            this.isSaving.set(false);
          }
        },
        error: (error) => {
          this.toastr.error(
            error?.error?.message ||
              'Something went wrong while updating the plan',
          );
          this.isSaving.set(false);
        },
      });
  }

  close(): void {
    this.closeView.emit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
