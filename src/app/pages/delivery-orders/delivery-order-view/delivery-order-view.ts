import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  output,
  signal,
  SimpleChanges,
} from '@angular/core';
import {
  IDeliveryOrder,
  IDeliveryOrderLine,
} from 'src/app/core/model/DeliveryOrder/delivery-order-model';
import { DeliveryOrderService } from 'src/app/core/services/DeliveryOrder/delivery-order-service';
import { DateTimePipe } from '../../../shared/pipes/date-time-pipe';
import { Subject, takeUntil } from 'rxjs';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-delivery-order-view',
  standalone: true,
  imports: [DateTimePipe, DecimalPipe],
  templateUrl: './delivery-order-view.html',
  styleUrl: './delivery-order-view.scss',
})
export class DeliveryOrderView implements OnChanges, OnDestroy {
  private destroy$ = new Subject<void>();
  @Input() isOpen = false;
  @Input() order: IDeliveryOrder | null = null;
  @Output() closeView = new EventEmitter<void>();

  lines = signal<IDeliveryOrderLine[]>([]);

  constructor(private deliveryOrderService: DeliveryOrderService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['order'] && this.order?.SOID) {
      this.GetOrderDetails();
    }
  }

  GetOrderDetails(): void {
    if (!this.order?.SOID) return;

    this.deliveryOrderService
      .GetDeliveryOrdersDetails(this.order.SOID)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log(data);
        this.lines.set(data);
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
