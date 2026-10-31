import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Observable, Subject, finalize, takeUntil } from 'rxjs';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IRequisitionApprovalHeader } from 'src/app/core/model/RequisitionApproval/requisition-approval.model';
import { ServerQueryRequest, ServerQueryResponse } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { RequisitionApprovalService } from 'src/app/core/services/RequisitionApproval/requisition-approval.service';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { DateTimePipe } from '../../shared/pipes/date-time-pipe';
import { MenuPermissionDirective } from 'src/app/core/directives/menu-permission.directive';
import { PermissionAction } from 'src/app/core/services/Authorization/authorization.service';
import { RequisitionApprovalViewModalComponent } from './RequisitionApprovalComponents/requisition-approval-view-modal.component';

@Component({
  selector: 'app-requisition-approval',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, DateTimePipe, MenuPermissionDirective],
  templateUrl: './requisitionapproval.html',
  styleUrl: './requisitionapproval.scss',
})
export class RequisitionApproval extends ServerSideFilteredPaginatedComponent<IRequisitionApprovalHeader> implements OnInit, OnDestroy {
  readonly PermissionAction = PermissionAction;
  selectedStatusId = 0;
  selectedUnitFilterId: number | null = null;
  selectedBusinessFilterId = 0;
  readonly units = signal<IUnit[]>([]);
  readonly businesses = signal<IBusiness[]>([]);
  readonly documentStatuses = signal<IDropdownBind[]>([]);
  readonly businessesLoading = signal(false);
  private viewModalRef: NgbModalRef | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly cancelBusinesses$ = new Subject<void>();

  constructor(private readonly commonService: CommonService, private readonly modalService: NgbModal, private readonly approvalService: RequisitionApprovalService, private readonly toastr: ToastrService) {
    super();
  }

  ngOnInit(): void {
    this.loadUnits();
    this.loadDocumentStatuses();
  }

  get approvalStatuses(): IDropdownBind[] {
    return this.documentStatuses().filter(status => Number(status.Id) === 2 || Number(status.Id) === 4);
  }

  get selectedStatusCode(): string {
    if (this.selectedStatusId === 2) return 'PEND';
    if (this.selectedStatusId === 4) return 'APPR';
    return '';
  }

  protected override fetchData(request: ServerQueryRequest): Observable<ServerQueryResponse<IRequisitionApprovalHeader>> {
    if (!this.selectedStatusCode) return EMPTY;
    const enroll = Number(localStorage.getItem('Enroll'));
    if (!enroll) {
      this.toastr.error('Unable to identify the current user.');
      return EMPTY;
    }
    return this.approvalService.GetData(request, enroll, this.selectedStatusCode, this.selectedUnitFilterId, this.selectedBusinessFilterId);
  }

  onStatusChange(statusId: number): void {
    this.selectedStatusId = Number(statusId);
    this.currentPage.set(1);
    if (this.selectedStatusCode) this.retry();
  }

  onUnitFilterChange(unitId: number | null): void {
    this.cancelBusinesses$.next();
    this.selectedUnitFilterId = unitId === null ? null : Number(unitId);
    this.selectedBusinessFilterId = 0;
    this.businesses.set([]);
    this.businessesLoading.set(false);
    this.currentPage.set(1);
    if (this.selectedUnitFilterId !== null && this.selectedUnitFilterId > 0) {
      this.loadBusinesses(this.selectedUnitFilterId);
    }
    if (this.selectedStatusCode) this.retry();
  }

  onBusinessFilterChange(businessId: number): void {
    this.selectedBusinessFilterId = Number(businessId);
    this.currentPage.set(1);
    if (this.selectedStatusCode) this.retry();
  }

  openViewModal(header: IRequisitionApprovalHeader): void {
    if (this.viewModalRef || !this.selectedStatusCode) return;
    try {
      const modalRef = this.modalService.open(RequisitionApprovalViewModalComponent, {
        fullscreen: true,
        windowClass: 'fullscreen-modal',
      });
      this.viewModalRef = modalRef;
      modalRef.componentInstance.header = header;
      modalRef.componentInstance.docStatus = this.selectedStatusCode;
      const clearReference = (): void => {
        if (this.viewModalRef === modalRef) this.viewModalRef = null;
      };
      modalRef.result.then(clearReference, clearReference);
    } catch {
      this.viewModalRef = null;
      this.toastr.error('Unable to open the requisition details.');
    }
  }

  private loadUnits(): void {
    this.commonService.GetUnitList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: units => this.units.set(units),
        error: () => {
          this.units.set([]);
          this.toastr.error('Unable to load the Unit filter.');
        },
      });
  }

  private loadBusinesses(unitId: number): void {
    this.businessesLoading.set(true);
    this.commonService.GetBusinessList(unitId)
      .pipe(
        takeUntil(this.cancelBusinesses$),
        takeUntil(this.destroy$),
        finalize(() => this.businessesLoading.set(false)),
      )
      .subscribe({
        next: businesses => this.businesses.set(businesses),
        error: () => {
          this.businesses.set([]);
          this.toastr.error('Unable to load the Business filter.');
        },
      });
  }

  private loadDocumentStatuses(): void {
    this.commonService.GetDocumentStatusList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: statuses => this.documentStatuses.set(statuses),
        error: () => {
          this.documentStatuses.set([]);
          this.toastr.error('Unable to load document statuses.');
        },
      });
  }

  ngOnDestroy(): void {
    this.viewModalRef?.dismiss('approval-page-destroyed');
    this.viewModalRef = null;
    this.destroy$.next();
    this.destroy$.complete();
    this.cancelBusinesses$.next();
    this.cancelBusinesses$.complete();
  }
}