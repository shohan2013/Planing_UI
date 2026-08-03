import { Component, TemplateRef } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IDeliveryOrder } from 'src/app/core/model/DeliveryOrder/delivery-order-model';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { DeliveryOrderService } from 'src/app/core/services/DeliveryOrder/delivery-order-service';

@Component({
  selector: 'app-delivery-order-landing',
  standalone: true,
  templateUrl: './delivery-order-landing.html',
  styleUrl: './delivery-order-landing.scss',
  imports: [],
})
export class DeliveryOrderLanding extends ServerSideFilteredPaginatedComponent<IDeliveryOrder> {
  selectedUnitId: Number = 0;
  selectedBusinessId: Number = 0;

  constructor(private deliveryOrderService: DeliveryOrderService) {
    super();
  }

  protected override fetchData(
    request: ServerQueryRequest,
  ): Observable<ServerQueryResponse<IDeliveryOrder>> {
    return this.deliveryOrderService.GetDeliverOrders(request);
  }

  toggleAll($event: Event) {
    throw new Error('Method not implemented.');
  }

  openCreateModal(_t10: TemplateRef<any>) {
    throw new Error('Method not implemented.');
  }
}
