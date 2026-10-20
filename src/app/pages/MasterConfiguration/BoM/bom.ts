import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  OnDestroy,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { ProductionBOMHeader } from 'src/app/core/model/MasterConfiguration/BOM/BOM-model';
import {
  ProductionBOMMaterialLine,
  ProductionBOMResourceLine,
} from 'src/app/core/model/MasterConfiguration/BOM/BOM-lines-model';
import { BomService } from 'src/app/core/services/MasterConfiguration/BoM/bom.service';

@Component({
  selector: 'app-bom',
  standalone: true,
  templateUrl: './bom.html',
  styleUrl: './bom.scss',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bom implements OnDestroy {
  @ViewChild('createBomModal') createBomModal!: TemplateRef<unknown>;
  @ViewChild('viewBomModal') viewBomModal!: TemplateRef<unknown>;

  readonly itemId = input.required<number>();
  readonly itemName = input.required<string>();
  readonly unitId = input.required<number>();
  readonly businessId = input.required<number>();



  readonly headers = signal<ProductionBOMHeader[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly actionError = signal('');

  readonly formMode = signal<'create' | 'edit'>('create');
  readonly selectedHeader = signal<ProductionBOMHeader | null>(null);

  readonly materialLines = signal<ProductionBOMMaterialLine[]>([]);
  readonly resourceLines = signal<ProductionBOMResourceLine[]>([]);
  readonly linesLoading = signal(false);
  readonly linesError = signal('');

  readonly deletingBomId = signal<number | null>(null);

  private readonly refreshVersion = signal(0);
  private readonly destroy$ = new Subject<void>();

  private modalRef: NgbModalRef | null = null;
  private linesSubscription: Subscription | null = null;

  readonly formGroup = new FormGroup({
    unitId: new FormControl<number | null>(null),
    businessId: new FormControl<number | null>(null),
    itemType: new FormControl<number | null>(null),
    itemName: new FormControl(''),
    bomName: new FormControl('', Validators.required),

    rawMaterial: new FormGroup({
      name: new FormControl(''),
      uom: new FormControl(''),
      bomUom: new FormControl(''),
      quantity: new FormControl<number | null>(null),
      processLoss: new FormControl<number | null>(null),
      remarks: new FormControl(''),
    }),

    resource: new FormGroup({
      name: new FormControl(''),
      quantity: new FormControl<number | null>(null),
    }),
  });

  constructor(
    private readonly bomService: BomService,
    private readonly modalService: NgbModal
  ) {
    effect((onCleanup) => {
      const fgItemId = this.itemId();
      const unitId = this.unitId();
      const businessId = this.businessId();

      this.refreshVersion();

      this.headers.set([]);
      this.loading.set(true);
      this.loadError.set(false);

      const subscription = this.bomService
        .getHeaders(fgItemId, unitId, businessId)
        .subscribe({
          next: (headers) => {
            this.headers.set(headers);
            this.loading.set(false);
          },
          error: () => {
            this.loadError.set(true);
            this.loading.set(false);
          },
        });

      onCleanup(() => subscription.unsubscribe());
    });
  }

  openCreate(): void {
    this.resetLines();
    this.selectedHeader.set(null);
    this.formMode.set('create');

    this.formGroup.reset({
      unitId: this.unitId(),
      businessId: this.businessId(),
      itemName: this.itemName(),
    });

    this.openModal(this.createBomModal);
  }

  openEdit(header: ProductionBOMHeader): void {
    this.resetLines();
    this.selectedHeader.set(header);
    this.formMode.set('edit');

    this.formGroup.reset({
      unitId: header.UnitId ?? this.unitId(),
      businessId: header.BusinessId ?? this.businessId(),
      itemType: header.FGTypeId,
      itemName: this.itemName(),
      bomName: header.BoMName ?? '',
    });

    this.openModal(this.createBomModal);
    this.loadLines(header.BoMID);
  }

  openView(header: ProductionBOMHeader): void {
    this.resetLines();
    this.selectedHeader.set(header);

    this.openModal(this.viewBomModal);
    this.loadLines(header.BoMID);
  }

  closeModal(): void {
    this.modalRef?.close();
  }

  retryLines(): void {
    const header = this.selectedHeader();

    if (header) {
      this.loadLines(header.BoMID);
    }
  }

  deleteBom(header: ProductionBOMHeader): void {
    if (this.deletingBomId() !== null) {
      return;
    }

    this.actionError.set('');



    const confirmed = window.confirm(
      `Delete BOM ${header.BoMCode || header.BoMID}?`
    );

    if (!confirmed) {
      return;
    }

    this.deletingBomId.set(header.BoMID);

    this.bomService
      .deleteData(header.BoMID)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingBomId.set(null);
          this.refreshVersion.update((value) => value + 1);
        },
        error: () => {
          this.deletingBomId.set(null);
          this.actionError.set('Could not delete the BOM.');
        },
      });
  }

  approveBom(_header: ProductionBOMHeader): void {
    // Intentionally unimplemented.
  }

  addRawMaterial(): void {
    // Implement with the Add/Edit form.
  }

  addResource(): void {
    // Implement with the Add/Edit form.
  }

  onSubmit(): void {
    // Add and Update submission will be connected separately.
  }

  ngOnDestroy(): void {
    this.linesSubscription?.unsubscribe();
    this.modalRef?.dismiss();

    this.destroy$.next();
    this.destroy$.complete();
  }

  private openModal(template: TemplateRef<unknown>): void {
    const modalRef = this.modalService.open(template, {
      fullscreen: true,
      backdrop: 'static',
      keyboard: false,
    });

    this.modalRef = modalRef;

    const cleanup = (): void => {
      if (this.modalRef !== modalRef) {
        return;
      }

      this.linesSubscription?.unsubscribe();
      this.linesSubscription = null;
      this.linesLoading.set(false);
      this.modalRef = null;
    };

    modalRef.result.then(cleanup, cleanup);
  }

  private resetLines(): void {
    this.linesSubscription?.unsubscribe();
    this.linesSubscription = null;

    this.materialLines.set([]);
    this.resourceLines.set([]);
    this.linesLoading.set(false);
    this.linesError.set('');
  }

  private loadLines(boMId: number): void {
    this.resetLines();
    this.linesLoading.set(true);

    this.linesSubscription = this.bomService
      .getLines(boMId)
      .subscribe({
        next: (data) => {
          this.materialLines.set(data.MaterialLines ?? []);
          this.resourceLines.set(data.ResourceLines ?? []);
          this.linesLoading.set(false);
        },
        error: () => {
          this.linesError.set('Could not load BOM lines.');
          this.linesLoading.set(false);
        },
      });
  }
}