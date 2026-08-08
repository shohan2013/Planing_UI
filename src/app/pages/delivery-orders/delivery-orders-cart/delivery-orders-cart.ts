import { Component } from '@angular/core';
import { DateTimePipe } from '../../../shared/pipes/date-time-pipe';

@Component({
  selector: 'app-delivery-orders-cart',
  imports: [DateTimePipe],
  templateUrl: './delivery-orders-cart.html',
  styleUrl: './delivery-orders-cart.scss',
})
export class DeliveryOrdersCart {
  goToMergeOrSplit() {
    throw new Error('Method not implemented.');
  }
  removeDeliveryOrder(arg0: any) {
    throw new Error('Method not implemented.');
  }
  closeSelectionCart() {
    throw new Error('Method not implemented.');
  }
  selectedDeliveryOrders: any;
}
