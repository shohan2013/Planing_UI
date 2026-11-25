import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import {
  IMachineBusyInfo,
  IMachineJob,
  IMachineRef,
  MachineBusyAction,
} from 'src/app/core/model/MergedPlanning/machine-schedule-model';

/** One busy machine and its jobs in the requested slot. */
export interface IBusyMachineGroup {
  machine: IMachineRef;
  jobs: IMachineJob[];
}

/**
 * Content of the NgbModal shown when one or more of the chosen machines already have
 * jobs in the requested slot; the jobs are grouped per machine. Closes with a MachineBusyAction; dismissing (X / Esc / backdrop)
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

  /** Busy machines, in selection order, each with its clashing jobs. */
  readonly groups = computed<IBusyMachineGroup[]>(() => {
    const info = this.info();
    if (!info) return [];
    const known = new Set(info.machines.map((m) => m.Id));
    const groups = info.machines
      .map((machine) => ({ machine, jobs: info.jobs.filter((j) => j.MachineId === machine.Id) }))
      .filter((g) => g.jobs.length > 0);
    // Jobs whose machine isn't known (API sent no MachineId) still have to be shown.
    const unknown = info.jobs.filter((j) => !known.has(j.MachineId));
    if (unknown.length) {
      groups.push({ machine: { Id: 0, Name: unknown[0].MachineName || 'Other machine' }, jobs: unknown });
    }
    return groups;
  });

  /** More than one machine was selected for the slot. */
  readonly isMulti = computed(() => (this.info()?.machines.length ?? 0) > 1);

  close(action: MachineBusyAction): void {
    this.modal.close(action);
  }
}
