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
import {
  NgbModal,
  NgbModalRef,
  NgbTypeaheadModule,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap';
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

import { ProductionBOMHeader } from 'src/app/core/model/MasterConfiguration/BOM/BOM-model';
import {
  ProductionBOMMaterialLine,
  ProductionBOMResourceLine,
} from 'src/app/core/model/MasterConfiguration/BOM/BOM-lines-model';
import { BoMItem } from 'src/app/core/model/MasterConfiguration/BOM/BOM-item-model';
import { ProductionMaterialUoM } from 'src/app/core/model/MasterConfiguration/BOM/ProductionMaterial-UoM-model';
import { BomService } from 'src/app/core/services/MasterConfiguration/BoM/bom.service';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-bom',
  standalone: true,
  templateUrl: './bom.html',
  styleUrl: './bom.scss',
  imports: [CommonModule, ReactiveFormsModule, NgbTypeaheadModule, NgSelectModule],
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

  readonly materialSearching = signal(false);
  readonly resourceSearching = signal(false);

  readonly warehouseOptions = signal<IDropdownBind[]>([{ Id: 0, Name: 'Any Warehouse' }]);
  readonly warehousesLoading = signal(false);
  readonly warehousesError = signal('');

  readonly conversionsLoading = signal(false);
  readonly conversionsError = signal('');
  readonly materialConversions = signal<ProductionMaterialUoM[]>([]);

  readonly deletingBomId = signal<number | null>(null);

  private readonly refreshVersion = signal(0);
  private readonly destroy$ = new Subject<void>();

  private modalRef: NgbModalRef | null = null;
  private linesSubscription: Subscription | null = null;
  private conversionsSubscription: Subscription | null = null;

  readonly formGroup = new FormGroup({
    unitId: new FormControl<number | null>(null),
    businessId: new FormControl<number | null>(null),
    itemType: new FormControl<number | null>(null),
    itemName: new FormControl(''),
    bomName: new FormControl('', Validators.required),

    rawMaterial: new FormGroup({
      warehouseId: new FormControl<number>(0, { nonNullable: true }),
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
      warehouseId: new FormControl<number>(0, { nonNullable: true }),
      name: new FormControl<BoMItem | string>(''),
      itemId: new FormControl<number | null>(null),
      uom: new FormControl(''),
      quantity: new FormControl<number | null>(null),
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
      switchMap(text => this.searchItems(
        text,
        this.formGroup.controls.rawMaterial.controls.warehouseId.value,
        this.materialSearching
      ))
    );

  readonly searchResourceItems = (text$: Observable<string>): Observable<BoMItem[]> =>
    text$.pipe(
      debounceTime(800),
      switchMap(text => this.searchItems(
        text,
        this.formGroup.controls.resource.controls.warehouseId.value,
        this.resourceSearching
      ))
    );

  constructor(
    private readonly bomService: BomService,
    private readonly commonService: CommonService,
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

    effect((onCleanup) => {
      const unitId = this.unitId();

      
      this.warehouseOptions.set([{ Id: 0, Name: 'Any Warehouse' }]);
      this.warehousesError.set('');
      this.warehousesLoading.set(unitId > 0);

      this.formGroup.controls.rawMaterial.controls.warehouseId.setValue(0);
      this.formGroup.controls.resource.controls.warehouseId.setValue(0);

      if (unitId <= 0) return;

      const subscription = this.commonService.getWarehousesList(unitId).subscribe({
        next: warehouses => {
          
          this.warehouseOptions.set([{ Id: 0, Name: 'Any Warehouse' }].concat(warehouses));
          this.warehousesLoading.set(false);
        },
        error: () => {
          this.warehousesError.set('Could not load warehouses.');
          this.warehousesLoading.set(false);
        },
      });

      onCleanup(() => subscription.unsubscribe());
    });

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
      .pipe(takeUntil(this.destroy$)).subscribe(() => this.updateConvertedQty());
  }


  openCreate(): void {
    this.resetLines();
    this.clearMaterialConversion();
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
    this.clearMaterialConversion();
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
    if (header) this.loadLines(header.BoMID);
  }

  deleteBom(header: ProductionBOMHeader): void {
    if (this.deletingBomId() !== null) return;

    this.actionError.set('');

    const confirmed = window.confirm(
      `Delete BOM ${header.BoMCode || header.BoMID}?`
    );

    if (!confirmed) return;

    this.deletingBomId.set(header.BoMID);

    this.bomService
      .deleteData(header.BoMID)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deletingBomId.set(null);
          this.refreshVersion.update(value => value + 1);
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
      else if (bottom > visibleBottom) dropdown.scrollTop = bottom - dropdown.clientHeight;
    });
  }

  onMaterialItemSelect(event: NgbTypeaheadSelectItemEvent): void {
    const item = event.item as BoMItem;
    const material = this.formGroup.controls.rawMaterial;

    this.clearMaterialConversion();
    material.patchValue(
      { itemId: item.ItemID },
      { emitEvent: false }
    );

    this.conversionsLoading.set(true);

    this.conversionsSubscription = this.bomService
      .getProductionMaterialUoM( item.ItemID, this.formGroup.controls.rawMaterial.controls.warehouseId.value, this.unitId() )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: rows => {
          this.materialConversions.set(rows ?? []);

          // Pick the first valid conversion. Users can change either selection.
          const first = rows?.find(row => row.UoM && row.CUoM);
          material.patchValue({
            uom: first?.UoM ?? '',
            bomUom: first?.CUoM ?? '',
          });

          this.conversionsLoading.set(false);
          this.updateConvertedQty();
        },
        error: () => {
          this.conversionsError.set('Could not load UoM conversions for this item.');
          this.conversionsLoading.set(false);
        },
      });
  }

  onResourceItemSelect(event: NgbTypeaheadSelectItemEvent): void {
    const item = event.item as BoMItem;

    this.formGroup.controls.resource.patchValue(
      { itemId: item.ItemID, uom: item.UoM ?? '' },
      { emitEvent: false }
    );
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
    this.conversionsSubscription?.unsubscribe();
    this.modalRef?.dismiss();

    this.destroy$.next();
    this.destroy$.complete();
  }

  private clearMaterialConversion(): void {
    this.conversionsSubscription?.unsubscribe();
    this.conversionsSubscription = null;
    this.materialConversions.set([]);
    this.conversionsLoading.set(false);
    this.conversionsError.set('');

    this.formGroup.controls.rawMaterial.patchValue(
      { uom: '', bomUom: '', convertedQty: null },
      { emitEvent: false }
    );
  }

  private updateConvertedQty(): void {
    const material = this.formGroup.controls.rawMaterial.controls;
    const quantity = material.quantity.value;

    const conversion = this.materialConversions().find(row =>
      row.UoM === material.uom.value &&
      row.CUoM === material.bomUom.value
    );

    const convertedQty =
      quantity !== null &&
      quantity !== undefined &&
      Number.isFinite(quantity) &&
      conversion?.CValue !== null &&
      conversion?.CValue !== undefined
        ? quantity * conversion.CValue
        : null;

    material.convertedQty.setValue(convertedQty, { emitEvent: false });
  }

  private searchItems( value: string, warehouseId: number, searching: typeof this.materialSearching ): Observable<BoMItem[]> {
    const search = value.trim();

    if (search.length < 2 || this.unitId() <= 0) {
      searching.set(false);
      return of([]);
    }

    searching.set(true);

    return this.bomService.getItems(this.unitId(), warehouseId, search).pipe(
      catchError(() => of([])),
      finalize(() => searching.set(false))
    );
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
      this.linesLoading.set(false);
      this.conversionsLoading.set(false);
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
        next: data => {
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