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
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { RequisitionService } from 'src/app/core/services/Requisition/requisition.service';
import { getDocumentStatusClass } from 'src/app/core/model/document-status';

type ViewModalState = 'loading' | 'ready' | 'failed';

@Component({
  selector: 'app-requisition-view-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './requisition-view-modal.component.html',
  styleUrl: './requisition-view-modal.component.scss',



})
export class RequisitionViewModalComponent implements OnInit {
  
  @Input({ required: true })
  header!: IViewRequisitionHeader;

  private readonly stateSignal = signal<ViewModalState>('loading');

  private readonly linesSignal = signal<IViewRequisitionLine[]>([]);

  private readonly documentStatuses = signal<IDropdownBind[]>([]);

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
    private readonly commonService: CommonService,
    private readonly requisitionService: RequisitionService,
    private readonly toastr: ToastrService,
  ) {}

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
    return this.documentStatuses().find(status =>
      Number(status.Id) === Number(docStatusId))?.Name ?? '-';
  }

  getDocStatusClass(docStatusId: number): string {
    return getDocumentStatusClass(docStatusId);
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