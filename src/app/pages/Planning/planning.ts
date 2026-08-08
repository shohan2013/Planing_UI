import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { DeliveryOrders } from '../delivery-orders/delivery-orders';

@Component({
  selector: 'app-planning',
  imports: [DeliveryOrders],
  templateUrl: './planning.html',
  styleUrl: './planning.scss',
})
export class Planning implements OnInit, OnDestroy {
  searchText = '';
  selectedId: number;
  //paginatedItems: IPermission[] = [];
  EmpList: any[] = []; // dropdown source
  selectedUser: number;
  search$ = new Subject<string>();
  private destroy$ = new Subject<void>();
  currentJustify = 'start';
  currentOrientation = 'horizontal';
  disabled = true; // For disabled tab examples

  constructor(
    private commonservice: CommonService,
    private modalService: NgbModal,
  ) {}
  ngOnInit(): void {
    this.GetEmpInfo();
  }

  activeTab = signal<string>('deliveryOrders');

  onTabChange(tab: string) {
    this.activeTab.set(tab);
  }

  PermissionModal(content: any) {
    this.modalService.open(content, {
      size: 'lg',
    });
  }

  GetEmpInfo() {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.commonservice.GetEmpData(term)),
      )
      .subscribe((data) => {
        this.EmpList = data;
      });
  }

  isActive = signal(false);

  toggle() {
    this.isActive.update((v) => !v);
  }

  trackById(index: number, item: any): number {
    return item.Id;
  }

  //selectedCustomer: number | null = null;

  onSearch(event: any) {
    const term = event.term;

    if (!term || term.length < 2) {
      this.EmpList = [];
      return;
    }

    this.search$.next(term);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
