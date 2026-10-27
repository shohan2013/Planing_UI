import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Directive,
  effect,
  EventEmitter,
  forwardRef,
  HostListener,
  Input,
  input,
  OnDestroy,
  Output,
  signal,
  TemplateRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  NgbModal,
  NgbModalRef,
  NgbTypeaheadModule,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import {
  Observable,
  Subject,
  Subscription,
  catchError,
  debounceTime,
  finalize,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';

import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { BoMItem } from 'src/app/core/model/MasterConfiguration/BOM/BOM-item-model';
import {
  ProductionBOMMaterialLine,
  ProductionBOMResourceLine,
} from 'src/app/core/model/MasterConfiguration/BOM/BOM-lines-model';
import { ProductionBOMHeader } from 'src/app/core/model/MasterConfiguration/BOM/BOM-model';
import { ProductionMaterialUoM } from 'src/app/core/model/MasterConfiguration/BOM/ProductionMaterial-UoM-model';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { BomService } from 'src/app/core/services/MasterConfiguration/BoM/bom.service';
import { IWareHouse } from 'src/app/core/model/Common/WareHouse/WareHouse';

type MaterialNumberField = 'Quantity' | 'WastagePercent' | 'ProcessLoss' | 'Rate';
type ResourceNumberField = 'Quantity' | 'Rate';
type LineCode = 'M' | 'R';


@Directive({
  selector: 'input[bomDecimalInput]',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => BomDecimalInputDirective),
    multi: true,
  }],
})
export class BomDecimalInputDirective implements ControlValueAccessor {
  @Input() bomWholeDigits = 8;
  @Input() bomDecimalDigits = 2;
  @Input() bomMaximum: number | null = null;
  @Input() bomMultiplier: number | null = null;
  @Output() bomValue = new EventEmitter<number | null>();

  private lastAccepted = '';
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly element: ElementRef<HTMLInputElement>) {}

  writeValue(value: number | null): void {
    this.lastAccepted = value === null || value === undefined ? '' : String(value);
    this.element.nativeElement.value = this.lastAccepted;
  }

  setDisabledState(disabled: boolean): void {
    this.element.nativeElement.disabled = disabled;
  }

  registerOnChange(fn: (value: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  @HostListener('focus', ['$event'])
  onFocus(event: FocusEvent): void {
    this.lastAccepted = (event.target as HTMLInputElement).value;
  }

  @HostListener('blur')
  onBlur(): void {
    this.onTouched();
  }

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const text = input.value;
    const pattern = new RegExp(
      `^\\d{0,${this.bomWholeDigits}}(?:\\.\\d{0,${this.bomDecimalDigits}})?$`
    );
    const value = text === '' || text === '.' ? null : Number(text);

    const invalid =
      !pattern.test(text) ||
      (value !== null && !Number.isFinite(value)) ||
      (value !== null && this.bomMaximum !== null && value > this.bomMaximum) ||
      (
        value !== null &&
        this.bomMultiplier !== null &&
        Number((value * this.bomMultiplier).toFixed(4)) >= 100000000
      );

    if (invalid) {
      input.value = this.lastAccepted;
      return;
    }

    this.lastAccepted = text;
    this.onChange(value);
    this.bomValue.emit(value);
  }
}

