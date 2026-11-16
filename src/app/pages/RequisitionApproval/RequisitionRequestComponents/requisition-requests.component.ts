import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, TemplateRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbActiveModal, NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Subject, finalize, takeUntil } from 'rxjs';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { DocumentStatusId, getDocumentStatusClass } from 'src/app/core/model/document-status';
import { IRequisitionLineHistory } from 'src/app/core/model/Requisition/RequisitionEdit';
import { IViewRequisitionLine } from 'src/app/core/model/Requisition/ViewRequisition';
import { IRequisitionApprovalHeader } from 'src/app/core/model/RequisitionApproval/requisition-approval.model';
import { IRequisitionRequestNotification } from 'src/app/core/model/RequisitionApproval/requisition-request-header.model';
import { RequisitionService } from 'src/app/core/services/Requisition/requisition.service';
import { RequisitionApprovalService } from 'src/app/core/services/RequisitionApproval/requisition-approval.service';

interface HistoryBatch {
  request: IRequisitionLineHistory;
  actionTakers: IRequisitionLineHistory[];
}

@Component({
  selector: 'app-requisition-requests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './requisition-requests.component.html',
  styleUrl: './requisition-requests.component.scss',
})
export class RequisitionRequestsComponent implements OnInit {
  @Input({ required: true }) header!: IRequisitionApprovalHeader | IRequisitionRequestNotification;
  @Input() documentStatuses: IDropdownBind[] = [];

  readonly getDocStatusClass = getDocumentStatusClass;
  readonly lines = signal<IViewRequisitionLine[]>([]);
  readonly lineSearch = signal('');
  readonly loadingLines = signal(false);
  readonly linesError = signal('');
  readonly selectedLine = signal<IViewRequisitionLine | null>(null);
  readonly history = signal<HistoryBatch[]>([]);
  readonly loadingHistory = signal(false);
  readonly historyError = signal('');
  readonly viewedActionTakersBatchId = signal<string | null>(null);
  readonly deciding = signal(false);

  readonly totalQuantity = computed(() =>
    this.lines().reduce((total, line) => total + line.Quantity, 0));

  readonly filteredLines = computed(() => {
    const search = this.lineSearch().trim().toLowerCase();
    return this.lines().filter(line =>
      (line.ItemName ?? '').toLowerCase().includes(search) ||
      String(line.ItemId).includes(search));
  });

  private readonly destroyRef = inject(DestroyRef);
  private readonly cancelHistory$ = new Subject<void>();
  private readonly enroll = Number(localStorage.getItem('Enroll'));
  private historyModalRef: NgbModalRef | null = null;
  private requestsChanged = false;

  constructor(
    private readonly activeModal: NgbActiveModal,
    private readonly modalService: NgbModal,
    private readonly approvalService: RequisitionApprovalService,
    private readonly requisitionService: RequisitionService,
    private readonly toastr: ToastrService,
  ) {
    this.destroyRef.onDestroy(() => {
      this.historyModalRef?.dismiss('parent-closed');
      this.cancelHistory$.complete();
    });
  }

  ngOnInit(): void {
    this.loadLines();
  }

  getDocStatusName(statusId: number): string {
    return this.documentStatuses.find(status => Number(status.Id) === Number(statusId))?.Name
      ?? `Status ${statusId}`;
  }

  loadLines(): void {
    if (this.loadingLines()) return;

    this.loadingLines.set(true);
    this.linesError.set('');

    this.approvalService.GetDetails(this.header.ReqID, 'APPR').pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingLines.set(false)),
    ).subscribe({
      next: details => {
        const lines = details.Lines.filter(line => line.IsActive);
        this.lines.set(lines);

        const selected = this.selectedLine();
        if (selected) {
          this.selectedLine.set(lines.find(line => line.ID === selected.ID) ?? selected);
        }
      },
      error: () => this.linesError.set('Unable to load requisition lines.'),
    });
  }

  openHistory(line: IViewRequisitionLine, template: TemplateRef<unknown>): void {
    if (this.historyModalRef) return;

    const ref = this.modalService.open(template, {
      fullscreen: true,
      windowClass: 'fullscreen-modal',
      scrollable: true,
      backdrop: 'static',
      keyboard: false,
      ariaLabelledBy: 'resolver-history-title',
    });

    this.historyModalRef = ref;
    this.selectedLine.set(line);
    this.history.set([]);
    this.viewedActionTakersBatchId.set(null);

    const clearHistory = (): void => {
      this.cancelHistory$.next();
      this.historyModalRef = null;
      this.selectedLine.set(null);
      this.history.set([]);
    };
    void ref.result.then(clearHistory, clearHistory);

    this.loadHistory();
  }

  loadHistory(): void {
    const line = this.selectedLine();
    if (!line || this.loadingHistory()) return;

    this.loadingHistory.set(true);
    this.historyError.set('');

    this.requisitionService.GetLineHistory(line.ID).pipe(
      takeUntil(this.cancelHistory$),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingHistory.set(false)),
    ).subscribe({
      next: rows => {
        const batches = new Map<string, HistoryBatch>();

        for (const row of rows) {
          const batch = batches.get(row.RequestBatchId);
          if (batch) {
            batch.actionTakers.push(row);
          } else {
            batches.set(row.RequestBatchId, { request: row, actionTakers: [row] });
          }
        }

        this.history.set([...batches.values()]);
      },
      error: () => this.historyError.set('Unable to load request history.'),
    });
  }

  toggleActionTakers(batchId: string): void {
    this.viewedActionTakersBatchId.update(current => current === batchId ? null : batchId);
  }

  private pendingAssignment(batch: HistoryBatch): IRequisitionLineHistory | undefined {
    if (!Number.isInteger(this.enroll) || this.enroll <= 0) return undefined;

    return batch.actionTakers.find(row =>
      row.ActionTaker === this.enroll &&
      row.IsActive &&
      row.StatusCode === 'PEND' &&
      row.ActionTakenBy == null);
  }

  canDecide(batch: HistoryBatch): boolean {
    return this.header.DocStatusId !== DocumentStatusId.Completed &&
      this.header.DocStatusId !== 5 &&
      !this.loadingHistory() &&
      !this.historyError() &&
      !this.deciding() &&
      !!this.pendingAssignment(batch);
  }

  decide(batch: HistoryBatch, accept: boolean): void {
    if (!this.canDecide(batch)) return;

    const assignment = this.pendingAssignment(batch);
    if (!assignment) return;

    const message = window.prompt(
      accept ? 'Accept this request? Enter action remarks (optional).'
        : 'Reject this request? Enter action remarks (optional).',
    );
    if (message === null) return;

    const remarks = message.trim() || null;
    const decision$ = accept
      ? this.approvalService.AcceptRequest(assignment.ID, this.enroll, remarks)
      : this.approvalService.RejectRequest(assignment.ID, this.enroll, remarks);

    this.deciding.set(true);
    decision$.pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.deciding.set(false)),
    ).subscribe({
      next: response => {
        if (response.Status) {
          this.requestsChanged = true;
          this.toastr.success(response.Message || (accept ? 'Request accepted.' : 'Request rejected.'));
        } else {
          this.toastr.error(response.Message || 'Unable to resolve the request.');
        }

        this.loadLines();
        this.loadHistory();
      },
      error: error => {
        const body = error.error;
        const errorMessage = typeof body === 'string'
          ? body
          : body?.Message ?? body?.message ?? body?.detail;

        this.toastr.error(errorMessage || 'Unable to resolve the request.');
      },
    });
  }

  close(): void {
    if (!this.deciding()) this.activeModal.close(this.requestsChanged);
  }
}