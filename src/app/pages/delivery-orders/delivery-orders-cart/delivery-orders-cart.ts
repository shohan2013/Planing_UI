import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DateTimePipe } from '../../../shared/pipes/date-time-pipe';
import { IDeliveryOrder } from 'src/app/core/model/DeliveryOrder/delivery-order-model';

@Component({
  selector: 'app-delivery-orders-cart',
  standalone: true,
  imports: [DateTimePipe],
  templateUrl: './delivery-orders-cart.html',
  styleUrl: './delivery-orders-cart.scss',
})
export class DeliveryOrdersCart {
  @Input() isOpen = false;

  @Input() selectedOrders: IDeliveryOrder[] = [];

  @Output() closeCart = new EventEmitter<void>();

  @Output() nextStep = new EventEmitter<void>();

  @Output() removeOrder = new EventEmitter<Number>();

  removeDO(id: Number) {
    this.removeOrder.emit(id);
  }

  close() {
    this.closeCart.emit();
  }

  next() {
    this.nextStep.emit();
  }
}
