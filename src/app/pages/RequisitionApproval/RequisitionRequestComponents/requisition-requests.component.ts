import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  OnInit,
  TemplateRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, finalize, of, takeUntil } from 'rxjs';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { DocumentStatusId, getDocumentStatusClass } from 'src/app/core/model/document-status';
import { IRequisitionLineHistory } from 'src/app/core/model/Requisition/RequisitionEdit';
import { IViewRequisitionLine } from 'src/app/core/model/Requisition/ViewRequisition';
import { IRequisitionRequestHeader } from 'src/app/core/model/RequisitionApproval/requisition-request-header.model';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { RequisitionService } from 'src/app/core/services/Requisition/requisition.service';
import { RequisitionApprovalService } from 'src/app/core/services/RequisitionApproval/requisition-approval.service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';

interface HistoryBatch {
  request: IRequisitionLineHistory;
  assignment: IRequisitionLineHistory | null;
  actionTakers: IRequisitionLineHistory[];
}

@Component({
  selector: 'app-requisition-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './requisition-requests.component.html',
  styleUrl: './requisition-requests.component.scss',
})
export class RequisitionRequestsComponent
  extends ServerSideFilteredPaginatedComponent<IRequisitionRequestHeader>
  implements OnInit
{
  private readonly commonService = inject(CommonService);
  private readonly approvalService = inject(RequisitionApprovalService);
  private readonly requisitionService = inject(RequisitionService);
  private readonly modalService = inject(NgbModal);
  private readonly toastr = inject(ToastrService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly cancelBusinesses$ = new Subject<void>();
  private readonly cancelDetails$ = new Subject<void>();
  private readonly cancelHistory$ = new Subject<void>();

  private detailsModalRef: NgbModalRef | null = null;
  private historyModalRef: NgbModalRef | null = null;
  private refreshListOnClose = false;

  readonly enroll = Number(localStorage.getItem('Enroll'));
  readonly units = signal<IUnit[]>([]);
  readonly businesses = signal<IBusiness[]>([]);
  readonly documentStatuses = signal<IDropdownBind[]>([]);
  readonly businessesLoading = signal(false);

  selectedUnitFilterId = 0;
  selectedBusinessFilterId = 0;

  readonly selectedHeader = signal<IRequisitionRequestHeader | null>(null);
  readonly lines = signal<IViewRequisitionLine[]>([]);

  readonly lineSearch = signal('');

  private readonly linesByProduct = computed(() => {
    const lookup = new Map<string, Map<number, IViewRequisitionLine>>();
    for (const line of this.lines()) {
      const key = `${Number(line.ProductTypeId)}:${Number(line.ItemId)}`;
      let productLines = lookup.get(key);
      if (!productLines) {
        productLines = new Map<number, IViewRequisitionLine>();
        lookup.set(key, productLines);
      }
      productLines.set(line.ID, line);
    }
    return lookup;
  });

  readonly filteredLines = computed(() => {
    const lines = this.lines();
    const search = this.lineSearch().trim().toLowerCase();
    if (!search) return lines;

    return lines.filter(line =>
      (line.ItemName ?? '').toLowerCase().includes(search) ||
      String(line.ItemId).includes(search));
  });


  readonly totalQuantity = computed(() => this.lines().reduce((total, line) => total + line.Quantity, 0) );
  readonly loadingLines = signal(false);
  readonly linesError = signal('');

  readonly selectedLine = signal<IViewRequisitionLine | null>(null);
  readonly history = signal<HistoryBatch[]>([]);
  
  readonly loadingHistory = signal(false);
  readonly historyError = signal('');
  readonly viewedActionTakersBatchId = signal<string | null>(null);
  readonly deciding = signal(false);

  ngOnInit(): void {
    this.commonService.GetDocumentStatusList()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
            next: statuses => this.documentStatuses.set(statuses),
            error: () => this.toastr.error('Unable to load document statuses.'),
    });

    this.commonService.GetUnitList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: units => this.units.set(units),
        error: () => this.toastr.error('Unable to load units.'),
      });

    this.destroyRef.onDestroy(() => {
      this.refreshListOnClose = false;
      this.historyModalRef?.dismiss('page-destroyed');
      this.detailsModalRef?.dismiss('page-destroyed');
    });
  }

  protected override fetchData(
    request: ServerQueryRequest,
  ): Observable<ServerQueryResponse<IRequisitionRequestHeader>> {
    if (!this.selectedUnitFilterId || !Number.isInteger(this.enroll) || this.enroll <= 0) {
      return of<ServerQueryResponse<IRequisitionRequestHeader>>({
        Data: [],
        Total: 0,
        Page: request.page,
        PageSize: request.pageSize,
        TotalPages: 0,
        });
    }

    return this.approvalService.GetRequestHeaders(
      request,
      this.enroll,
      this.selectedUnitFilterId,
      this.selectedBusinessFilterId,
    );
  }

  onUnitFilterChange(unitId: number): void {
    this.cancelBusinesses$.next();
    this.selectedUnitFilterId = Number(unitId);
    this.selectedBusinessFilterId = 0;
    this.businesses.set([]);
    this.currentPage.set(1);
    this.retry();

    if (!this.selectedUnitFilterId) return;

    this.businessesLoading.set(true);
    this.commonService.GetBusinessList(this.selectedUnitFilterId)
      .pipe(
        takeUntil(this.cancelBusinesses$),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.businessesLoading.set(false)),
      )
      .subscribe({
        next: businesses => this.businesses.set(businesses),
        error: () => this.toastr.error('Unable to load businesses.'),
      });
  }

  onBusinessFilterChange(businessId: number): void {
    this.selectedBusinessFilterId = Number(businessId);
    this.currentPage.set(1);
    this.retry();
  }

  openResolve(
    header: IRequisitionRequestHeader,
    template: TemplateRef<unknown>,
  ): void {
    if (this.detailsModalRef) return;

    this.selectedHeader.set(header);
    this.lineSearch.set('');
    this.lines.set([]);
    
    this.refreshListOnClose = false;

    const ref = this.modalService.open(template, {
      fullscreen: true,
      windowClass: 'fullscreen-modal',
      backdrop: 'static',
      keyboard: false,
      ariaLabelledBy: 'resolve-requisition-title',
    });

    this.detailsModalRef = ref;
    const onClose = (): void => {
      this.cancelDetails$.next();
      this.detailsModalRef = null;
      this.selectedHeader.set(null);
      if (this.refreshListOnClose) this.retry();
    };

    void ref.result.then(onClose, onClose);
    this.loadLines();
  }

  getDocStatusClass(statusId: number): string {
    return getDocumentStatusClass(statusId);
  }

  getDocStatusName(statusId: number): string {
    return this.documentStatuses().find(status => Number(status.Id) === Number(statusId))?.Name
        ?? `Status ${statusId}`;
  }

  loadLines(): void {
    const header = this.selectedHeader();
    if (!header) return;

    this.cancelDetails$.next();
    this.loadingLines.set(true);
    this.linesError.set('');

    this.requisitionService.GetLinesByReqId(header.ReqID)
      .pipe(
        takeUntil(this.cancelDetails$),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingLines.set(false)),
      )
      .subscribe({
        next: lines => {
          const activeLines = lines.filter(line => line.IsActive);
          this.lines.set(activeLines);

          const selected = this.selectedLine();
          if (selected) {
            const key = `${Number(selected.ProductTypeId)}:${Number(selected.ItemId)}`;
            this.selectedLine.set(this.linesByProduct().get(key)?.get(selected.ID) ?? null);
          }
        },
        error: error => {
            const body = error.error;
            const message = typeof body === 'string'
                ? body.trim()
                : body?.detail || body?.Message || body?.message || body?.title;

            const status = error.status ? ` (HTTP ${error.status})` : '';
            this.linesError.set(`Unable to load requisition lines${status}.${message ? ` ${message}` : ''}`);
            },
      });
  }

  openHistory(line: IViewRequisitionLine, template: TemplateRef<unknown>): void {
    if (this.historyModalRef) return;

    this.selectedLine.set(line);
    this.viewedActionTakersBatchId.set(null);

    const ref = this.modalService.open(template, {
      fullscreen: true,
      windowClass: 'fullscreen-modal',
      scrollable: true,
      backdrop: 'static',
      keyboard: false,
      ariaLabelledBy: 'resolver-history-title',
    });

    this.historyModalRef = ref;
    const onClose = (): void => {
      this.cancelHistory$.next();
      this.historyModalRef = null;
      this.selectedLine.set(null);
      this.history.set([]);
    };

    void ref.result.then(onClose, onClose);
    this.loadHistory();
  }

  loadHistory(): void {
    const line = this.selectedLine();
    if (!line) return;

    this.cancelHistory$.next();
    this.loadingHistory.set(true);
    this.historyError.set('');

    this.requisitionService.GetLineHistory(line.ID)
      .pipe(
        takeUntil(this.cancelHistory$),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingHistory.set(false)),
      )
      .subscribe({
        next: rows => {
          const batches = new Map<string, HistoryBatch>();

          for (const row of rows) {
            let batch = batches.get(row.RequestBatchId);
            if (!batch) {
              batch = { request: row, assignment: null, actionTakers: [] };
              batches.set(row.RequestBatchId, batch);
            }

            batch.actionTakers.push(row);
            if (row.ActionTaker === this.enroll) batch.assignment = row;
          }

          this.history.set([...batches.values()]);
          
        },
        error: () => this.historyError.set('Unable to load request history.'),
      });
  }

  toggleActionTakers(batchId: string): void {
    this.viewedActionTakersBatchId.update(current => current === batchId ? null : batchId);
  }

  canDecide(batch: HistoryBatch): boolean {
    const header = this.selectedHeader();
    const assignment = batch.assignment;

    return !!header &&
      header.DocStatusId !== DocumentStatusId.Completed &&
      header.DocStatusId !== 5 &&
      !!assignment &&
      assignment.IsActive &&
      assignment.StatusCode === 'PEND' &&
      assignment.ActionTakenBy == null &&
      !this.loadingHistory() &&
      !this.historyError() &&
      !this.deciding();
  }

  decide(batch: HistoryBatch, accept: boolean): void {
    const assignment = batch.assignment;
    if (!assignment || !this.canDecide(batch)) return;

    const message = window.prompt(
      accept ? 'Accept this request? Enter action remarks (optional).'
        : 'Reject this request? Enter action remarks (optional).',
    );
    if (message === null) return;

    const remarks = message.trim() || null;
    this.deciding.set(true);
    const decision$ = accept
      ? this.approvalService.AcceptRequest(assignment.ID, this.enroll, remarks)
      : this.approvalService.RejectRequest(assignment.ID, this.enroll, remarks);

    decision$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.deciding.set(false)),
      )
      .subscribe({
        next: response => {
          this.refreshListOnClose = true;

          if (response.Status) {
            this.toastr.success(response.Message || (accept ? 'Request accepted.' : 'Request rejected.'));
          } else {
            this.toastr.error(response.Message || 'Unable to resolve the request.');
          }

          this.loadLines();
          this.loadHistory();
        },
        error: error => {
          const body = error.error;
          const message = typeof body === 'string'
            ? body
            : body?.Message ?? body?.message ?? body?.detail;

          this.toastr.error(message || 'Unable to resolve the request.');
        },
      });
  }
}