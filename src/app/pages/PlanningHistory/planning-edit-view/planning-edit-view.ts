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
            data.length
              ? data.filter((priority) => priority.IsActive !== false)
              : this.dummyPriorities(),
          ),
        error: () => this.priorities.set(this.dummyPriorities()),
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
          this.header.set(data.Header);
          this.lines.set(data.Lines);
          this.loadProductionSteps();
          this.loadMachines();
          this.loadRecipes();
          this.isLoading.set(false);
        },
        // Backend endpoint isn't wired up yet — fall back to dummy data so
        // the editable form can be exercised end to end in the meantime.
        error: () => {
          const dummy = this.dummyDetails(this.headerId!);
          this.header.set(dummy.Header);
          this.lines.set(dummy.Lines);
          this.loadProductionSteps();
          this.loadMachines();
          this.loadRecipes();
          this.isLoading.set(false);
        },
      });
  }

  loadProductionSteps(): void {
    const header = this.header();
    if (!header?.UnitId || !header?.BusinessId) {
      this.productionSteps.set(this.dummySteps());
      return;
    }

    this.stepsLoading.set(true);
    this.stepsLoadError.set(false);

    this.commonService
      .GetBusinessConfigure(header.UnitId, header.BusinessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.productionSteps.set(data.length ? data : this.dummySteps());
          this.stepsLoading.set(false);
        },
        error: () => {
          this.productionSteps.set(this.dummySteps());
          this.stepsLoading.set(false);
          this.stepsLoadError.set(false);
        },
      });
  }

  loadMachines(): void {
    const header = this.header();
    if (!header?.UnitId || !header?.BusinessId) {
      this.machines.set(this.dummyMachines());
      return;
    }

    this.commonService
      .GetMachine(header.UnitId, header.BusinessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) =>
          this.machines.set(data.length ? data : this.dummyMachines()),
        error: () => this.machines.set(this.dummyMachines()),
      });
  }

  loadRecipes(): void {
    const header = this.header();
    if (!header?.UnitId || !header?.BusinessId) {
      this.recipeVersions.set(this.dummyRecipes());
      return;
    }

    this.commonService
      .GetRecipe(header.UnitId, header.BusinessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) =>
          this.recipeVersions.set(data.length ? data : this.dummyRecipes()),
        error: () => this.recipeVersions.set(this.dummyRecipes()),
      });
  }

  // ---------- Dummy data (used until the real endpoints are wired up) ----------

  private dummyDetails(headerId: number): IPlanningHistoryDetails {
    return {
      Header: {
        Id: headerId,
        PPNO: `PP-${1000 + headerId}`,
        DOCode: `DO-${2000 + headerId}`,
        CreatedBy: 'John Doe',
        DocumentStatus: 'Pending',
        CreatedDate: new Date(),
        Unit: 'Unit 1',
        Business: 'Bakery',
        UnitId: 1,
        BusinessId: 1,
        IsCombineDO: true,
      },
      Lines: [
        {
          Id: 1,
          ProductId: 101,
          ProductName: 'Whole Wheat Bread',
          UOM: 'KG',
          Quantity: 500,
          PlannedQuantity: 150,
          Rate: 45.5,
          Remarks: null,
          TakenQty: 200,
          AdvanceProductionQty: null,
          RecipeVersionId: 1,
          PriorityId: 1,
          Steps: [
            {
              stepId: 1,
              stepName: 'Mixing',
              startDate: '2026-09-10T08:00',
              endDate: '2026-09-10T10:00',
              machineId: 1,
            },
            {
              stepId: 2,
              stepName: 'Baking',
              startDate: '2026-09-10T10:30',
              endDate: '2026-09-10T13:00',
              machineId: 2,
            },
          ],
        },
        {
          Id: 2,
          ProductId: 102,
          ProductName: 'Butter Croissant',
          UOM: 'PCS',
          Quantity: 1000,
          PlannedQuantity: 300,
          Rate: 12.75,
          Remarks: null,
          TakenQty: 400,
          AdvanceProductionQty: null,
          RecipeVersionId: 2,
          PriorityId: 2,
          Steps: [
            {
              stepId: 1,
              stepName: 'Mixing',
              startDate: '2026-09-10T09:00',
              endDate: '2026-09-10T11:00',
              machineId: 1,
            },
          ],
        },
        {
          Id: 3,
          ProductId: 103,
          ProductName: 'Chocolate Muffin',
          UOM: 'PCS',
          Quantity: 800,
          PlannedQuantity: 0,
          Rate: 18.0,
          Remarks: null,
          TakenQty: null,
          AdvanceProductionQty: null,
          RecipeVersionId: null,
          PriorityId: null,
          Steps: [],
        },
      ],
    };
  }

  private dummyMachines(): IMachine[] {
    return [
      { Id: 1, Name: 'Mixer #1' },
      { Id: 2, Name: 'Oven #1' },
      { Id: 3, Name: 'Packing Line #1' },
    ] as IMachine[];
  }

  private dummyRecipes(): IRecipe[] {
    return [
      { Id: 1, Name: 'Standard Recipe v1' },
      { Id: 2, Name: 'Premium Recipe v2' },
    ] as IRecipe[];
  }

  private dummyPriorities(): IPriority[] {
    return [
      { Id: 1, PriorityName: 'High' },
      { Id: 2, PriorityName: 'Medium' },
      { Id: 3, PriorityName: 'Low' },
    ] as IPriority[];
  }

  private dummySteps(): IBusinessFlowForPlanning[] {
    return [
      {
        Id: 1,
        UnitId: 1,
        BusinessId: 1,
        Name: 'Mixing',
        Slno: 1,
        IsActive: true,
      },
      {
        Id: 2,
        UnitId: 1,
        BusinessId: 1,
        Name: 'Baking',
        Slno: 2,
        IsActive: true,
      },
      {
        Id: 3,
        UnitId: 1,
        BusinessId: 1,
        Name: 'Packing',
        Slno: 3,
        IsActive: true,
      },
    ] as IBusinessFlowForPlanning[];
  }

  get UserEnroll(): number {
    return Number(localStorage.getItem('Enroll'));
  }

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

        const steps = processSteps.filter((x) => x.lineId === line.Id);

        return {
          Id: line.Id,
          ProductId: line.ProductId,
          Quantity: line.Quantity,
          TakenQuantity: item.TakenQty,
          AdvanceProductionQuantity: item.AdvanceProductionQty ?? 0,
          Rate: line.Rate,
          RecipeVersionId: item.RecipeVersionId ?? 0,
          PriorityId: item.PriorityId ?? 0,
          ProductionPlanConfigures:
            steps.length > 0
              ? steps.map((step) => ({
                  BusinessConfigureId: step.stepId,
                  ProductId: line.ProductId,
                  StartDate: step.startDate,
                  EndDate: step.endDate,
                  MachineId: step.machineId,
                }))
              : null,
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
        DOStatusId: header?.Id ?? 0,
        DocCreatedBy: this.UserEnroll,
        BusinessId: header?.BusinessId ?? 0,
        UnitId: header?.UnitId ?? 0,
      },
      Lines: lines,
    };

    this.isSaving.set(true);

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
