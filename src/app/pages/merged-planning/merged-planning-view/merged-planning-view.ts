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
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { IPriority } from 'src/app/core/model/Common/Priority/Priority';
import {
  IItemPlanningInput,
  IMergedPlanning,
  IMergedPlanningDetails,
  IMergedPlanningLine,
} from 'src/app/core/model/MergedPlanning/merged-planning-model';
import { IBusinessFlowForPlanning } from 'src/app/core/model/Common/BusinessFlow/production-steps-model';
import { IMachine } from 'src/app/core/model/Common/Machine/machine';
import { IRecipe } from 'src/app/core/model/Common/Recipe/Recipe';

// This component is the CONTENT of an NgbModal (opened via `modalService.open`
// from merged-planning.ts, same pattern as viewRequisitionModal/requisitionModal).
// It renders its own .modal-header/.modal-body/.modal-footer — NgbModal supplies
// the dialog chrome, backdrop, and stacking.
@Component({
  selector: 'app-merged-planning-view',
  standalone: true,
  imports: [DateTimePipe, DecimalPipe, ProductionSteps, ItemPlanningFields],
  templateUrl: './merged-planning-view.html',
  styleUrl: './merged-planning-view.scss',
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

  productionSteps = signal<IBusinessFlowForPlanning[]>([]);

  constructor(
    private mergedPlanningService: MergedPlanningServices,
    private commonService: CommonService,
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

  onItemPlanningChange(value: IItemPlanningInput): void {
    this.itemPlanningValues.update((values) => ({
      ...values,
      [value.LineId]: value,
    }));
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
