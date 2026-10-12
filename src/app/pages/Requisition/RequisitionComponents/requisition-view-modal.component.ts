import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';

import {
  IViewRequisitionHeader,
  IViewRequisitionLine,
} from 'src/app/core/model/Requisition/ViewRequisition';
import { RequisitionService } from 'src/app/core/services/Requisition/requisition.service';

type ViewModalState = 'loading' | 'ready' | 'failed';

@Component({
  selector: 'app-requisition-view-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './requisition-view-modal.component.html',
styles: [
  `
      /* Modal Body */
  .requisition-modal-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    background: #f7f9fb;
  }

  /* General Cards */
  .requisition-card {
    min-width: 0;
    padding: 14px;
    border: 1px solid #e0e5ea;
    border-radius: 9px;
    background: #fff;
  }

  /* Compact Requisition Summary */
  .requisition-summary {
    padding: 12px 16px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 12px;
  }

  .summary-field {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
  }

  .summary-label {
    color: #798694;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .summary-value {
    color: #273442;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }

  .summary-value.detail-highlight {
    color: #087c4a;
    font-weight: 650;
  }

  /* Header Remarks */
  .summary-remarks {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid #e8edf0;
  }

  .summary-remarks .summary-label {
    flex: 0 0 80px;
  }

  

  /* Product Section Heading */
  .section-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .section-icon {
    display: inline-flex;
    flex: 0 0 34px;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 8px;
    color: #16804d;
    background: #edf7f1;
    font-size: 13px;
  }

  .section-heading h6 {
    margin: 0;
    color: #263442;
    font-size: 15px;
    font-weight: 650;
  }

  .section-heading p {
    margin: 2px 0 0;
    color: #84909d;
    font-size: 11px;
  }

  .summary-field:has(.g-status) .summary-label {
    margin-left: 10px;
  }

  /* Product Table */
  .product-table-wrapper {
    min-width: 0;
    border: 1px solid #e2e7ec;
    border-radius: 7px;
  }

  .product-table {
    width: 100%;
    min-width: 1050px;
    margin: 0;
    border: 0;
    border-collapse: collapse;
    table-layout: fixed;
    background: #fff;
  }

  .product-table thead th {
    padding: 10px 12px;
    border: 0;
    border-bottom: 1px solid #e2e7ec;
    color: #69798a;
    background: #f5f7f9;
    font-size: 11px;
    font-weight: 650;
    line-height: 1.3;
    text-align: left;
    text-transform: uppercase;
    white-space: normal;
  }

  .product-table tbody td {
    padding: 10px 12px;
    border: 0;
    border-bottom: 1px solid #edf0f2;
    color: #435160;
    background: #fff;
    font-size: 13px;
    line-height: 1.35;
    text-align: left;
    vertical-align: middle;
    overflow-wrap: anywhere;
  }

  .product-table tbody tr:last-child td {
    border-bottom: 0;
  }

  .product-table tbody tr:hover td {
    background: #f8fafb;
  }

  .product-table .item-name {
    color: #263442;
    font-weight: 600;
  }

  .product-table .number-column {
    text-align: right;
    white-space: nowrap;
  }

  .product-table .empty-table-message {
    padding: 20px 12px;
    color: #84909d;
    text-align: center;
  }

  /* Remaining Quantity */
  .negative-quantity {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 5px;
    color: #b42335;
    background: #fff1f2;
    font-weight: 600;
  }

  

  /* Responsive Layout */
  @media (max-width: 1199.98px) {
    .summary-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (max-width: 767.98px) {
    .requisition-modal-body {
      padding: 10px;
    }

    .requisition-card {
      padding: 12px;
    }

    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .summary-remarks {
      align-items: flex-start;
    }

    .product-table {
      min-width: 1050px;
    }
  }
  `,
],



})
export class RequisitionViewModalComponent implements OnInit {
  @Input({ required: true })
  header!: IViewRequisitionHeader;

  private readonly stateSignal =
    signal<ViewModalState>('loading');

  private readonly linesSignal =
    signal<IViewRequisitionLine[]>([]);

  errorMessage = '';

  get state(): ViewModalState {
    return this.stateSignal();
  }

  get lines(): IViewRequisitionLine[] {
    return this.linesSignal();
  }

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly requisitionService: RequisitionService,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadLines();
  }

  close(): void {
    this.activeModal.close();
  }

  dismiss(): void {
    this.activeModal.dismiss('dismissed');
  }

  getDocStatusName(docStatusId: number): string {
    switch (docStatusId) {
      case 1:
        return 'Pending';
      case 2:
        return 'Approve';
      case 3:
        return 'Reject';
      case 4:
        return 'Complete';
      default:
        return '-';
    }
  }

  private loadLines(): void {
    this.stateSignal.set('loading');

    this.requisitionService
      .GetLinesByReqId(this.header.ReqID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (lines) => {
          this.linesSignal.set(
            lines.filter((line) => line.IsActive),
          );

          this.stateSignal.set('ready');
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.getErrorMessage(error);
          this.stateSignal.set('failed');

          this.toastr.error(this.errorMessage);
          this.activeModal.dismiss('load-failed');
        },
      });
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    const detail = error.error?.detail ?? error.error?.Detail;

    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }

    if (error.status === 403) {
      return 'You do not have permission to view requisition lines.';
    }

    return 'Unable to load the requisition lines.';
  }
}