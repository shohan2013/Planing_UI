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
import {
  IMergedPlanning,
  IMergedPlanningDetails,
  IMergedPlanningLine,
} from 'src/app/core/model/MergedPlanning/merged-planning-model';

// This component is the CONTENT of an NgbModal (opened via `modalService.open`
// from merged-planning.ts, same pattern as viewRequisitionModal/requisitionModal).
// It renders its own .modal-header/.modal-body/.modal-footer — NgbModal supplies
// the dialog chrome, backdrop, and stacking.
@Component({
  selector: 'app-merged-planning-view',
  standalone: true,
  imports: [DateTimePipe, DecimalPipe, ProductionSteps],
  templateUrl: './merged-planning-view.html',
  styleUrl: './merged-planning-view.scss',
})
export class MergedPlanningView implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() headerId: number | null = null;
  @Output() closeView = new EventEmitter<void>();

  header = signal<IMergedPlanning | null>(null);
  lines = signal<IMergedPlanningLine[]>([]);
  isLoading = signal(false);

  constructor(private mergedPlanningService: MergedPlanningServices) {}

  ngOnInit(): void {
    if (this.headerId) {
      this.GetMergedPlanningDetails();
    }
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
