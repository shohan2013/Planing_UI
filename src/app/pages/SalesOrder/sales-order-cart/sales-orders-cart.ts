import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { DateTimePipe } from '../../../shared/pipes/date-time-pipe';
import {
  IDeliveryOrder,
  IMergePolicy,
} from 'src/app/core/model/SalesOrder/sales-order-model';
import { DeliveryOrderView } from '../sales-order-view/sales-order-view';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-delivery-orders-cart',
  standalone: true,
  imports: [DateTimePipe, DeliveryOrderView, DecimalPipe],
  templateUrl: './sales-orders-cart.html',
  styleUrl: './sales-orders-cart.scss',
})
export class DeliveryOrdersCart implements OnChanges {
  @Input() isOpen = false;

  @Input() selectedOrders: IDeliveryOrder[] = [];

  @Input() workTypeCode = 'DO';

  // Merge policy inputs (loaded by the parent for the cart's Unit/Business)
  @Input() policies: IMergePolicy[] = [];
  @Input() policiesLoading = false;
  @Input() policiesError: string | null = null;
  @Input() isMerging = false;

  @Output() closeCart = new EventEmitter<void>();

  /** Emits the selected merge policy Id. */
  @Output() nextStep = new EventEmitter<number>();

  @Output() removeOrder = new EventEmitter<Number>();

  @Output() reloadPolicies = new EventEmitter<void>();

  viewOpen = signal(false);
  OrderForView = signal<IDeliveryOrder | null>(null);
  selectedPolicyId = signal<number | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['policies']) {
      this.syncPolicySelection();
    }
  }

  /**
   * Keep the user's choice if it is still available; otherwise pick the
   * backend default, or the only policy when there is just one.
   */
  private syncPolicySelection(): void {
    const list = this.policies ?? [];
    const current = this.selectedPolicyId();

    if (current !== null && list.some((p) => p.Id === current)) {
      return;
    }

    const preferred =
      list.find((p) => p.IsDefault) ?? (list.length === 1 ? list[0] : null);

    this.selectedPolicyId.set(preferred?.Id ?? null);
  }

  get selectedPolicy(): IMergePolicy | null {
    return this.policies.find((p) => p.Id === this.selectedPolicyId()) ?? null;
  }

  get canMerge(): boolean {
    return (
      this.selectedOrders.length > 0 &&
      this.selectedPolicyId() !== null &&
      !this.policiesLoading &&
      !this.isMerging
    );
  }

  /** Short reason shown under the button when merge is not possible. */
  get mergeBlockedReason(): string | null {
    if (this.isMerging || this.policiesLoading) {
      return null;
    }
    if (this.selectedOrders.length === 0) {
      return 'Add at least one order to merge.';
    }
    if (this.policiesError) {
      return 'Merge policies could not be loaded.';
    }
    if (this.policies.length === 0) {
      return 'No merge policy is configured for this Unit / Business.';
    }
    if (this.selectedPolicyId() === null) {
      return 'Choose a merge policy to continue.';
    }
    return null;
  }

  selectPolicy(id: number): void {
    if (!this.isMerging) {
      this.selectedPolicyId.set(id);
    }
  }

  removeDO(event: MouseEvent, id: Number) {
    event.stopPropagation();
    this.removeOrder.emit(id);
  }

  close() {
    this.closeCart.emit();
  }

  MergeOrSplit() {
    const policyId = this.selectedPolicyId();
    if (!this.canMerge || policyId === null) {
      return;
    }
    this.nextStep.emit(policyId);
  }

  ViewOrder(order: IDeliveryOrder): void {
    this.OrderForView.set(order);
    this.viewOpen.set(true);
  }

  closeView(): void {
    this.viewOpen.set(false);
  }
}
