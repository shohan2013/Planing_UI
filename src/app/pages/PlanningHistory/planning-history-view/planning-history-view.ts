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
import { DateTimePipe } from 'src/app/shared/pipes/date-time-pipe';
import { PlanningHistoryServices } from 'src/app/core/services/PlanningHistory/planning-history-services';
import {
  IPlanningHistory,
  IPlanningHistoryDetails,
  IPlanningHistoryLine,
} from 'src/app/core/model/PlanningHistory/planning-history-model';

@Component({
  selector: 'app-planning-history-view',
  standalone: true,
  imports: [DateTimePipe, DecimalPipe],
  templateUrl: './planning-history-view.html',
  styleUrl: './planning-history-view.scss',
})
export class PlanningHistoryView implements OnInit, OnChanges, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() headerId: number | null = null;
  @Output() closeView = new EventEmitter<void>();

  header = signal<IPlanningHistory | null>(null);
  lines = signal<IPlanningHistoryLine[]>([]);

  isLoading = signal(false);
  loadError = signal(false);

  constructor(private planningHistoryService: PlanningHistoryServices) {}

  ngOnInit(): void {
    if (this.headerId) {
      this.GetPlanningHistoryDetails();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['headerId'] && !changes['headerId'].firstChange && this.headerId) {
      this.GetPlanningHistoryDetails();
    }
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
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.loadError.set(true);
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
