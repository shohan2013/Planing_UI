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
import { single, Subject, takeUntil } from 'rxjs';
import { DateTimePipe } from 'src/app/shared/pipes/date-time-pipe';
import { MergedPlanningServices } from 'src/app/core/services/MergedPlanning/merged-planning-services';
import { ProductionSteps } from '../production-steps/production-steps';
import { ItemPlanningFields } from '../item-planning-fields/item-planning-fields';
import { PlanningDesk } from '../planning-desk/planning-desk';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { IPriority } from 'src/app/core/model/Common/Priority/Priority';
import {
  IMergedPlanning,
  IMergedPlanningDetails,
  IMergedPlanningLine,
} from 'src/app/core/model/MergedPlanning/merged-planning-model';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';
import { IRecipe } from 'src/app/core/model/Common/Recipe/Recipe';
import { ItemPlanningStateService } from 'src/app/core/services/MergedPlanning/item-planning-state-service';
import { ProcessStepStateService } from 'src/app/core/services/MergedPlanning/process-step-state-service';
import {
  IItemPlanningInput,
  IProductionPlanHeader,
  IProductionPlanLine,
} from 'src/app/core/model/MergedPlanning/planning-processes-model';
import { ToastrService } from 'ngx-toastr';
import { IApiResponse } from 'src/app/core/model/Response/ApiResponse';

// This component is the CONTENT of an NgbModal (opened via `modalService.open`
// from merged-planning.ts, same pattern as viewRequisitionModal/requisitionModal).
// It renders its own .modal-header/.modal-body/.modal-footer — NgbModal supplies
// the dialog chrome, backdrop, and stacking.
@Component({
  selector: 'app-merged-planning-view',
  standalone: true,
  imports: [
    DateTimePipe,
    DecimalPipe,
    ProductionSteps,
    ItemPlanningFields,
    PlanningDesk,
  ],
  templateUrl: './merged-planning-view.html',
  styleUrl: './merged-planning-view.scss',
  providers: [ItemPlanningStateService, ProcessStepStateService],
})
export class MergedPlanningView implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() headerId: number | null = null;
  @Output() closeView = new EventEmitter<void>();

  header = signal<IMergedPlanning | null>(null);
  lines = signal<IMergedPlanningLine[]>([]);
  priorities = signal<IPriority[]>([]);
  recipeVersions = signal<IRecipe[]>([]);
  itemPlanningValues = signal<Record<number, IItemPlanningInput>>({});
  Machines = signal<IMachine[]>([]);

  isLoading = signal(false);
  loadError = signal(false);
  stepsLoading = signal(false);
  stepsLoadError = signal(false);
  isSaving = signal(false);
  productionSteps = signal<IBusinessFlowForPlanning[]>([]);
  isDragging = signal(false);

  constructor(
    private mergedPlanningService: MergedPlanningServices,
    private commonService: CommonService,
    private itemPlanningState: ItemPlanningStateService,
    private processStepState: ProcessStepStateService,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadPriorities();
    if (this.headerId) {
      this.GetMergedPlanningDetails();
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

  GetMergedPlanningDetails(): void {
    if (!this.headerId) return;

    this.isLoading.set(true);
    this.mergedPlanningService
      .GetMergedPlanningDetails(this.headerId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: IMergedPlanningDetails) => {
          //console.log(data);
          this.header.set(data.Header);
          this.lines.set(data.Lines);
          this.loadProductionSteps();
          this.loadMachine();
          this.loadRecipe();
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.loadError.set(true);
        },
      });
  }

  loadProductionSteps() {
    const currentHeader = this.header().Id;
    if (!currentHeader) return;

    this.stepsLoading.set(true);
    this.stepsLoadError.set(false);

    this.commonService
      .GetBusinessConfigure(this.header().UnitId, this.header().BusinessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log(data);
          this.productionSteps.set(data);
          this.stepsLoading.set(false);
        },
        error: () => {
          this.stepsLoading.set(true);
          this.stepsLoadError.set(false);
        },
      });
  }

  loadMachine() {
    this.commonService
      .GetMachine(this.header().UnitId, this.header().BusinessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.Machines.set(data);
      });
  }

  loadRecipe() {
    this.commonService
      .GetRecipe(this.header().UnitId, this.header().BusinessId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.recipeVersions.set(data);
      });
  }

  close(): void {
    this.closeView.emit();
  }

  get UserEnroll(): number {
    return Number(localStorage.getItem('Enroll'));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildProductionPlanLinesToSave(): IProductionPlanLine[] {
    const itemPlanning = this.itemPlanningState.items();

    const processSteps = this.processStepState.processSteps();

    return this.lines().map((line) => {
      const item = itemPlanning.find((x) => x.LineId === line.Id);

      const steps = processSteps.filter((x) => x.lineId === line.Id);

      return {
        ProductId: line.ProductId,
        Quantity: line.Quantity,
        TakenQuantity: item?.TakenQty ?? 0,
        AdvanceProductionQuantity: item?.AdvanceProductionQty ?? 0,
        Rate: line.Rate,
        RecipeVersionId: item?.RecipeVersionId ?? 0,
        PriorityId: item?.PriorityId ?? 0,
        //Remarks: null,

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
    });
  }

  private buildProductionPlanHeaderToSave(): IProductionPlanHeader {
    const header = this.header();

    return {
      DOStatusId: header?.Id ?? 0,
      DocCreatedBy: this.UserEnroll, // whatever your user ID source is
      BusinessId: header?.BusinessId ?? 0,
      UnitId: header?.UnitId ?? 0,
      //Remarks: null,
    };
  }

  onSaveAll(): void {
    this.isSaving.set(true);
    const header = this.buildProductionPlanHeaderToSave();
    const lines = this.buildProductionPlanLinesToSave();

    this.mergedPlanningService.SavePlan(header, lines).subscribe({
      next: (response: IApiResponse) => {
        console.log('API Response:', response);

        if (response.Status) {
          this.itemPlanningState.clear();
          this.processStepState.clear();

          this.toastr.success(response.Message || 'Plan saved successfully');
          this.isSaving.set(false);
          this.close();
        } else {
          this.toastr.error(response.Message || 'Failed to save plan');
          this.isSaving.set(false);
        }
      },

      error: (error) => {
        console.error('API Error:', error);

        this.toastr.error(
          error?.error?.message || 'Something went wrong while saving the plan',
        );
        this.isSaving.set(false);
      },
    });
  }
}