@Component({
  selector: 'app-bom',
  standalone: true,
  templateUrl: './bom.html',
  styleUrl: './bom.scss',
  imports: [CommonModule, ReactiveFormsModule, NgbTypeaheadModule, NgSelectModule, BomDecimalInputDirective],
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
  readonly formError = signal('');

  readonly formMode = signal<'create' | 'edit'>('create');
  readonly viewing = signal(false);
  readonly selectedHeader = signal<ProductionBOMHeader | null>(null);
  readonly headerChanged = signal(false);
  readonly savingHeader = signal(false);

  readonly materialLines = signal<ProductionBOMMaterialLine[]>([]);
  readonly resourceLines = signal<ProductionBOMResourceLine[]>([]);
  readonly materialEdits = signal<Record<number, ProductionBOMMaterialLine>>({});
  readonly resourceEdits = signal<Record<number, ProductionBOMResourceLine>>({});
  readonly activatedLines = signal<Set<string>>(new Set());
  readonly linesLoading = signal(false);
  readonly linesError = signal('');
  readonly savingLine = signal('');
  readonly deletingLine = signal('');

  readonly materialSearching = signal(false);
  readonly resourceSearching = signal(false);

  readonly warehouseOptions = signal<IWareHouse[]>([]);
  readonly warehousesLoading = signal(false);
  readonly warehousesError = signal('');

  readonly fgTypes = signal<IDropdownBind[]>([]);
  readonly fgTypesLoading = signal(false);
  readonly fgTypesError = signal('');

  readonly conversionsLoading = signal(false);
  readonly conversionsError = signal('');
  readonly materialConversions = signal<ProductionMaterialUoM[]>([]);
  readonly materialLineConversions = signal<Record<number, ProductionMaterialUoM[]>>({});
  readonly loadingMaterialLineConversions = signal<Set<number>>(new Set());
  readonly selectedCValue = signal(1);

  readonly deletingBomId = signal<number | null>(null);

  private readonly refreshVersion = signal(0);
  private readonly destroy$ = new Subject<void>();

  private modalRef: NgbModalRef | null = null;
  private linesSubscription: Subscription | null = null;
  private conversionsSubscription: Subscription | null = null;

  readonly formGroup = new FormGroup({
    itemType: new FormControl<number | null>(null, Validators.required),
    bomName: new FormControl('', [Validators.required, Validators.maxLength(500)]),

    rawMaterial: new FormGroup({
      warehouseId: new FormControl<number | null>(null, Validators.required),
      name: new FormControl<BoMItem | string>(''),
      itemId: new FormControl<number | null>(null),
      uom: new FormControl(''),
      bomUom: new FormControl(''),
      quantity: new FormControl<number | null>(null),
      wastagePercent: new FormControl<number | null>(null),
      processLoss: new FormControl<number | null>(null),
      rate: new FormControl<number | null>(null),
      convertedQty: new FormControl<number | null>(null),
      remarks: new FormControl(''),
    }),

    resource: new FormGroup({
      warehouseId: new FormControl<number | null>(null, Validators.required),
      name: new FormControl<BoMItem | string>(''),
      itemId: new FormControl<number | null>(null),
      uom: new FormControl(''),
      quantity: new FormControl<number | null>(null),
      rate: new FormControl<number | null>(null),
      remarks: new FormControl(''),
    }),
  });

  readonly itemFullLabel = (item: BoMItem): string =>
    `[${item.ItemID}] ${item.ItemName ?? ''}`;

  readonly itemFormatter = (item: BoMItem | string): string => {
    if (typeof item === 'string') return item;
    const label = this.itemFullLabel(item);
    return label.length > 50 ? `${label.slice(0, 50)}...` : label;
  };

  readonly searchMaterialItems = (text$: Observable<string>): Observable<BoMItem[]> =>
    text$.pipe(
      debounceTime(800),
      switchMap(text =>
        this.searchItems(
          text,
          this.formGroup.controls.rawMaterial.controls.warehouseId.value,
          this.materialSearching
        )
      )
    );

  readonly searchResourceItems = (text$: Observable<string>): Observable<BoMItem[]> =>
    text$.pipe(
      debounceTime(800),
      switchMap(text =>
        this.searchItems(
          text,
          this.formGroup.controls.resource.controls.warehouseId.value,
          this.resourceSearching
        )
      )
    );

  constructor(
    private readonly bomService: BomService,
    private readonly commonService: CommonService,
    private readonly modalService: NgbModal,
    private readonly toastr: ToastrService
  ) {
    effect(onCleanup => {
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
          next: headers => {
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

    effect(onCleanup => {
      const unitId = this.unitId();

      this.warehouseOptions.set([]);
      this.warehousesError.set('');
      this.warehousesLoading.set(unitId > 0);

      if (unitId <= 0) return;

      const subscription = this.commonService.getWarehousesList(this.getEnroll()).subscribe({
        next: warehouses => {
          this.warehouseOptions.set(warehouses);
          this.warehousesLoading.set(false);
        },
        error: () => {
          this.warehousesError.set('Could not load warehouses.');
          this.warehousesLoading.set(false);
        },
      });

      onCleanup(() => subscription.unsubscribe());
    });

    this.formGroup.controls.bomName.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.checkHeaderChanged());

    this.formGroup.controls.itemType.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.checkHeaderChanged());

    this.formGroup.controls.rawMaterial.controls.warehouseId.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.clearMaterialConversion();
        this.formGroup.controls.rawMaterial.patchValue(
          { name: '', itemId: null },
          { emitEvent: false }
        );
      });

    this.formGroup.controls.resource.controls.warehouseId.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.formGroup.controls.resource.patchValue(
          { name: '', itemId: null, uom: '' },
          { emitEvent: false }
        );
      });

    this.formGroup.controls.rawMaterial.controls.name.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (typeof value === 'string') {
          this.clearMaterialConversion();
          this.formGroup.controls.rawMaterial.patchValue(
            { itemId: null },
            { emitEvent: false }
          );
        }
      });

    this.formGroup.controls.resource.controls.name.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (typeof value === 'string') {
          this.formGroup.controls.resource.patchValue(
            { itemId: null, uom: '' },
            { emitEvent: false }
          );
        }
      });

    this.formGroup.controls.rawMaterial.controls.quantity.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateConvertedQty());

    this.formGroup.controls.rawMaterial.controls.bomUom.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(CUoM => {
        const conversion = this.materialConversions().find(row => row.CUoM === CUoM);
        this.selectedCValue.set(conversion?.CValue ?? 1);
        this.updateConvertedQty();
      });
  }

  openCreate(): void {
    this.resetLines();
    this.clearMaterialConversion();
    this.formError.set('');
    this.selectedHeader.set(null);
    this.viewing.set(false);
    this.formMode.set('create');
    this.headerChanged.set(false);
    this.resetForm();
    this.loadFGTypes();
    this.openModal(this.createBomModal);
  }

  openEdit(header: ProductionBOMHeader): void {
    this.resetLines();
    this.clearMaterialConversion();
    this.formError.set('');
    this.selectedHeader.set(header);
    this.viewing.set(false);
    this.formMode.set('edit');

    this.resetForm();
    this.formGroup.patchValue(
      {
        itemType: header.FGTypeId,
        bomName: header.BoMName ?? '',
      },
      { emitEvent: false }
    );
    this.headerChanged.set(false);

    this.loadFGTypes();
    this.openModal(this.createBomModal);
    this.loadLines(header.BoMID);
  }

  openView(header: ProductionBOMHeader): void {
    this.resetLines();
    this.viewing.set(true);
    this.selectedHeader.set(header);
    this.openModal(this.viewBomModal);
    this.loadLines(header.BoMID);
  }

  closeModal(): void {
    this.modalRef?.close();
  }

  retryLines(): void {
    const header = this.selectedHeader();
    if (header) this.loadLines(header.BoMID);
  }

  deleteBom(header: ProductionBOMHeader): void {
    if (this.deletingBomId() !== null) return;

    const enroll = this.getEnroll();
    if (enroll === null) return;

    if (!window.confirm(`Delete BOM ${header.BoMCode || header.BoMID}?`)) return;

    this.actionError.set('');
    this.deletingBomId.set(header.BoMID);

    this.bomService.deleteData(header.BoMID, enroll)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.deletingBomId.set(null);
          if (!this.apiSucceeded(result)) {
            this.actionError.set(this.apiMessage(result, 'Could not delete the BOM.'));
            this.toastr.error(this.actionError());
            return;
          }

          this.toastr.success('BOM deleted.');
          this.refreshVersion.update(value => value + 1);
        },
        error: () => {
          this.deletingBomId.set(null);
          this.actionError.set('Could not delete the BOM.');
          this.toastr.error(this.actionError());
        },
      });
  }

  approveBom(_header: ProductionBOMHeader): void {
    // Approval is intentionally not implemented yet.
  }

  onMaterialItemSelect(event: NgbTypeaheadSelectItemEvent): void {
    const item = event.item as BoMItem;

    if (this.itemAlreadyAdded(item.ItemID)) {
      event.preventDefault();
      this.toastr.error(`Item ${item.ItemID} is already in this BOM.`);
      return;
    }

    const material = this.formGroup.controls.rawMaterial;
    const warehouseId = material.controls.warehouseId.value;
    if (warehouseId === null) {
      event.preventDefault();
      this.toastr.error('Select a warehouse first.');
      return;
    }

    if (!item.UoM) {
      event.preventDefault();
      this.toastr.error('The selected item has no UoM.');
      return;
    }

    this.clearMaterialConversion();
    material.patchValue(
      { itemId: item.ItemID, uom: item.UoM, bomUom: '' },
      { emitEvent: false }
    );
    this.conversionsLoading.set(true);

    this.conversionsSubscription = this.bomService
      .getProductionMaterialUoM(
        item.ItemID,
        item.UoM,
        warehouseId,
        this.unitId()
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: rows => {
          const options = (rows ?? []).filter(row =>
            !!row.CUoM && row.CValue !== null && Number.isFinite(row.CValue)
          );

          this.materialConversions.set(options);
          this.conversionsLoading.set(false);

          if (options.length === 0) {
            this.conversionsError.set('No CUoM conversion is available for this item and warehouse.');
          }

          this.updateConvertedQty();
        },
        error: () => {
          this.conversionsError.set('Could not load UoM conversion.');
          this.conversionsLoading.set(false);
        },
      });
  }

  onResourceItemSelect(event: NgbTypeaheadSelectItemEvent): void {
    const item = event.item as BoMItem;

    if (this.itemAlreadyAdded(item.ItemID)) {
      event.preventDefault();
      this.toastr.error(`Item ${item.ItemID} is already in this BOM.`);
      return;
    }

    if (this.formGroup.controls.resource.controls.warehouseId.value === null) {
      event.preventDefault();
      this.toastr.error('Select a warehouse first.');
      return;
    }

    this.formGroup.controls.resource.patchValue(
      { itemId: item.ItemID, uom: item.UoM ?? '' },
      { emitEvent: false }
    );
  }

  addRawMaterial(): void {
    const material = this.buildMaterialLine();
    if (!material) return;

    if (this.itemAlreadyAdded(material.ItemID!)) {
      this.toastr.error(`Item ${material.ItemID} is already in this BOM.`);
      return;
    }

    if (this.formMode() === 'create') {
      this.materialLines.update(lines => [material, ...lines]);
      this.resetMaterialInput();
      return;
    }

    const header = this.selectedHeader();
    if (!header || this.linesLoading()) return;
    this.saveNewLine(header.BoMID, 'M', material);
  }

  addResource(): void {
    const resource = this.buildResourceLine();
    if (!resource) return;

    if (this.itemAlreadyAdded(resource.ItemID!)) {
      this.toastr.error(`Item ${resource.ItemID} is already in this BOM.`);
      return;
    }

    if (this.formMode() === 'create') {
      this.resourceLines.update(lines => [resource, ...lines]);
      this.resetResourceInput();
      return;
    }

    const header = this.selectedHeader();
    if (!header || this.linesLoading()) return;
    this.saveNewLine(header.BoMID, 'R', resource);
  }

  removeStagedLine(code: LineCode, index: number): void {
    if (code === 'M') {
      this.materialLines.update(lines => lines.filter((_, i) => i !== index));
    } else {
      this.resourceLines.update(lines => lines.filter((_, i) => i !== index));
    }
  }

  onSubmit(): void {
    if (this.formMode() !== 'create' || this.savingHeader()) return;

    const name = this.formGroup.controls.bomName.value?.trim() ?? '';
    const fgTypeId = this.formGroup.controls.itemType.value;
    const enroll = this.getEnroll();

    if (enroll === null) return;

    if (!name || name.length > 500 || !fgTypeId || fgTypeId <= 0) {
      this.toastr.error('Enter a BOM name and select an FG Type.');
      return;
    }

    this.savingHeader.set(true);

    this.bomService.addData({
      Header: {
        BoMName: name,
        FGItemID: this.itemId(),
        FGTypeId: fgTypeId,
        UnitId: this.unitId(),
        BusinessId: this.businessId(),
        CreatedBy: enroll,
      },
      MaterialLines: this.materialLines(),
      ResourceLines: this.resourceLines(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.savingHeader.set(false);

          if (!this.apiSucceeded(result)) {
            this.toastr.error(this.apiMessage(result, 'Could not create the BOM.'));
            return;
          }

          this.toastr.success('BOM created.');
          this.closeModal();
          this.refreshVersion.update(value => value + 1);
        },
        error: () => {
          this.savingHeader.set(false);
          this.toastr.error('Could not create the BOM.');
        },
      });
  }

  updateHeader(): void {
    const header = this.selectedHeader();
    if (!header || !this.headerChanged() || this.savingHeader()) return;

    const name = this.formGroup.controls.bomName.value?.trim() ?? '';
    const fgTypeId = this.formGroup.controls.itemType.value;
    const enroll = this.getEnroll();

    if (enroll === null) return;

    if (!name || name.length > 500 || !fgTypeId || fgTypeId <= 0) {
      this.toastr.error('Enter a BOM name and select an FG Type.');
      return;
    }

    this.savingHeader.set(true);

    this.bomService.updateData({
      BoMID: header.BoMID,
      BoMName: name,
      FGTypeId: fgTypeId,
      UpdatedBy: enroll,
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.savingHeader.set(false);

          if (!this.apiSucceeded(result)) {
            this.toastr.error(this.apiMessage(result, 'Could not update the BOM header.'));
            return;
          }

          this.selectedHeader.set({
            ...header,
            BoMName: name,
            FGTypeId: fgTypeId,
            FGTypeName: this.fgTypes().find(type => type.Id === fgTypeId)?.Name
              ?? header.FGTypeName,
          });

          this.headerChanged.set(false);
          this.refreshVersion.update(value => value + 1);
          this.toastr.success('BOM header updated.');
        },
        error: () => {
          this.savingHeader.set(false);
          this.toastr.error('Could not update the BOM header.');
        },
      });
  }

  materialEdit(line: ProductionBOMMaterialLine): ProductionBOMMaterialLine {
    return this.materialEdits()[line.ID] ?? line;
  }

  resourceEdit(line: ProductionBOMResourceLine): ProductionBOMResourceLine {
    return this.resourceEdits()[line.ID] ?? line;
  }

  changeMaterialNumber(
    line: ProductionBOMMaterialLine,
    field: MaterialNumberField,
    text: string
  ): void {
    const draft = { ...this.materialEdit(line) };
    draft[field] = text === '' ? null : Number(text);

    if (field === 'Quantity') {
      draft.ConvertedQty = draft.Quantity === null
        ? null
        : this.roundToFour(draft.Quantity * draft.CValue)
    }

    this.materialEdits.update(edits => ({ ...edits, [line.ID]: draft }));
  }

  loadMaterialLineConversions(line: ProductionBOMMaterialLine): void {
    if (
      !line.ItemID ||
      !line.UoM ||
      this.materialLineConversions()[line.ID] !== undefined ||
      this.loadingMaterialLineConversions().has(line.ID)
    ) return;

    this.loadingMaterialLineConversions.update(ids => new Set(ids).add(line.ID));

    this.bomService.getProductionMaterialUoM(
      line.ItemID,
      line.UoM,
      line.WarehouseID ?? 0,
      this.unitId()
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: rows => {
          this.materialLineConversions.update(options => ({
            ...options,
            [line.ID]: (rows ?? []).filter(row =>
              !!row.CUoM && row.CValue !== null && Number.isFinite(row.CValue)
            ),
          }));
          this.loadingMaterialLineConversions.update(ids => {
            const next = new Set(ids);
            next.delete(line.ID);
            return next;
          });
        },
        error: () => {
          this.loadingMaterialLineConversions.update(ids => {
            const next = new Set(ids);
            next.delete(line.ID);
            return next;
          });
          this.toastr.error('Could not load CUoM choices for this line.');
        },
      });
  }

  changeMaterialCUoM(line: ProductionBOMMaterialLine, CUoM: string): void {
    const conversion = this.materialLineConversions()[line.ID]?.find(row => row.CUoM === CUoM);
    if (conversion?.CValue === null || conversion?.CValue === undefined) return;

    const draft = { ...this.materialEdit(line), CUoM, CValue: conversion.CValue };
    draft.ConvertedQty = draft.Quantity === null
      ? null
      : this.roundToFour(draft.Quantity * draft.CValue);

    this.materialEdits.update(edits => ({ ...edits, [line.ID]: draft }));
  }


  changeMaterialRemarks(line: ProductionBOMMaterialLine, remarks: string): void {
    const draft = { ...this.materialEdit(line), Remarks: remarks };
    this.materialEdits.update(edits => ({ ...edits, [line.ID]: draft }));
  }

  changeResourceNumber(
    line: ProductionBOMResourceLine,
    field: ResourceNumberField,
    text: string
  ): void {
    const draft = { ...this.resourceEdit(line) };
    draft[field] = text === '' ? null : Number(text);
    this.resourceEdits.update(edits => ({ ...edits, [line.ID]: draft }));
  }

  changeResourceRemarks(line: ProductionBOMResourceLine, remarks: string): void {
    const draft = { ...this.resourceEdit(line), Remarks: remarks };
    this.resourceEdits.update(edits => ({ ...edits, [line.ID]: draft }));
  }

   activateLine(code: LineCode, id: number, event: FocusEvent): void {
    if (!(event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement)) return;

    this.activatedLines.update(current => {
      const next = new Set(current);
      next.add(`${code}${id}`);
      return next;
    });
  }

  materialChanged(line: ProductionBOMMaterialLine): boolean {
    const draft = this.materialEdit(line);
    return draft.Quantity !== line.Quantity ||
      draft.WastagePercent !== line.WastagePercent ||
      draft.Rate !== line.Rate ||
      draft.CUoM !== line.CUoM ||
      draft.ProcessLoss !== line.ProcessLoss ||
      (draft.Remarks ?? '') !== (line.Remarks ?? '');
  }

  resourceChanged(line: ProductionBOMResourceLine): boolean {
    const draft = this.resourceEdit(line);
    return draft.Quantity !== line.Quantity ||
      draft.Rate !== line.Rate ||
      (draft.Remarks ?? '') !== (line.Remarks ?? '');
  }

  saveMaterialEdit(line: ProductionBOMMaterialLine): void {
    if (!this.materialChanged(line) || this.savingLine()) return;

    const draft = this.materialEdit(line);
    if (!this.validateMaterial(draft)) return;

    this.saveExistingLine('M', draft);
  }

  saveResourceEdit(line: ProductionBOMResourceLine): void {
    if (!this.resourceChanged(line) || this.savingLine()) return;

    const draft = this.resourceEdit(line);
    if (!this.validateResource(draft)) return;

    this.saveExistingLine('R', draft);
  }

  deleteMaterialLine(line: ProductionBOMMaterialLine): void {
    this.deleteSavedLine('M', line.ID);
  }

  deleteResourceLine(line: ProductionBOMResourceLine): void {
    this.deleteSavedLine('R', line.ID);
  }

  scrollActiveItem(): void {
    setTimeout(() => {
      const dropdown = document.querySelector('.bom-item-dropdown') as HTMLElement | null;
      const activeItem = dropdown?.querySelector('.dropdown-item.active') as HTMLElement | null;

      if (!dropdown || !activeItem) return;

      const top = activeItem.offsetTop;
      const bottom = top + activeItem.offsetHeight;
      const visibleTop = dropdown.scrollTop;
      const visibleBottom = visibleTop + dropdown.clientHeight;

      if (top < visibleTop) dropdown.scrollTop = top;
      else if (bottom > visibleBottom) {
        dropdown.scrollTop = bottom - dropdown.clientHeight;
      }
    });
  }

  ngOnDestroy(): void {
    this.linesSubscription?.unsubscribe();
    this.conversionsSubscription?.unsubscribe();
    this.modalRef?.dismiss();

    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFGTypes(): void {
    this.fgTypesError.set('');
    this.fgTypesLoading.set(true);

    this.commonService.getFGTypes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: types => {
          this.fgTypes.set(types);
          this.fgTypesLoading.set(false);
        },
        error: () => {
          this.fgTypesError.set('Could not load FG Types.');
          this.fgTypesLoading.set(false);
        },
      });
  }

  private checkHeaderChanged(): void {
    const header = this.selectedHeader();

    this.headerChanged.set(
      this.formMode() === 'edit' &&
      header !== null &&
      (
        (this.formGroup.controls.bomName.value?.trim() ?? '') !== (header.BoMName ?? '') ||
        this.formGroup.controls.itemType.value !== header.FGTypeId
      )
    );
  }

  private saveNewLine(
    boMId: number,
    code: LineCode,
    line: ProductionBOMMaterialLine | ProductionBOMResourceLine
  ): void {
    if (this.savingLine()) return;

    this.savingLine.set(code);

    this.bomService.saveLine({
      BoMId: boMId,
      Code: code,
      MaterialLine: code === 'M' ? line as ProductionBOMMaterialLine : null,
      ResourceLine: code === 'R' ? line as ProductionBOMResourceLine : null,
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if (!this.apiSucceeded(result)) {
            this.savingLine.set('');
            this.toastr.error(this.apiMessage(result, 'Could not add the line.'));
            return;
          }

          this.loadLines(boMId, () => {
            this.savingLine.set('');
            if (code === 'M') this.resetMaterialInput();
            else this.resetResourceInput();
            this.toastr.success('Line added.');
          }, () => {
            this.savingLine.set('');
            this.toastr.error('Line saved, but could not reload the list. Use Retry.');
          });
        },
        error: () => {
          this.savingLine.set('');
          this.toastr.error('Could not add the line.');
        },
      });
  }

  private saveExistingLine(
    code: LineCode,
    line: ProductionBOMMaterialLine | ProductionBOMResourceLine
  ): void {
    const header = this.selectedHeader();
    if (!header || this.savingLine()) return;

    this.savingLine.set(`${code}${line.ID}`);

    this.bomService.saveLine({
      BoMId: header.BoMID,
      Code: code,
      MaterialLine: code === 'M' ? line as ProductionBOMMaterialLine : null,
      ResourceLine: code === 'R' ? line as ProductionBOMResourceLine : null,
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          if (!this.apiSucceeded(result)) {
            this.savingLine.set('');
            this.toastr.error(this.apiMessage(result, 'Could not save the line.'));
            return;
          }

          if (code === 'M') {
            const saved = line as ProductionBOMMaterialLine;
            this.materialLines.update(lines =>
              lines.map(current => current.ID === saved.ID ? saved : current)
            );

            if (this.materialEdits()[saved.ID] === saved) {
              this.materialEdits.update(edits => {
                const next = { ...edits };
                delete next[saved.ID];
                return next;
              });
              this.deactivateLine('M', saved.ID);
            }
          } else {
            const saved = line as ProductionBOMResourceLine;
            this.resourceLines.update(lines =>
              lines.map(current => current.ID === saved.ID ? saved : current)
            );

            if (this.resourceEdits()[saved.ID] === saved) {
              this.resourceEdits.update(edits => {
                const next = { ...edits };
                delete next[saved.ID];
                return next;
              });
              this.deactivateLine('R', saved.ID);
            }
          }

          this.savingLine.set('');
          this.toastr.success('Line updated.');
        },
        error: () => {
          this.savingLine.set('');
          this.toastr.error('Could not save the line.');
        },
      });
  }

  private deactivateLine(code: LineCode, id: number): void {
    this.activatedLines.update(current => {
      const next = new Set(current);
      next.delete(`${code}${id}`);
      return next;
    });
  }

  private deleteSavedLine(code: LineCode, id: number): void {
    const header = this.selectedHeader();
    if (!header || this.deletingLine()) return;

    if (!window.confirm('Delete this BOM line?')) return;

    this.deletingLine.set(`${code}${id}`);

    this.bomService.deleteLine(code, id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.deletingLine.set('');

          if (!this.apiSucceeded(result)) {
            this.toastr.error(this.apiMessage(result, 'Could not delete the line.'));
            return;
          }

          this.loadLines(header.BoMID);
          this.toastr.success('Line deleted.');
        },
        error: () => {
          this.deletingLine.set('');
          this.toastr.error('Could not delete the line.');
        },
      });
  }

  private buildMaterialLine(): ProductionBOMMaterialLine | null {
    const form = this.formGroup.controls.rawMaterial.controls;
    const selected = form.name.value;
    const itemId = form.itemId.value;

    if (form.warehouseId.value === null) {
      this.toastr.error('Select a warehouse for the raw material.');
      return null;
    }

    if (!itemId || typeof selected === 'string') {
      this.toastr.error('Select a raw material from the search results.');
      return null;
    }

    if (this.conversionsLoading() || this.conversionsError()) {
      this.toastr.error('Wait for the UoM conversion to load.');
      return null;
    }

    if (!form.bomUom.value || !this.materialConversions().some(row => row.CUoM === form.bomUom.value)) {
      this.toastr.error('Select a CUoM.');
      return null;
    }

    const line: ProductionBOMMaterialLine = {
      ID: 0,
      BoMId: this.selectedHeader()?.BoMID ?? null,
      ItemID: itemId,
      ItemName: selected.ItemName,
      Quantity: form.quantity.value,
      WastagePercent: form.wastagePercent.value,
      Rate: form.rate.value,
      UoM: form.uom.value,
      CUoM: form.bomUom.value,
      ConvertedQty: form.convertedQty.value,
      CValue: this.selectedCValue(),
      ProcessLoss: form.processLoss.value,
      WarehouseID: form.warehouseId.value,
      WarehouseName: this.warehouseOptions().find(w => w.WareHouseID === form.warehouseId.value)?.WareHouse ?? null,
      Remarks: form.remarks.value,
    };

    return this.validateMaterial(line) ? line : null;
  }

  private buildResourceLine(): ProductionBOMResourceLine | null {
    const form = this.formGroup.controls.resource.controls;
    const selected = form.name.value;
    const itemId = form.itemId.value;

    if (form.warehouseId.value === null) {
      this.toastr.error('Select a warehouse for the resource.');
      return null;
    }

    if (!itemId || typeof selected === 'string') {
      this.toastr.error('Select a resource from the search results.');
      return null;
    }

    const line: ProductionBOMResourceLine = {
      ID: 0,
      BoMId: this.selectedHeader()?.BoMID ?? null,
      ItemID: itemId,
      ItemName: selected.ItemName,
      Quantity: form.quantity.value,
      Rate: form.rate.value,
      UoM: form.uom.value,
      WarehouseID: form.warehouseId.value,
      WarehouseName: this.warehouseOptions().find(w => w.WareHouseID === form.warehouseId.value)?.WareHouse ?? null,
      Remarks: form.remarks.value,
    };

    return this.validateResource(line) ? line : null;
  }

  private validateMaterial(line: ProductionBOMMaterialLine): boolean {
    if (!this.validDecimal(line.Quantity, 8, 4, true)) {
      this.toastr.error('Material Quantity must be greater than 0 and fit decimal(18,10).');
      return false;
    }

    if (!this.validDecimal(line.ConvertedQty, 8, 4, true)) {
      this.toastr.error('Converted Quantity must be greater than 0 and fit decimal(18,10).');
      return false;
    }

    if (
      !this.validOptionalDecimal(line.WastagePercent, 12, 2) ||
      !this.validOptionalDecimal(line.ProcessLoss, 8, 2) ||
      !this.validOptionalDecimal(line.Rate, 16, 2)
    ) {
      this.toastr.error('Check Wastage, Process Loss and Rate against their database precision.');
      return false;
    }

    if ((line.UoM?.length ?? 0) > 50 || (line.CUoM?.length ?? 0) > 50) {
      this.toastr.error('UoM and CUoM must be at most 50 characters.');
      return false;
    }

    if ((line.Remarks?.length ?? 0) > 500) {
      this.toastr.error('Remarks must be at most 500 characters.');
      return false;
    }

    return true;
  }

  private validateResource(line: ProductionBOMResourceLine): boolean {
    if (!this.validDecimal(line.Quantity, 8, 2, true)) {
      this.toastr.error('Resource Quantity must be greater than 0 and fit decimal(18,10).');
      return false;
    }

    if (!this.validOptionalDecimal(line.Rate, 16, 2)) {
      this.toastr.error('Resource Rate must fit decimal(18,2).');
      return false;
    }

    if ((line.UoM?.length ?? 0) > 50 || (line.Remarks?.length ?? 0) > 500) {
      this.toastr.error('Resource UoM or Remarks exceeds the database length.');
      return false;
    }

    return true;
  }

  private validOptionalDecimal(
    value: number | null,
    integerDigits: number,
    decimalPlaces: number,
    maximum?: number
  ): boolean {
    return value === null ||
      (
        (maximum === undefined || value <= maximum) &&
        this.validDecimal(value, integerDigits, decimalPlaces, false)
      );
  }

  private validDecimal(
    value: number | null,
    integerDigits: number,
    decimalPlaces: number,
    positive: boolean
  ): boolean {
    if (value === null || !Number.isFinite(value) || value < 0) return false;
    if (positive && value === 0) return false;

    const text = String(value);
    if (text.includes('e') || text.includes('E')) return false;

    const parts = text.split('.');
    return parts[0].length <= integerDigits &&
      (parts[1]?.length ?? 0) <= decimalPlaces;
  }

  private itemAlreadyAdded(itemId: number): boolean {
    return this.materialLines().some(line => line.ItemID === itemId) ||
      this.resourceLines().some(line => line.ItemID === itemId);
  }

  private updateConvertedQty(): void {
    const form = this.formGroup.controls.rawMaterial.controls;
    const quantity = form.quantity.value;

    form.convertedQty.setValue(
      quantity === null || !Number.isFinite(quantity) || !form.bomUom.value
        ? null
        : this.roundToFour(quantity * this.selectedCValue()),
      { emitEvent: false }
    );
  }

  private roundToFour(value: number): number {
    // Quantity has up to 4 decimals; current whole-number CValues need no more.
    // Rounding also removes IEEE 754 noise such as 2.01 * 1000 = 2009.9999999999998.
    return Number(value.toFixed(4));
  }

  private resetForm(): void {
    this.formGroup.reset({
      itemType: null,
      bomName: '',
      rawMaterial: {
        warehouseId: null,
        name: '',
        itemId: null,
        uom: '',
        bomUom: '',
        quantity: null,
        wastagePercent: null,
        processLoss: null,
        rate: null,
        convertedQty: null,
        remarks: '',
      },
      resource: {
        warehouseId: null,
        name: '',
        itemId: null,
        uom: '',
        quantity: null,
        rate: null,
        remarks: '',
      },
    });
  }

  private resetMaterialInput(): void {
    const warehouseId = this.formGroup.controls.rawMaterial.controls.warehouseId.value;
    this.clearMaterialConversion();

    this.formGroup.controls.rawMaterial.reset({
      warehouseId,
      name: '',
      itemId: null,
      uom: '',
      bomUom: '',
      quantity: null,
      wastagePercent: null,
      processLoss: null,
      rate: null,
      convertedQty: null,
      remarks: '',
    });
  }

  private resetResourceInput(): void {
    const warehouseId = this.formGroup.controls.resource.controls.warehouseId.value;

    this.formGroup.controls.resource.reset({
      warehouseId,
      name: '',
      itemId: null,
      uom: '',
      quantity: null,
      rate: null,
      remarks: '',
    });
  }

  private clearMaterialConversion(): void {
    this.conversionsSubscription?.unsubscribe();
    this.conversionsSubscription = null;

    this.materialConversions.set([]);
    this.selectedCValue.set(1);
    this.conversionsLoading.set(false);
    this.conversionsError.set('');

    this.formGroup.controls.rawMaterial.patchValue(
      { uom: '', bomUom: '', convertedQty: null },
      { emitEvent: false }
    );
  }

  private searchItems(
    value: string,
    warehouseId: number | null,
    searching: typeof this.materialSearching
  ): Observable<BoMItem[]> {
    const search = value.trim();

    if (search.length < 2 || this.unitId() <= 0 || warehouseId === null) {
      searching.set(false);
      return of([]);
    }

    searching.set(true);

    return this.bomService.getItems(this.unitId(), warehouseId, search).pipe(
      catchError(() => of([])),
      finalize(() => searching.set(false))
    );
  }

  private loadLines(
    boMId: number,
    onSuccess?: () => void,
    onError?: () => void
  ): void {
    this.linesSubscription?.unsubscribe();
    this.linesLoading.set(true);
    this.linesError.set('');

    this.linesSubscription = this.bomService.getLines(boMId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.materialLines.set([...(data.MaterialLines ?? [])].sort((a, b) => b.ID - a.ID));
          this.resourceLines.set([...(data.ResourceLines ?? [])].sort((a, b) => b.ID - a.ID));
          this.materialEdits.set({});
          this.resourceEdits.set({});
          this.linesLoading.set(false);
          onSuccess?.();
        },
        error: () => {
          this.linesError.set('Could not load BOM lines.');
          this.linesLoading.set(false);
          onError?.();
        },
      });
  }

  private resetLines(): void {
    this.linesSubscription?.unsubscribe();
    this.linesSubscription = null;
    this.materialLines.set([]);
    this.resourceLines.set([]);
    this.materialEdits.set({});
    this.resourceEdits.set({});
    this.activatedLines.set(new Set());
    this.linesLoading.set(false);
    this.linesError.set('');
  }

  private openModal(template: TemplateRef<unknown>): void {
    const modalRef = this.modalService.open(template, {
      fullscreen: true,
      backdrop: 'static',
      keyboard: false,
    });

    this.modalRef = modalRef;

    const cleanup = (): void => {
      if (this.modalRef !== modalRef) return;

      this.linesSubscription?.unsubscribe();
      this.conversionsSubscription?.unsubscribe();
      this.linesSubscription = null;
      this.conversionsSubscription = null;
      this.modalRef = null;
    };

    modalRef.result.then(cleanup, cleanup);
  }


  private reportError(message: string): void {
    if (this.modalRef) {
      this.formError.set(message);
    } else {
      this.actionError.set(message);
    }
  }


  private getEnroll(): number | null {
    const enroll = Number(localStorage.getItem('Enroll'));

    if (!Number.isInteger(enroll) || enroll <= 0) {
      this.toastr.error('Valid employee Enroll was not found.');
      return null;
    }

    return enroll;
  }

  private apiSucceeded(result: unknown): boolean {
    return (result as { Code?: string } | null)?.Code === '200';
  }

  private apiMessage(result: unknown, fallback: string): string {
    return (result as { Message?: string } | null)?.Message || fallback;
  }
}