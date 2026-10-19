import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
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
import { ProductionBOMHeader } from 'src/app/core/model/MasterConfiguration/BOM/BOM';
import { BomService } from 'src/app/core/services/MasterConfiguration/BoM/bom.service';

@Component({
  selector: 'app-bom',
  standalone: true,
  templateUrl: './bom.html',
  styleUrl: './bom.scss',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bom {
  @ViewChild('createBomModal') createBomModal!: TemplateRef<unknown>;

  readonly itemId = input.required<number>();
  readonly itemName = input.required<string>();
  readonly unitId = input.required<number>();
  readonly businessId = input.required<number>();

  readonly headers = signal<ProductionBOMHeader[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  private modalRef: NgbModalRef | null = null;

  readonly formGroup = new FormGroup({
    unitId: new FormControl<number | null>(null),
    businessId: new FormControl<number | null>(null),
    itemType: new FormControl(''),
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
    this.formGroup.reset({
      unitId: this.unitId(),
      businessId: this.businessId(),
      itemName: this.itemName(),
    });

    this.modalRef = this.modalService.open(this.createBomModal, {
      fullscreen: true,
      backdrop: 'static',
      keyboard: false,
    });

    this.modalRef.result.then(
      () => { this.modalRef = null; },
      () => { this.modalRef = null; }
    );
  }

  closeCreate(): void {
    this.modalRef?.close();
  }

  addRawMaterial(): void {
    // Implement with the Add form.
  }

  addResource(): void {
    // Implement with the Add form.
  }

  onSubmit(): void {
    // Connect to the Add API when implementing the Add form.
  }
}