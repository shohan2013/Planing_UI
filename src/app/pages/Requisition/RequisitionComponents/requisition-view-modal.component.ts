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
    .requisition-modal-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 14px;
      background: #f7f9fb;
    }

    .requisition-card {
      min-width: 0;
      padding: 16px;
      border: 1px solid #e0e5ea;
      border-radius: 9px;
      background: #fff;
    }

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

    .requisition-card .row {
      --bs-gutter-x: 12px;
      --bs-gutter-y: 12px;
    }

    .detail-tile {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 62px;
      height: 100%;
      padding: 10px 12px;
      border: 1px solid #e8edf0;
      border-radius: 7px;
      background: #f8fafb;
    }

    .detail-label {
      margin-bottom: 4px;
      color: #798694;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.2;
      text-transform: uppercase;
    }

    .detail-value {
      color: #273442;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    .detail-highlight {
      color: #087c4a;
      font-weight: 650;
    }

    .remarks-content {
      padding: 10px 12px;
      border: 1px solid #e8edf0;
      border-radius: 7px;
      color: #354250;
      background: #f8fafb;
      font-size: 13px;
      line-height: 1.4;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }

    .product-table-wrapper {
      border: 1px solid #e2e7ec;
      border-radius: 7px;
    }

    .product-table {
      width: 100%;
      min-width: 1050px;
      margin: 0;
      border: 0;
      border-collapse: collapse;
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

    .negative-quantity {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 5px;
      color: #b42335;
      background: #fff1f2;
      font-weight: 600;
    }

    .g-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border-radius: 15px;
      font-weight: 600;
      white-space: nowrap;
    }

    .g-status-lg {
      padding: 4px 8px;
      font-size: 12px;
    }

    .g-dot {
      flex: 0 0 7px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: currentColor;
    }

    .status-pending {
      color: #b7791f;
      background-color: #fff7e6;
    }

    .status-approve {
      color: #2f855a;
      background-color: #eaf7ef;
    }

    .status-reject {
      color: #c53030;
      background-color: #fdecec;
    }

    .status-complete {
        color: #2f855a;
        background-color: #eaf7ef;
    }

    @media (max-width: 767.98px) {
      .requisition-modal-body {
        padding: 12px;
      }

      .requisition-card {
        padding: 14px;
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