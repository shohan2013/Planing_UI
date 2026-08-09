import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { DateTimePipe } from '../../../shared/pipes/date-time-pipe';
import { IDeliveryOrder } from 'src/app/core/model/DeliveryOrder/delivery-order-model';
import { DeliveryOrderView } from '../delivery-order-view/delivery-order-view';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-delivery-orders-cart',
  standalone: true,
  imports: [DateTimePipe, DeliveryOrderView, DecimalPipe],
  templateUrl: './delivery-orders-cart.html',
  styleUrl: './delivery-orders-cart.scss',
})
export class DeliveryOrdersCart {
  @Input() isOpen = false;

  @Input() selectedOrders: IDeliveryOrder[] = [];

  @Output() closeCart = new EventEmitter<void>();

  @Output() nextStep = new EventEmitter<void>();

  @Output() removeOrder = new EventEmitter<Number>();

  viewOpen = signal(false);
  OrderForView = signal<IDeliveryOrder | null>(null);

  removeDO(event: MouseEvent, id: Number) {
    event.stopPropagation();
    this.removeOrder.emit(id);
  }

  close() {
    this.closeCart.emit();
  }

  MergeOrSplit() {
    this.nextStep.emit();
  }

  ViewOrder(order: IDeliveryOrder): void {
    this.OrderForView.set(order);
    this.viewOpen.set(true);
  }

  closeView(): void {
    this.viewOpen.set(false);
  }
}
