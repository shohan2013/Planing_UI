import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, Observable, Subject, takeUntil, tap } from 'rxjs';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import {
  IDeliveryOrder,
  IMergeDeliveryOrderRequest,
  IMergePolicy,
} from 'src/app/core/model/SalesOrder/sales-order-model';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { DeliveryOrderService } from 'src/app/core/services/SalesOrder/sales-order-service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { DateTimePipe } from 'src/app/shared/pipes/date-time-pipe';
import { DeliveryOrdersCart } from './sales-order-cart/sales-orders-cart';
import { DeliveryOrderView } from './sales-order-view/sales-order-view';
import { MergePreview } from './sales-order-cart/merge-preview/merge-preview';
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
    MergePreview,
  ],
  templateUrl: './sales-orders.html',
  styleUrl: './sales-orders.scss',
})
export class DeliveryOrders
  extends ServerSideFilteredPaginatedComponent<IDeliveryOrder>
  implements OnInit, OnDestroy
{
  private destroy$ = new Subject<void>();
  private workTypeChange$ = new Subject<void>();
  units: IUnit[];
  businesses: IBusiness[];
  workTypes: { Id: number; Code: string; Name: string }[] = [];
  selectedWorkTypeId = 1;
  selectedUnitId: Number = 0;
  selectedBusinessId: Number = 0;
  selectedDeliveryOrders = signal<IDeliveryOrder[]>([]);
  cartOpen = signal(false);
  viewOpen = signal(false);
  OrderForView = signal<IDeliveryOrder | null>(null);

  // Merge policies for the cart's Unit + Business + Work Type
  mergePolicies = signal<IMergePolicy[]>([]);
  mergePoliciesLoading = signal(false);
  mergePoliciesError = signal<string | null>(null);
  isMerging = signal(false);
  private mergePolicyScopeKey: string | null = null;
  private mergePolicyRequest$ = new Subject<void>();

  // Merge preview: holds the exact body that Confirm will send to MergeDOs
  mergePreviewRequest = signal<IMergeDeliveryOrderRequest | null>(null);
  mergePreviewPolicyName = signal<string | null>(null);

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
    this.GetWorkTypes();
  }

  protected override fetchData(
    request: ServerQueryRequest,
  ): Observable<ServerQueryResponse<IDeliveryOrder>> {
    const workTypeCode =
      this.workTypes.find((type) => type.Id === this.selectedWorkTypeId)
        ?.Code ?? 'DO';

    return this.deliveryOrderService
      .GetDeliverOrders(
        request,
        this.selectedUnitId,
        this.selectedBusinessId,
        workTypeCode,
      )

      .pipe(
        takeUntil(this.workTypeChange$), // Cancel any ongoing requests if work type changes
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

  onWorkTypeFilterChange(): void {
    this.workTypeChange$.next();
    this.isLoading.set(true);
    this.error.set(null);

    this.selectedDeliveryOrders.set([]);
    this.cartOpen.set(false);
    this.OrderForView.set(null);
    this.viewOpen.set(false);
    this.resetMergePolicies();

    this.currentPage.set(1);
    this.retry();
  }

  GetWorkTypes(): void {
    this.commonService
      .getWorkTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        console.log('Work Types:', data);
        this.workTypes = data;
      });
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

      // Check Unit
      if (!this.canAddToCart(item)) {
        checkbox.checked = false;

        this.toaster.error(
          'You can only select orders from the same Unit and Business.',
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
          'All selected orders must have the same Unit and Business.',
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
    // The first order decides Unit/Business, so the scope may have changed
    if (this.cartOpen()) {
      this.loadMergePolicies();
    }
  }

  toggleCart() {
    this.cartOpen.update((value) => !value);
    if (this.cartOpen()) {
      this.loadMergePolicies();
    }
  }

  /** Unit/Business IDs of the cart, taken from the first selected order. */
  private getCartScope(): { unitId: number; businessId: number } | null {
    const first = this.selectedDeliveryOrders()[0];
    if (!first) {
      return null;
    }
    const unitId = this.units?.find((unit) => unit.Name === first.Unit)?.Id;
    const businessId = this.businesses?.find(
      (business) => business.Name === first.Business,
    )?.Id;
    if (!unitId || !businessId) {
      return null;
    }
    return { unitId: Number(unitId), businessId: Number(businessId) };
  }

  loadMergePolicies(force = false): void {
    const scope = this.getCartScope();
    if (!scope) {
      this.resetMergePolicies();
      if (this.selectedDeliveryOrders().length > 0) {
        this.mergePoliciesError.set(
          'Could not identify the Unit/Business of the selected orders.',
        );
      }
      return;
    }

    const workTypeCode = this.selectedWorkTypeCode;
    const key = `${scope.unitId}|${scope.businessId}|${workTypeCode}`;
    if (
      !force &&
      key === this.mergePolicyScopeKey &&
      !this.mergePoliciesError()
    ) {
      return; // already loaded for this scope
    }

    this.mergePolicyRequest$.next(); // cancel any in-flight request
    this.mergePolicyScopeKey = key;
    this.mergePoliciesLoading.set(true);
    this.mergePoliciesError.set(null);

    this.deliveryOrderService
      .GetMergePolicies(scope.unitId, scope.businessId, workTypeCode)
      .pipe(
        takeUntil(this.mergePolicyRequest$),
        takeUntil(this.destroy$),
        finalize(() => this.mergePoliciesLoading.set(false)),
      )
      .subscribe({
        next: (policies) => this.mergePolicies.set(policies ?? []),
        error: () => {
          this.mergePolicies.set([]);
          this.mergePoliciesError.set('Failed to load merge policies.');
        },
      });
  }

  private resetMergePolicies(): void {
    this.mergePolicyRequest$.next();
    this.mergePolicyScopeKey = null;
    this.mergePolicies.set([]);
    this.mergePoliciesLoading.set(false);
    this.mergePoliciesError.set(null);
  }

  closeCart() {
    this.cartOpen.set(false);
  }

  get selectedWorkTypeCode(): string {
    return (
      this.workTypes.find((type) => type.Id === this.selectedWorkTypeId)
        ?.Code ?? 'DO'
    );
  }

  openView(order: IDeliveryOrder): void {
    this.OrderForView.set(order);
    this.viewOpen.set(true);
  }

  closeView(): void {
    this.viewOpen.set(false);
  }

  /** Builds the body shared by PreviewMerge and MergeDOs. */
  private buildMergeRequest(
    mergePolicyId: number,
  ): IMergeDeliveryOrderRequest | null {
    const orders = this.selectedDeliveryOrders();
    const scope = this.getCartScope();
    if (!mergePolicyId || orders.length === 0 || !scope) {
      return null;
    }

    const first = orders[0];
    return {
      DeliveryOrderIds: orders.map((order) => order.SOID),
      MergePolicyId: mergePolicyId,
      WorkTypeCode: this.selectedWorkTypeCode,
      Remarks: null,
      DocumentCreatedBy: Number(localStorage.getItem('Enroll')),
      IsCombineDO: orders.length > 1,
      BusinessID: scope.businessId,
      UnitID: scope.unitId,
      Business: first.Business,
      Unit: first.Unit,
    };
  }

  /** Cart "Preview Merge" → open the preview with the exact merge body. */
  openMergePreview(mergePolicyId: number): void {
    const request = this.buildMergeRequest(mergePolicyId);
    if (!request) {
      this.toaster.error(
        'Could not prepare the merge. Check the selected orders and policy.',
      );
      return;
    }

    this.mergePreviewPolicyName.set(
      this.mergePolicies().find((p) => p.Id === mergePolicyId)?.Name ?? null,
    );
    this.mergePreviewRequest.set(request);
  }

  closeMergePreview(): void {
    if (!this.isMerging()) {
      this.mergePreviewRequest.set(null);
    }
  }

  /** Preview "Confirm Merge" → send the same body that was previewed. */
  confirmMerge(remarks: string | null): void {
    const request = this.mergePreviewRequest();
    if (!request) {
      return;
    }
    this.MergeDO({ ...request, Remarks: remarks });
  }

  private MergeDO(request: IMergeDeliveryOrderRequest) {
    if (this.isMerging()) {
      return;
    }

    this.isMerging.set(true);
    this.deliveryOrderService
      .MergeDO(request)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isMerging.set(false)),
      )
      .subscribe({
        next: (response) => {
          if (response?.Status) {
            this.toaster.success(
              response.Message || 'Merged successfully.',
              'Merge Completed',
            );
            this.mergePreviewRequest.set(null);
            this.cartOpen.set(false);
            this.selectedDeliveryOrders.set([]);
            this.retry();
          } else {
            // Keep the preview open so the user can adjust and retry.
            this.toaster.error(
              response?.Message || 'The merge could not be completed.',
              'Merge Failed',
            );
          }
        },
        error: (error: HttpErrorResponse) => {
          this.toaster.error(
            this.getApiErrorMessage(error, 'The merge could not be completed.'),
            'Merge Failed',
          );
        },
      });
  }

  /** Reads the backend message from an error response (IApiResponse body or plain text). */
  private getApiErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const body = error?.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (body?.Message) {
      return body.Message;
    }
    if (body?.errors) {
      // ASP.NET validation problem details: { errors: { Field: [msg] } }
      const messages = Object.values(body.errors as Record<string, string[]>)
        .flat()
        .filter(Boolean);
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }
    if (body?.title) {
      return body.title;
    }
    if (error?.status === 0) {
      return 'Cannot reach the server. Check your connection.';
    }
    return fallback;
  }

  /**
   * Exceptions to the "same Business" rule: within a Unit, orders from the
   * listed businesses may be merged together. Add a row for each new case.
   */
  private readonly crossBusinessMergeExceptions: {
    unitId: number;
    businessIds: number[];
  }[] = [{ unitId: 6, businessIds: [1, 2] }];

  /** Two orders can be merged if they share the Unit and the Business (or an exception allows it). */
  private canMergeTogether(a: IDeliveryOrder, b: IDeliveryOrder): boolean {
    if (a.Unit !== b.Unit) {
      return false;
    }
    if (a.Business === b.Business) {
      return true;
    }

    const unitId = this.units?.find((unit) => unit.Name === a.Unit)?.Id;
    const businessIdOf = (order: IDeliveryOrder) =>
      this.businesses?.find((business) => business.Name === order.Business)
        ?.Id;
    const businessA = businessIdOf(a);
    const businessB = businessIdOf(b);

    if (unitId == null || businessA == null || businessB == null) {
      return false;
    }

    return this.crossBusinessMergeExceptions.some(
      (rule) =>
        rule.unitId === unitId &&
        rule.businessIds.includes(businessA) &&
        rule.businessIds.includes(businessB),
    );
  }

  private canAddToCart(item: IDeliveryOrder): boolean {
    const selected = this.selectedDeliveryOrders();

    if (selected.length === 0) {
      return true;
    }

    return this.canMergeTogether(item, selected[0]);
  }

  private canSelectAll(items: IDeliveryOrder[]): boolean {
    if (items.length === 0) {
      return true;
    }

    const selected = this.selectedDeliveryOrders();

    // If cart already has items, compare against them
    const reference = selected.length > 0 ? selected[0] : items[0];

    return items.every((item) => this.canMergeTogether(item, reference));
  }

  ngOnDestroy(): void {
    this.workTypeChange$.next();
    this.workTypeChange$.complete();
    this.mergePolicyRequest$.complete();

    this.destroy$.next();
    this.destroy$.complete();
  }
}
