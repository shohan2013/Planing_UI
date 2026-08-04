import { Component, OnDestroy, OnInit, TemplateRef } from '@angular/core';
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
import { DateTimePipe } from '../../../shared/pipes/date-time-pipe';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';

@Component({
  selector: 'app-delivery-order-landing',
  standalone: true,
  templateUrl: './delivery-order-landing.html',
  styleUrl: './delivery-order-landing.scss',
  imports: [FormsModule, DateTimePipe, PaginationComponent],
})
export class DeliveryOrderLanding
  extends ServerSideFilteredPaginatedComponent<IDeliveryOrder>
  implements OnInit, OnDestroy
{
  private destroy$ = new Subject<void>();
  selectedUnitId: Number = 0;
  selectedBusinessId: Number = 0;
  units: IUnit[];
  businesses: IBusiness[];

  constructor(
    private deliveryOrderService: DeliveryOrderService,
    private commonService: CommonService,
  ) {
    super();
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.loadCommonData();
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
    console.log(this.selectedUnitId);
    this.currentPage.set(1);
    this.retry();
  }

  toggleAll($event: Event) {
    throw new Error('Method not implemented.');
  }

  openCreateModal(_t10: TemplateRef<any>) {
    throw new Error('Method not implemented.');
  }

  loadCommonData(): void {
    this.commonService
      .GetUnitList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        //console.log(data);
        this.units = data;
      });

    // this.commonService
    //   .GetBusinessList()
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe((data) => {
    //     this.businesses = data;

    //     if (this.selectedUnitId) {
    //       this.filterBusinesses();
    //     }
    //   });

    // this.commonService
    //   .GetProductTypeList()
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe((data) => {
    //     this.productTypes = data;
    //   });

    // this.commonService.GetUOMList()
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(data => {
    //     this.uoms = data;
    //   });

    // this.commonService
    //   .GetUOMList()
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe((data) => {
    //     this.uoms = data;

    //     if (this.selectedUnitId) {
    //       this.filterUOMs();
    //     }
    //   });

    // this.commonService
    //   .GetDocumentStatusList()
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe((data) => {
    //     this.fileStatusList = data;
    //   });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
