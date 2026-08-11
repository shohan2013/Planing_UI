import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, takeUntil, tap } from 'rxjs';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import {
  IDeliveryOrder,
  IMergeDeliveryOrderRequest,
} from 'src/app/core/model/DeliveryOrder/delivery-order-model';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { DeliveryOrderService } from 'src/app/core/services/DeliveryOrder/delivery-order-service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { DateTimePipe } from 'src/app/shared/pipes/date-time-pipe';
import { DeliveryOrdersCart } from './delivery-orders-cart/delivery-orders-cart';
import { DeliveryOrderView } from './delivery-order-view/delivery-order-view';
import { select } from '@ngrx/store';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-delivery-orders',
  standalone: true,
  imports: [
    FormsModule,
    DateTimePipe,
    PaginationComponent,
    DeliveryOrdersCart,
    DeliveryOrderView,
  ],
  templateUrl: './delivery-orders.html',
  styleUrl: './delivery-orders.scss',
})
export class DeliveryOrders
  extends ServerSideFilteredPaginatedComponent<IDeliveryOrder>
  implements OnInit, OnDestroy
{
  private destroy$ = new Subject<void>();
  units: IUnit[];
  businesses: IBusiness[];
  selectedUnitId: Number = 0;
  selectedBusinessId: Number = 0;
  selectedDeliveryOrders = signal<IDeliveryOrder[]>([]);
  cartOpen = signal(false);
  viewOpen = signal(false);
  OrderForView = signal<IDeliveryOrder | null>(null);

  constructor(
    private deliveryOrderService: DeliveryOrderService,
    private commonService: CommonService,
    private toaster: ToastrService,
  ) {
    super();
  }

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
      if (currentSelection.some((order) => order.SOID === item.SOID)) {
        return;
      }

      // Check Unit and Business
      if (!this.canAddToCart(item)) {
        checkbox.checked = false;

        this.toaster.error(
          'You can only select Delivery Orders from the same Unit and Business.',
        );

        return;
      }

      this.selectedDeliveryOrders.set([...currentSelection, item]);
    } else {
      this.selectedDeliveryOrders.set(
        currentSelection.filter((order) => order.SOID !== item.SOID),
      );
    }
  }

  toggleAll(event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const currentPageItems = this.paginatedItems();
    const currentSelection = this.selectedDeliveryOrders();

    if (checkbox.checked) {
      const itemsToAdd = currentPageItems.filter(
        (item) =>
          !currentSelection.some((selected) => selected.SOID === item.SOID),
      );

      if (!this.canSelectAll(itemsToAdd)) {
        checkbox.checked = false;

        this.toaster.error(
          'All selected Delivery Orders must have the same Unit and Business.',
        );

        return;
      }

      this.selectedDeliveryOrders.set([...currentSelection, ...itemsToAdd]);
    } else {
      const currentPageIds = new Set(currentPageItems.map((item) => item.SOID));

      this.selectedDeliveryOrders.set(
        currentSelection.filter((item) => !currentPageIds.has(item.SOID)),
      );
    }
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

  openView(order: IDeliveryOrder): void {
    this.OrderForView.set(order);
    this.viewOpen.set(true);
  }

  closeView(): void {
    this.viewOpen.set(false);
  }

  nextProcess() {
    this.MergeDO();
  }

  MergeDO() {
    const selectedDO = this.selectedDeliveryOrders()[0];
    const selectedDOIds: IMergeDeliveryOrderRequest = {
      DeliveryOrderIds: this.selectedDeliveryOrders().map(
        (order) => order.SOID,
      ),
      Remarks: null,
      DocumentCreatedBy: Number(localStorage.getItem('Enroll')),
      IsCombineDO: this.selectedDeliveryOrders().length > 1 ? true : false,
      BusinessID: this.businesses.find(
        (business) => business.Name === selectedDO.Business,
      )?.Id,
      UnitID: this.units.find((unit) => unit.Name === selectedDO.Unit)?.Id,
      Business: selectedDO.Business,
      Unit: selectedDO.Unit,
    };

    this.deliveryOrderService
      .MergeDO(selectedDOIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.cartOpen.set(false);
          //this.submitted = false;
          this.toaster.success('DO merged successfully.');
        },
      });
  }

  private canAddToCart(item: IDeliveryOrder): boolean {
    const selected = this.selectedDeliveryOrders();

    if (selected.length === 0) {
      return true;
    }

    const firstSelected = selected[0];

    return (
      item.Unit === firstSelected.Unit &&
      item.Business === firstSelected.Business
    );
  }

  private canSelectAll(items: IDeliveryOrder[]): boolean {
    if (items.length === 0) {
      return true;
    }

    const selected = this.selectedDeliveryOrders();

    // If cart already has items, compare against them
    const reference = selected.length > 0 ? selected[0] : items[0];

    return items.every(
      (item) =>
        item.Unit === reference.Unit && item.Business === reference.Business,
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
