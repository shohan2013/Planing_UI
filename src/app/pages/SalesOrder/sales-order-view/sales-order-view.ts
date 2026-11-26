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
import { DecimalPipe } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import {
  IDeliveryOrder,
  IDeliveryOrderLine,
} from 'src/app/core/model/SalesOrder/sales-order-model';
import { DeliveryOrderService } from 'src/app/core/services/SalesOrder/sales-order-service';
import { DateTimePipe } from '../../../shared/pipes/date-time-pipe';

/**
 * DO / Requisition view. The parent passes only SOID + workTypeCode;
 * the header and the lines are loaded here by two separate APIs.
 */
@Component({
  selector: 'app-delivery-order-view',
  standalone: true,
  imports: [DateTimePipe, DecimalPipe],
  templateUrl: './sales-order-view.html',
  styleUrl: './sales-order-view.scss',
})
export class DeliveryOrderView implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() soid: number | null = null;
  @Input() workTypeCode = 'DO';
  @Output() closeView = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  /** Cancels unfinished requests when another order is opened. */
  private reload$ = new Subject<void>();

  header = signal<IDeliveryOrder | null>(null);
  headerLoading = signal(false);
  headerError = signal(false);

  lines = signal<IDeliveryOrderLine[]>([]);
  isLoading = signal(false);

  constructor(private deliveryOrderService: DeliveryOrderService) {}

  /** Header total; falls back to the sum of the lines. */
  get totalQuantity(): number {
    const total = this.header()?.TotalQuantity;
    if (total != null) {
      return total;
    }
    return this.lines().reduce((sum, line) => sum + (line.Quantity ?? 0), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['soid'] || changes['workTypeCode']) && this.soid) {
      this.reload$.next();
      this.GetOrderHeader();
      this.GetOrderDetails();
    }
  }

  GetOrderHeader(): void {
    if (!this.soid) return;
    this.header.set(null);
    this.headerError.set(false);
    this.headerLoading.set(true);

    this.deliveryOrderService
      .GetDeliveryOrderHeader(this.soid, this.workTypeCode)
      .pipe(takeUntil(this.reload$), takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.header.set(data ?? null);
          this.headerError.set(!data);
          this.headerLoading.set(false);
        },
        error: () => {
          this.header.set(null);
          this.headerError.set(true);
          this.headerLoading.set(false);
        },
      });
  }

  GetOrderDetails(): void {
    if (!this.soid) return;
    this.lines.set([]);
    this.isLoading.set(true);

    this.deliveryOrderService
      .GetDeliveryOrdersDetails(this.soid, this.workTypeCode)
      .pipe(takeUntil(this.reload$), takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.lines.set(data ?? []);
          this.isLoading.set(false);
        },
        error: () => {
          this.lines.set([]);
          this.isLoading.set(false);
        },
      });
  }

  close(): void {
    this.closeView.emit();
  }

  ngOnDestroy(): void {
    this.reload$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
