import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import {
  IMergedPlanning,
  IMergedPlanningDetails,
  IMergedPlanningLine,
} from 'src/app/core/model/MergedPlanning/merged-planning-model';
import { MergedPlanningServices } from 'src/app/core/services/MergedPlanning/merged-planning-services';
import { DateTimePipe } from '../../../shared/pipes/date-time-pipe';
import { DecimalPipe } from '@angular/common';
import { ProductionSteps } from '../production-steps/production-steps';

@Component({
  selector: 'app-merged-planning-view',
  standalone: true,
  imports: [DateTimePipe, DecimalPipe, ProductionSteps],
  templateUrl: './merged-planning-view.html',
  styleUrl: './merged-planning-view.scss',
})
export class MergedPlanningView implements OnChanges, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() isOpen = false;
  @Input() headerId: number | null = null;
  @Output() closeView = new EventEmitter<void>();

  header = signal<IMergedPlanning | null>(null);
  lines = signal<IMergedPlanningLine[]>([]);
  isLoading = signal(false);

  selectedLine = signal<IMergedPlanningLine | null>(null);
  isProductionStepsOpen = signal(false);

  constructor(private mergedPlanningService: MergedPlanningServices) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['headerId'] && this.headerId) {
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
          this.header.set(data.Header);
          this.lines.set(data.Lines);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  openProductionSteps(line: IMergedPlanningLine): void {
    this.selectedLine.set(line);
    this.isProductionStepsOpen.set(true);
  }

  closeProductionSteps(): void {
    this.isProductionStepsOpen.set(false);
    this.selectedLine.set(null);
  }

  close(): void {
    this.header.set(null);
    this.lines.set([]);
    this.closeView.emit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
