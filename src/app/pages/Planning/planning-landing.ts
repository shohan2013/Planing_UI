import { Component, OnDestroy, signal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  Subject,
  switchMap,
} from 'rxjs';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { DeliveryOrders } from '../SalesOrder/sales-orders';
import { MergedPlanning } from '../MergedPlanning/merged-planning';
import { PlanningHistoryList } from '../PlanningHistory/planning-history-list/planning-history-list';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
@Component({
  selector: 'app-planning',
  imports: [DeliveryOrders, MergedPlanning, PlanningHistoryList],
  templateUrl: './planning-landing.html',
  styleUrl: './planning-landing.scss',
})
export class Planning implements OnDestroy {
  private destroy$ = new Subject<void>();

  private tabChange$ = new Subject<string>();

  activeTab = signal<string>('mergeOrSplit');
  renderedTab = signal<string>('mergeOrSplit');

  constructor(private modalService: NgbModal) {
    this.tabChange$
      .pipe(debounceTime(1000), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((tab) => {
        this.renderedTab.set(tab);
      });
  }

  onTabChange(tab: string) {
    this.activeTab.set(tab);
    this.tabChange$.next(tab);
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
