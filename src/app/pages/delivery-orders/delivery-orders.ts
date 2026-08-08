import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  signal,
  TemplateRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, takeUntil, tap } from 'rxjs';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IDeliveryOrder } from 'src/app/core/model/DeliveryOrder/delivery-order-model';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { DeliveryOrderService } from 'src/app/core/services/DeliveryOrder/delivery-order-service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { DateTimePipe } from 'src/app/shared/pipes/date-time-pipe';
import { DeliveryOrdersCart } from './delivery-orders-cart/delivery-orders-cart';

@Component({
  selector: 'app-delivery-orders',
  standalone: true,
  imports: [FormsModule, DateTimePipe, PaginationComponent, DeliveryOrdersCart],
  templateUrl: './delivery-orders.html',
  styleUrl: './delivery-orders.scss',
})
export class DeliveryOrders
  extends ServerSideFilteredPaginatedComponent<IDeliveryOrder>
  implements OnInit, OnDestroy
{
  private destroy$ = new Subject<void>();
  selectedUnitId: Number = 0;
  selectedBusinessId: Number = 0;
  units: IUnit[];
  businesses: IBusiness[];
  selectedDeliveryOrders = signal<IDeliveryOrder[]>([]);
  cartOpen = signal(false);

  constructor(
    private deliveryOrderService: DeliveryOrderService,
    private commonService: CommonService,
  ) {
    super();
  }

  @Output()
  SelectedOrdersChange = new EventEmitter<any[]>();

  ngOnInit(): void {
    //super.ngOnInit();
    this.GetBusinessList();
    this.GetUnitList();
  }

  protected override fetchData(
    request: ServerQueryRequest,
  ): Observable<ServerQueryResponse<IDeliveryOrder>> {
    return this.deliveryOrderService
      .GetDeliverOrders(request, this.selectedUnitId, this.selectedBusinessId)
      .pipe(
        tap((response) => console.log(`Delivery Orders Response`, response)),
      );
  }

  onUnitFilterChange(): void {
    //console.log(this.selectedUnitId);
    this.selectedBusinessId = 0;
    this.GetBusinessList();
    this.currentPage.set(1);
    this.retry();
  }

  onBusinessFilterChange(): void {
    this.currentPage.set(1);
    this.retry();
  }

  GetBusinessList(): void {
    this.commonService
      .GetBusinessList(this.selectedUnitId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        //console.log(data);
        this.businesses = data;
      });
  }

  GetUnitList(): void {
    this.commonService
      .GetUnitList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        //console.log(data);
        this.units = data;
      });
  }

  isSelected(soid: Number): boolean {
    return this.selectedDeliveryOrders().some((order) => order.SOID === soid);
  }

  isAllSelected(): boolean {
    const items = this.paginatedItems();
    if (items.length === 0) {
      return false;
    }
    return items.every((item) =>
      this.selectedDeliveryOrders().some(
        (selected) => selected.SOID === item.SOID,
      ),
    );
  }

  toggleSelection(item: IDeliveryOrder, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const isChecked = checkbox.checked;

    const currentSelection = this.selectedDeliveryOrders();

    if (isChecked) {
      // Prevent duplicate selection
      if (!currentSelection.some((order) => order.SOID === item.SOID)) {
        this.selectedDeliveryOrders.set([...currentSelection, item]);
      }
    } else {
      this.selectedDeliveryOrders.set(
        currentSelection.filter((order) => order.SOID !== item.SOID),
      );
    }
  }

  toggleAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const currentPageItems = this.paginatedItems();

    if (checkbox.checked) {
      // Select all items on the current page
      const currentSelection = this.selectedDeliveryOrders();

      const newItems = currentPageItems.filter(
        (item) =>
          !currentSelection.some((selected) => selected.SOID === item.SOID),
      );

      this.selectedDeliveryOrders.set([...currentSelection, ...newItems]);
    } else {
      // Remove all items from the current page
      const currentPageIds = new Set(currentPageItems.map((item) => item.SOID));

      this.selectedDeliveryOrders.set(
        this.selectedDeliveryOrders().filter(
          (item) => !currentPageIds.has(item.SOID),
        ),
      );
    }
  }

  openCreateModal(_t10: TemplateRef<any>) {
    throw new Error('Method not implemented.');
  }

  removeSelection(soid: Number) {
    this.selectedDeliveryOrders.update((items) =>
      items.filter((item) => item.SOID !== soid),
    );
  }

  toggleCart() {
    this.cartOpen.update((value) => !value);
  }

  closeCart() {
    this.cartOpen.set(false);
  }

  goToNextStep() {
    this.SelectedOrdersChange.emit(this.selectedDeliveryOrders());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
