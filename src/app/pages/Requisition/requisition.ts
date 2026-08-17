import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, takeUntil } from 'rxjs';

import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IViewRequisitionHeader } from 'src/app/core/model/Requisition/ViewRequisition';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';

import { CommonService } from 'src/app/core/services/Common/CommonService';
import { RequisitionService } from 'src/app/core/services/Requisition/requisition.service';

import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { DateTimePipe } from '../../shared/pipes/date-time-pipe';

import { RequisitionViewModalComponent } from './RequisitionComponents/requisition-view-modal.component';
import { RequisitionFormModalComponent } from './RequisitionComponents/requisition-form-modal.component';

@Component({
  selector: 'app-requisition',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, DateTimePipe],
  templateUrl: './requisition.html',
  styleUrl: './requisition.scss',
})
export class Requisition
  extends ServerSideFilteredPaginatedComponent<IViewRequisitionHeader>
  implements OnInit, OnDestroy
{
  selectedUnitFilterId = 0;
  selectedBusinessFilterId = 0;

  readonly units = signal<IUnit[]>([]);
  readonly businesses = signal<IBusiness[]>([]);
  readonly businessesLoading = signal(false);
  readonly deletingReqId = signal<number | null>(null);

  private viewModalRef: NgbModalRef | null = null;
  private formModalRef: NgbModalRef | null = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly commonService: CommonService,
    private readonly modalService: NgbModal,
    private readonly requisitionService: RequisitionService,
    private readonly toastr: ToastrService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.loadUnits();
  }

  protected override fetchData(
    request: ServerQueryRequest,
  ): Observable<ServerQueryResponse<IViewRequisitionHeader>> {
    return this.requisitionService.GetRequisition(
      request,
      this.selectedUnitFilterId,
      this.selectedBusinessFilterId,
    );
  }

  onUnitFilterChange(unitId: number): void {
    this.selectedUnitFilterId = Number(unitId);
    this.selectedBusinessFilterId = 0;

    this.businesses.set([]);
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
    if (this.viewModalRef || this.formModalRef) {
      return;
    }

    try {
      const modalRef = this.modalService.open(RequisitionViewModalComponent, {
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

  openCreateModal(): void {
    this.openFormModal('create');
  }

  openEditModal(header: IViewRequisitionHeader): void {
    this.openFormModal('edit', header);
  }

  deleteRequisition(reqId: number): void {
    if (this.deletingReqId() !== null) {
      return;
    }

    const confirmed = confirm(
      'Are you sure you want to delete this requisition?',
    );

    if (!confirmed) {
      return;
    }

    this.deletingReqId.set(reqId);

    this.requisitionService
      .deleteData(reqId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.deletingReqId.set(null);

          if (response.Status) {
            this.toastr.success(response.Message);

            this.retry();
            return;
          }

          this.toastr.error(
            response.Message || 'Unable to delete the requisition.',
          );
        },
        error: (error) => {
          this.deletingReqId.set(null);

          const message =
            error?.error?.detail ??
            error?.error?.Detail ??
            error?.error?.message ??
            error?.error?.Message ??
            'Unable to delete the requisition.';

          this.toastr.error(message);
        },
      });
  }

  getDocStatusName(docStatusId: number): string {
    switch (docStatusId) {
      case 1:
        return 'Pending';

      case 2:
        return 'Approve';

      case 3:
        return 'Reject';

      default:
        return '-';
    }
  }

  private loadUnits(): void {
    this.commonService
      .GetUnitList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (units) => {
          this.units.set(units);
        },
        error: () => {
          this.units.set([]);

          this.toastr.error('Unable to load the Unit filter.');
        },
      });
  }

  private loadBusinesses(unitId: number): void {
    this.businessesLoading.set(true);

    this.commonService
      .GetBusinessList(unitId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (businesses) => {
          if (this.selectedUnitFilterId !== unitId) {
            return;
          }

          this.businesses.set(businesses);

          this.businessesLoading.set(false);
        },
        error: () => {
          if (this.selectedUnitFilterId !== unitId) {
            return;
          }

          this.businesses.set([]);
          this.businessesLoading.set(false);

          this.toastr.error('Unable to load the Business filter.');
        },
      });
  }

  private openFormModal(
    mode: 'create' | 'edit',
    header: IViewRequisitionHeader | null = null,
  ): void {
    if (this.formModalRef || this.viewModalRef) {
      return;
    }

    try {
      const modalRef = this.modalService.open(RequisitionFormModalComponent, {
        fullscreen: true,
        backdrop: 'static',
        keyboard: false,
        windowClass: 'requisition-fullscreen-modal',
      });

      this.formModalRef = modalRef;

      modalRef.componentInstance.mode = mode;

      modalRef.componentInstance.header = header;

      const clearReference = (): void => {
        if (this.formModalRef === modalRef) {
          this.formModalRef = null;
        }
      };

      modalRef.result.then(
        (result) => {
          clearReference();

          if (!result?.changed) {
            return;
          }

          if (mode === 'create') {
            this.currentPage.set(1);
          }

          this.retry();
        },
        () => {
          clearReference();
        },
      );
    } catch {
      this.formModalRef = null;

      this.toastr.error(
        mode === 'edit'
          ? 'Unable to open the requisition for editing.'
          : 'Unable to open the requisition form.',
      );
    }
  }

  ngOnDestroy(): void {
    this.viewModalRef?.dismiss('landing-destroyed');

    this.formModalRef?.dismiss('landing-destroyed');

    this.viewModalRef = null;
    this.formModalRef = null;

    this.destroy$.next();
    this.destroy$.complete();
  }
}
