import { CommonModule } from '@angular/common';
import { Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { IViewRequisitionHeader, IViewRequisitionLine } from 'src/app/core/model/Requisition/ViewRequisition';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { RequisitionApprovalService } from 'src/app/core/services/RequisitionApproval/requisition-approval.service';

type ViewModalState = 'loading' | 'ready' | 'failed';

@Component({
  selector: 'app-requisition-approval-view-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './requisition-approval-view-modal.component.html',
  styleUrl: './requisition-approval-view-modal.component.scss',
})
export class RequisitionApprovalViewModalComponent implements OnInit {
  @Input({ required: true }) header!: IViewRequisitionHeader;
  readonly state = signal<ViewModalState>('loading');
  readonly lines = signal<IViewRequisitionLine[]>([]);
  readonly documentStatuses = signal<IDropdownBind[]>([]);
  errorMessage = '';
  private readonly destroyRef = inject(DestroyRef);

  constructor(public readonly activeModal: NgbActiveModal, private readonly commonService: CommonService, private readonly approvalService: RequisitionApprovalService, private readonly toastr: ToastrService) {}

  ngOnInit(): void {
    this.loadLines();
    this.loadDocumentStatuses();
  }

  close(): void {
    this.activeModal.close();
  }

  dismiss(): void {
    this.activeModal.dismiss('dismissed');
  }

  getDocStatusName(docStatusId: number): string {
    return this.documentStatuses().find(status => Number(status.Id) === Number(docStatusId))?.Name ?? '-';
  }

  getDocStatusClass(docStatusId: number): string {
    const name = this.getDocStatusName(docStatusId).trim().toLowerCase();
    return ['pending', 'approve', 'reject', 'complete'].includes(name) ? name : '';
  }

  loadLines(): void {
    this.state.set('loading');
    this.errorMessage = '';
    this.approvalService.GetLinesByReqId(this.header.ReqID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: lines => {
          this.lines.set(lines.filter(line => line.IsActive));
          this.state.set('ready');
        },
        error: error => {
          this.errorMessage =
            error?.error?.detail ??
            error?.error?.Detail ??
            error?.error?.message ??
            error?.error?.Message ??
            'Unable to load the requisition lines.';
          this.state.set('failed');
          this.toastr.error(this.errorMessage);
        },
      });
  }

  private loadDocumentStatuses(): void {
    this.commonService.GetDocumentStatusList()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: statuses => this.documentStatuses.set(statuses),
        error: () => {
          this.documentStatuses.set([]);
          this.toastr.error('Unable to load document statuses.');
        },
      });
  }
}