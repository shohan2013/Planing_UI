import { Component,OnDestroy,signal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { DeliveryOrders } from '../SalesOrder/sales-orders';
import { MergedPlanning } from '../MergedPlanning/merged-planning';
import { PlanningHistoryList } from '../PlanningHistory/planning-history-list/planning-history-list';
@Component({
  selector: 'app-planning',
  imports: [DeliveryOrders, MergedPlanning, PlanningHistoryList],
  templateUrl: './planning-landing.html',
  styleUrl: './planning-landing.scss',
})
export class Planning implements OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(private modalService: NgbModal) {}

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
