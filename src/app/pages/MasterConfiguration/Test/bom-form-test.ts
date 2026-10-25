import { HostListener, inject } from '@angular/core';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

interface BomTestLine {
  id: number;
  name: string;
  quantity: number;
  uom?: string;
  bomUom?: string;
  processLoss?: number;
  remarks?: string;
}

@Component({
  selector: 'app-bom-form-test',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './bom-form-test.html',
  styleUrl: './bom-form-test.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BomFormTest {
  readonly formMode = signal<'create' | 'edit'>('create');
  readonly materialLines = signal<BomTestLine[]>([]);
  readonly resourceLines = signal<BomTestLine[]>([]);
  readonly message = signal('');

  private nextLineId = 1;

  readonly formGroup = new FormGroup({
    unitId: new FormControl<number | null>(172),
    businessId: new FormControl<number | null>(2),
    itemType: new FormControl<number | null>(1),
    itemName: new FormControl('RSB1000'),
    bomName: new FormControl('', Validators.required),

    rawMaterial: new FormGroup({
      name: new FormControl(''),
      uom: new FormControl('KG'),
      bomUom: new FormControl('KG'),
      quantity: new FormControl<number | null>(null),
      processLoss: new FormControl<number | null>(null),
      remarks: new FormControl(''),
    }),

    resource: new FormGroup({
      name: new FormControl(''),
      quantity: new FormControl<number | null>(null),
    }),
  });

  private readonly location = inject(Location);

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeForm();
  }

  closeForm(): void {
    this.location.back();
  }

  addRawMaterial(): void {
    const group = this.formGroup.controls.rawMaterial;
    const value = group.getRawValue();

    if (!value.name?.trim() || !value.quantity || value.quantity <= 0) {
      this.message.set('Please enter a raw material and a valid quantity.');
      return;
    }

    if (
      value.processLoss !== null &&
      (value.processLoss < 0 || value.processLoss > 100)
    ) {
      this.message.set('Process Loss must be between 0 and 100%.');
      return;
    }

    this.materialLines.update((lines) => [
      ...lines,
      {
        id: this.nextLineId++,
        name: value.name!.trim(),
        quantity: value.quantity!,
        uom: value.uom || '',
        bomUom: value.bomUom || '',
        processLoss: value.processLoss ?? 0,
        remarks: value.remarks || '',
      },
    ]);

    group.patchValue({
      name: '',
      quantity: null,
      processLoss: null,
      remarks: '',
    });

    this.message.set('');
  }

  addResource(): void {
    const group = this.formGroup.controls.resource;
    const value = group.getRawValue();

    if (!value.name?.trim() || !value.quantity || value.quantity <= 0) {
      this.message.set('Please enter a resource and a valid quantity.');
      return;
    }

    this.resourceLines.update((lines) => [
      ...lines,
      {
        id: this.nextLineId++,
        name: value.name!.trim(),
        quantity: value.quantity!,
      },
    ]);

    group.reset();
    this.message.set('');
  }

  removeMaterial(id: number): void {
    this.materialLines.update((lines) =>
      lines.filter((line) => line.id !== id)
    );
  }

  removeResource(id: number): void {
    this.resourceLines.update((lines) =>
      lines.filter((line) => line.id !== id)
    );
  }

  onSubmit(): void {
    if (this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      return;
    }

    const payload = {
      header: {
        unitId: this.formGroup.controls.unitId.value,
        businessId: this.formGroup.controls.businessId.value,
        itemType: this.formGroup.controls.itemType.value,
        itemName: this.formGroup.controls.itemName.value,
        bomName: this.formGroup.controls.bomName.value,
      },
      materials: this.materialLines(),
      resources: this.resourceLines(),
    };

    console.log('BOM FORM TEST PAYLOAD:', payload);
    this.message.set('Test submission successful. Check the browser console.');
  }

  resetForm(): void {
    this.formGroup.reset({
      unitId: 172,
      businessId: 2,
      itemType: 1,
      itemName: 'RSB1000',
      bomName: '',
      rawMaterial: {
        name: '',
        uom: 'KG',
        bomUom: 'KG',
        quantity: null,
        processLoss: null,
        remarks: '',
      },
      resource: {
        name: '',
        quantity: null,
      },
    });

    this.materialLines.set([]);
    this.resourceLines.set([]);
    this.message.set('');
    this.nextLineId = 1;
  }
}
