import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import {
  IMachineBusyInfo,
  MachineBusyAction,
} from 'src/app/core/model/MergedPlanning/machine-schedule-model';

/**
 * Content of the NgbModal shown when the chosen machine already has jobs in the
 * requested slot. Closes with a MachineBusyAction; dismissing (X / Esc / backdrop)
 * just leaves the form as it is.
 */
@Component({
  selector: 'app-machine-busy-dialog',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './machine-busy-dialog.html',
  styleUrl: './machine-busy-dialog.scss',
})
export class MachineBusyDialog {
  readonly modal = inject(NgbActiveModal);

  /** Set by the opener right after `NgbModal.open`. */
  readonly info = signal<IMachineBusyInfo | null>(null);

  close(action: MachineBusyAction): void {
    this.modal.close(action);
  }
}
