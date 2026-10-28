import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, finalize, takeUntil } from 'rxjs';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IViewRequisitionHeader } from 'src/app/core/model/Requisition/ViewRequisition';
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
export class RequisitionApproval extends ServerSideFilteredPaginatedComponent<IViewRequisitionHeader> implements OnInit, OnDestroy {
  readonly PermissionAction = PermissionAction;
  selectedUnitFilterId = 0;
  selectedBusinessFilterId = 0;
  readonly units = signal<IUnit[]>([]);
  readonly businesses = signal<IBusiness[]>([]);
  readonly documentStatuses = signal<IDropdownBind[]>([]);
  readonly businessesLoading = signal(false);
  readonly completingReqId = signal<number | null>(null);
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

  protected override fetchData(request: ServerQueryRequest): Observable<ServerQueryResponse<IViewRequisitionHeader>> {
    return this.approvalService.GetRequisition(request, this.selectedUnitFilterId, this.selectedBusinessFilterId);
  }

  onUnitFilterChange(unitId: number): void {
    this.cancelBusinesses$.next();
    this.selectedUnitFilterId = Number(unitId);
    this.selectedBusinessFilterId = 0;
    this.businesses.set([]);
    this.businessesLoading.set(false);
    this.currentPage.set(1);
    if (this.selectedUnitFilterId > 0) {
      this.loadBusinesses(this.selectedUnitFilterId);
    }
    this.retry();
  }

  onBusinessFilterChange(businessId: number): void {
    this.selectedBusinessFilterId = Number(businessId);
    this.currentPage.set(1);
    this.retry();
  }

  openViewModal(header: IViewRequisitionHeader): void {
    if (this.viewModalRef) {
      return;
    }
    try {
      const modalRef = this.modalService.open(RequisitionApprovalViewModalComponent, {
        fullscreen: true,
        windowClass: 'fullscreen-modal',
      });
      this.viewModalRef = modalRef;
      modalRef.componentInstance.header = header;
      const clearReference = (): void => {
        if (this.viewModalRef === modalRef) {
          this.viewModalRef = null;
        }
      };
      modalRef.result.then(clearReference, clearReference);
    } catch {
      this.viewModalRef = null;
      this.toastr.error('Unable to open the requisition details.');
    }
  }

  completeRequisition(reqId: number): void {
    if (this.completingReqId() !== null) {
      return;
    }
    if (!confirm('Are you sure you want to complete this requisition?')) {
      return;
    }
    this.completingReqId.set(reqId);
    this.approvalService.completeData(reqId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.completingReqId.set(null)),
      )
      .subscribe({
        next: response => {
          if (response.Status) {
            this.toastr.success(response.Message);
            this.retry();
            return;
          }
          this.toastr.info(response.Message || 'Unable to complete the requisition.');
        },
        error: error => {
          this.toastr.error(
            error?.error?.detail ??
            error?.error?.Detail ??
            error?.error?.message ??
            error?.error?.Message ??
            'Unable to complete the requisition.',
          );
        },
      });
  }

  getDocStatusName(docStatusId: number): string {
    return this.documentStatuses().find(status => Number(status.Id) === Number(docStatusId))?.Name ?? '-';
  }

  getDocStatusClass(docStatusId: number): string {
    const name = this.getDocStatusName(docStatusId).trim().toLowerCase();
    return ['pending', 'approve', 'reject', 'complete'].includes(name) ? name : '';
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
    this.viewModalRef?.dismiss('landing-destroyed');
    this.viewModalRef = null;
    this.destroy$.next();
    this.destroy$.complete();
    this.cancelBusinesses$.complete();
  }
}