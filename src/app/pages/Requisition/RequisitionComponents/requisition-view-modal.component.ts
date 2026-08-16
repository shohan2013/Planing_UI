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
      .g-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        border-radius: 15px;
        font-weight: 600;
        white-space: nowrap;
      }

      .g-status-lg {
        padding: 5px 10px;
        font-size: 13px;
      }

      .g-dot {
        width: 8px;
        height: 8px;
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