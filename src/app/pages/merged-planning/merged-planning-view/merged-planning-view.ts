import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
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
  IRecipeVersionOption,
} from 'src/app/core/model/MergedPlanning/merged-planning-model';

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
  recipeVersions = signal<IRecipeVersionOption[]>([]);
  itemPlanningValues = signal<Record<number, IItemPlanningInput>>({});
  isLoading = signal(false);

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
          console.log(data);
          this.header.set(data.Header);
          this.lines.set(data.Lines);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
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
