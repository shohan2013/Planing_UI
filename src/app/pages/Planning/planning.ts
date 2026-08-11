import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { DeliveryOrders } from '../delivery-orders/delivery-orders';
import {
  IDeliveryOrder,
  IDeliveryOrderLine,
} from 'src/app/core/model/DeliveryOrder/delivery-order-model';

@Component({
  selector: 'app-planning',
  imports: [DeliveryOrders],
  templateUrl: './planning.html',
  styleUrl: './planning.scss',
})
export class Planning implements OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    private commonservice: CommonService,
    private modalService: NgbModal,
  ) {}

  activeTab = signal<string>('mergeOrSplit');

  onTabChange(tab: string) {
    this.activeTab.set(tab);
  }

  PermissionModal(content: any) {
    this.modalService.open(content, {
      size: 'lg',
    });
  }

  isActive = signal(false);

  toggle() {
    this.isActive.update((v) => !v);
  }

  trackById(index: number, item: any): number {
    return item.Id;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
