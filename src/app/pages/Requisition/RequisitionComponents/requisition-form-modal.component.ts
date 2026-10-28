import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component, DestroyRef, Input, OnInit, TemplateRef, ViewChild, inject, signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl, FormArray, FormControl, FormGroup,
  FormsModule, ReactiveFormsModule, Validators,
} from '@angular/forms';
import {
  NgbActiveModal, NgbModal, NgbModalRef, NgbTypeaheadModule,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import {
  catchError, debounceTime, distinctUntilChanged, finalize,
  forkJoin, Observable, of, Subject, Subscription, switchMap, tap,
} from 'rxjs';

import { MenuPermissionDirective } from 'src/app/core/directives/menu-permission.directive';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { IItem } from 'src/app/core/model/Common/Items/Item';
import { IProductType } from 'src/app/core/model/Common/ProductType/ProductType';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IPlannerUoM } from 'src/app/core/model/Common/UOM/PlannerUoM';
import { DocumentStatusId } from 'src/app/core/model/document-status';
import { IRequisition } from 'src/app/core/model/Requisition/Requisition';
import {
  IViewRequisitionHeader, IViewRequisitionLine,
} from 'src/app/core/model/Requisition/ViewRequisition';
import { PermissionAction } from 'src/app/core/services/Authorization/authorization.service';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { RequisitionService } from 'src/app/core/services/Requisition/requisition.service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';

export type RequisitionFormMode = 'create' | 'edit';
type FormModalState = 'initializing' | 'ready' | 'submitting' | 'failed';

type BulkRow = {
  itemId: number;
  itemName: string;
  uomId: number | null;
  stockQuantity: number;
  salesQuantity: number;
  quantity: number | null;
  remarks: string;
};

@Component({
  selector: 'app-requisition-form-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    NgbTypeaheadModule, MenuPermissionDirective, PaginationComponent,
  ],
  templateUrl: './requisition-form-modal.component.html',
  styleUrl: './requisition-form-modal.component.scss',
})
export class RequisitionFormModalComponent implements OnInit {
  readonly PermissionAction = PermissionAction;
  readonly DocumentStatusId = DocumentStatusId;

  @Input({ required: true }) mode: RequisitionFormMode = 'create';
  @Input() header: IViewRequisitionHeader | null = null;
  @ViewChild('bulkModal') bulkModal!: TemplateRef<unknown>;

  readonly state = signal<FormModalState>('initializing');
  readonly units = signal<IUnit[]>([]);
  readonly businesses = signal<IBusiness[]>([]);
  readonly plannerUoMs = signal<IPlannerUoM[]>([]);
  readonly plannerUoMsLoading = signal(false);
  readonly productTypes = signal<IProductType[]>([]);
  readonly documentStatuses = signal<IDropdownBind[]>([]);
  readonly unitDataLoading = signal(false);

  readonly isItemSearching = signal(false);
  readonly itemSearchCompleted = signal(false);
  readonly itemSearchHasResults = signal(true);
  readonly itemSearchFailed = signal(false);

  readonly bulkSizes = signal<{ ID: number; Name: string }[]>([]);
  readonly bulkSubCategories = signal<{ ID: number; Name: string }[]>([]);
  readonly bulkFiltersLoading = signal(false);
  readonly bulkFiltersReady = signal(false);
  readonly bulkRows = signal<BulkRow[]>([]);
  readonly bulkItemsLoading = signal(false);
  readonly bulkViewed = signal(false);
  readonly bulkError = signal('');
  readonly bulkSearch = signal('');
  readonly bulkCurrentPage = signal(1);
  readonly bulkPageSize = signal(20);
  readonly bulkTotalItems = signal(0);

  readonly bulkFilters = new FormGroup({
    SizeId: new FormControl(0, { nonNullable: true }),
    SubCategoryId: new FormControl(0, { nonNullable: true }),
  });

  readonly formGroup = new FormGroup({
    UnitId: new FormControl('', Validators.required),
    BusinessId: new FormControl('', Validators.required),
    ReqDate: new FormControl(
      { value: new Date().toISOString().split('T')[0], disabled: true },
      Validators.required,
    ),
    StartDate: new FormControl('', Validators.required),
    EndDate: new FormControl('', Validators.required),
    Remarks: new FormControl('', Validators.maxLength(500)),
    Lines: new FormArray([]),
  });

  readonly lineFormGroup = new FormGroup({
    ProductTypeId: new FormControl(2, Validators.required),
    ItemSearch: new FormControl('', Validators.required),
    ItemId: new FormControl('', Validators.required),
    ItemName: new FormControl(''),
    UOMId: new FormControl('', Validators.required),
    Quantity: new FormControl('', [Validators.required, Validators.min(1)]),
    StockQuantity: new FormControl(0),
    SalesQuantity: new FormControl(0),
    Remarks: new FormControl('', Validators.maxLength(500)),
  });

  submitted = false;
  lineSubmitted = false;
  deletedLineIds: number[] = [];

  private readonly destroyRef = inject(DestroyRef);
  private bulkModalRef?: NgbModalRef;
  private bulkRequestId = 0;
  private filterRequestId = 0;
  private plannerUoMRequestId = 0;
  private bulkResultContext = '';
  private readonly bulkDrafts = new Map<number, BulkRow>();
  private readonly bulkReload$ = new Subject<void>();
  private bulkItemsSubscription?: Subscription;

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly modalService: NgbModal,
    private readonly commonService: CommonService,
    private readonly requisitionService: RequisitionService,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    if (this.mode === 'edit' && !this.header) {
      this.failInitialization('Requisition header information was not provided.');
      return;
    }

    this.bulkReload$
      .pipe(
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        if (this.bulkModalRef && this.bulkViewed()) {
          this.loadBulkPage();
        }
      });

    this.watchItemInput();
    this.watchProductType();
    this.watchDateRange();
    this.loadInitialData();
  }

  get isEditMode(): boolean {
    return this.mode === 'edit';
  }

  get isSubmitting(): boolean {
    return this.state() === 'submitting';
  }

  get f(): { [key: string]: AbstractControl } {
    return this.formGroup.controls;
  }

  get lf(): { [key: string]: AbstractControl } {
    return this.lineFormGroup.controls;
  }

  get lines(): FormArray {
    return this.formGroup.get('Lines') as FormArray;
  }

  get selectedUnitId(): number {
    return Number(this.formGroup.get('UnitId')?.value);
  }

  get selectedLineProductTypeId(): number {
    return Number(this.lineFormGroup.get('ProductTypeId')?.value);
  }

  get dateRangeInvalid(): boolean {
    const start = this.formGroup.get('StartDate')?.value;
    const end = this.formGroup.get('EndDate')?.value;
    return !!start && !!end && start > end;
  }

  get canShowAddProduct(): boolean {
    return this.state() === 'ready' &&
      !this.unitDataLoading() &&
      this.selectedUnitId > 0 &&
      Number(this.formGroup.get('BusinessId')?.value) > 0 &&
      !!this.formGroup.get('StartDate')?.value &&
      !!this.formGroup.get('EndDate')?.value &&
      !this.dateRangeInvalid;
  }

  get canAddLine(): boolean {
    return this.canShowAddProduct;
  }

  get isACRL(): boolean {
    return this.selectedUnitId === 6;
  }

  get canViewBulk(): boolean {
    return this.isACRL &&
      this.canShowAddProduct &&
      this.bulkFiltersReady() &&
      !this.bulkFiltersLoading() &&
      !this.bulkItemsLoading();
  }

  get bulkSelectedCount(): number {
    return Array.from(this.bulkDrafts.values()).filter(row =>
      row.quantity !== null &&
      Number.isFinite(row.quantity) &&
      row.quantity > 0).length;
  }

  getAddedBulkLine(itemId: number): AbstractControl | undefined {
    return this.lines.controls.find(line =>
      Number(line.get('ProductTypeId')?.value) === 2 &&
      Number(line.get('ItemId')?.value) === itemId);
  }

  isAlreadyAdded(itemId: number): boolean {
    return !!this.getAddedBulkLine(itemId);
  }

  private invalidateBulkResults(): void {
    ++this.bulkRequestId;
    this.bulkItemsSubscription?.unsubscribe();
    this.bulkItemsSubscription = undefined;
    this.bulkDrafts.clear();
    this.bulkRows.set([]);
    this.bulkViewed.set(false);
    this.bulkItemsLoading.set(false);
    this.bulkTotalItems.set(0);
    this.bulkSearch.set('');
    this.bulkCurrentPage.set(1);
    this.bulkError.set('');
    this.bulkResultContext = '';
  }

  private currentBulkContext(): string {
    return [
      this.selectedUnitId,
      this.formGroup.get('BusinessId')?.value,
      this.formGroup.get('StartDate')?.value,
      this.formGroup.get('EndDate')?.value,
      this.bulkFilters.controls.SizeId.value,
      this.bulkFilters.controls.SubCategoryId.value,
    ].join('|');
  }

  private syncHeaderLock(): void {
    const locked = this.isEditMode || this.lines.length > 0;

    for (const key of ['UnitId', 'BusinessId', 'StartDate', 'EndDate']) {
      const control = this.formGroup.get(key);

      if (locked) control?.disable({ emitEvent: false });
      else control?.enable({ emitEvent: false });
    }
  }

  complete(): void {
    if (!this.header || this.isSubmitting) return;

    this.state.set('submitting');

    this.requisitionService.completeData(this.header.ReqID)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (response.Status) {
            this.toastr.success(response.Message);
            this.activeModal.close({ changed: true });
          } else {
            this.state.set('ready');
            this.toastr.error(response.Message || 'Unable to complete requisition.');
          }
        },
        error: (error: HttpErrorResponse) => {
          this.state.set('ready');
          this.toastr.error(
            this.getErrorMessage(error, 'Unable to complete requisition.'),
          );
        },
      });
  }

  close(): void {
    if (!this.isSubmitting) this.activeModal.close({ changed: false });
  }

  dismiss(): void {
    if (!this.isSubmitting) this.activeModal.dismiss('dismissed');
  }

  submit(): void {
    if (this.isSubmitting) return;

    if (this.isEditMode) this.update();
    else this.create();
  }

onUnitChange(): void {
  this.invalidateBulkResults();
  this.clearPlannerUoMs();
  const unitId = this.selectedUnitId;

  this.formGroup.get('BusinessId')?.reset('');
  this.businesses.set([]);
  this.lines.clear();
  this.syncHeaderLock();
  this.resetLineInput();

  if (unitId <= 0) {
    this.unitDataLoading.set(false);
    return;
  }

  this.loadUnitDependentData(unitId);
}

onBusinessChange(): void {
  this.invalidateBulkResults();
  this.clearPlannerUoMs();
  this.lines.clear();
  this.syncHeaderLock();
  this.resetLineInput();

  const unitId = this.selectedUnitId;
  const businessId = Number(this.formGroup.get('BusinessId')?.value);
  if (unitId > 0 && businessId > 0) {
    this.loadPlannerUoMs(unitId, businessId);
  }
}

  addLine(): void {
    this.lineSubmitted = true;
    this.lineFormGroup.markAllAsTouched();

    if (!this.canAddLine || this.lineFormGroup.invalid) return;


    const selectedUoM = this.plannerUoMs().find(
    uom => uom.UoMId === Number(this.lineFormGroup.controls.UOMId.value),
    );
    if (!selectedUoM) {
      this.toastr.warning('Please select a valid UoM.');
      return;
    }

    const value = this.lineFormGroup.getRawValue();
    const productTypeId = Number(value.ProductTypeId);
    const itemId = productTypeId === 1 ? 0 : Number(value.ItemId);

    if (productTypeId === 2 && this.isAlreadyAdded(itemId)) {
      this.toastr.warning('Item already exists in this requisition.');
      return;
    }

    this.lines.push(new FormGroup({
      ID: new FormControl(0),
      ReqID: new FormControl(this.header?.ReqID ?? 0),
      ProductTypeId: new FormControl(productTypeId),
      ItemId: new FormControl(itemId),
      ItemName: new FormControl(
        productTypeId === 1 ? (value.ItemName?.trim() ?? '') : (value.ItemName ?? ''),
      ),
      UOMId: new FormControl(selectedUoM.UoMId),
      UOMName: new FormControl(selectedUoM.UoMName ?? ''),
      Quantity: new FormControl(Number(value.Quantity)),
      RemainingQuantity: new FormControl<number | null>(null),
      StockQuantity: new FormControl(Number(value.StockQuantity) || 0),
      SalesQuantity: new FormControl(Number(value.SalesQuantity) || 0),
      Remarks: new FormControl(value.Remarks ?? ''),
      DocStatusId: new FormControl(DocumentStatusId.Pending),
      IsActive: new FormControl(true),
    }));

    this.syncHeaderLock();
    this.resetLineInput(productTypeId);
    this.lineSubmitted = false;
  }

  removeLine(index: number): void {
    const lineId = Number(this.lines.at(index).get('ID')?.value);

    if (this.isEditMode && lineId > 0 && !this.deletedLineIds.includes(lineId)) {
      this.deletedLineIds.push(lineId);
    }

    this.lines.removeAt(index);
    this.syncHeaderLock();
  }

  onItemSelect(event: NgbTypeaheadSelectItemEvent): void {
    if (!this.canShowAddProduct) {
      event.preventDefault();
      this.toastr.warning('Select Unit, Business, and a valid date range first.');
      return;
    }

    const item = event.item as IItem;
    const itemId = Number(item.Id);

    if (this.isAlreadyAdded(itemId)) {
      event.preventDefault();
      this.toastr.warning('Item already exists in this requisition.');
      return;
    }

    this.lineFormGroup.patchValue({
      ItemId: String(item.Id),
      ItemName: item.Name,
      StockQuantity: 0,
      SalesQuantity: 0,
    }, { emitEvent: false });

    this.loadStockQuantity(itemId, this.lineFormGroup);
    this.loadSalesQuantity(itemId, this.lineFormGroup);
    this.resetItemSearchState();
  }

  searchItems = (text$: Observable<string>): Observable<IItem[]> =>
    text$.pipe(
      debounceTime(800),
      distinctUntilChanged(),
      switchMap(searchText => {
        const text = searchText.trim();

        this.itemSearchCompleted.set(false);
        this.itemSearchHasResults.set(true);
        this.itemSearchFailed.set(false);

        if (
          this.selectedLineProductTypeId !== 2 ||
          !this.canShowAddProduct ||
          text.length < 2
        ) {
          this.isItemSearching.set(false);
          return of([]);
        }

        this.isItemSearching.set(true);

        return this.commonService.GetItemList(this.selectedUnitId, text).pipe(
          tap(items => {
            this.itemSearchCompleted.set(true);
            this.itemSearchHasResults.set(items.length > 0);
            this.itemSearchFailed.set(false);
          }),
          catchError(() => {
            this.itemSearchCompleted.set(true);
            this.itemSearchHasResults.set(false);
            this.itemSearchFailed.set(true);
            return of([]);
          }),
          finalize(() => this.isItemSearching.set(false)),
        );
      }),
    );

  itemFormatter = (item: IItem | string): string =>
    typeof item === 'string' ? item : (item?.Name ?? '');

  scrollActiveItem(): void {
    setTimeout(() => {
      const dropdown =
        document.querySelector('.requisition-item-dropdown') as HTMLElement | null;
      const activeItem =
        dropdown?.querySelector('.dropdown-item.active') as HTMLElement | null;

      if (!dropdown || !activeItem) return;

      const top = activeItem.offsetTop;
      const bottom = top + activeItem.offsetHeight;
      const visibleTop = dropdown.scrollTop;
      const visibleBottom = visibleTop + dropdown.clientHeight;

      if (top < visibleTop) dropdown.scrollTop = top;
      else if (bottom > visibleBottom) dropdown.scrollTop = bottom - dropdown.clientHeight;
    });
  }

  getProductTypeName(productTypeId: number): string {
    return this.productTypes().find(type =>
      Number(type.Id) === Number(productTypeId))?.Name ?? '-';
  }

  getDocStatusName(docStatusId: number): string {
    return this.documentStatuses().find(status =>
      Number(status.Id) === Number(docStatusId))?.Name ?? '-';
  }

  openBulkModal(): void {
    if (!this.canShowAddProduct || !this.isACRL || !this.bulkModal) return;

    this.bulkModalRef = this.modalService.open(this.bulkModal, {
      fullscreen: true,
      scrollable: true,
      backdrop: 'static',
      windowClass: 'requisition-bulk-modal',
    });

    const unitId = this.selectedUnitId;
    const businessId = Number(this.formGroup.get('BusinessId')?.value);
    const requestId = ++this.filterRequestId;

    this.bulkFiltersLoading.set(true);
    this.bulkFiltersReady.set(false);

    this.requisitionService.GetACRLBulkFilters(unitId, businessId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: filters => {
          if (requestId !== this.filterRequestId) return;

          if (
            unitId !== this.selectedUnitId ||
            businessId !== Number(this.formGroup.get('BusinessId')?.value)
          ) return;

          this.bulkSizes.set(filters.Sizes);
          this.bulkSubCategories.set(filters.SubCategories);
          this.bulkFiltersLoading.set(false);
          this.bulkFiltersReady.set(true);
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.filterRequestId) return;

          this.bulkFiltersLoading.set(false);
          this.toastr.error(
            this.getErrorMessage(error, 'Unable to load ACRL bulk filters.'),
          );
        },
      });
  }

  closeBulkModal(): void {
    ++this.bulkRequestId;
    this.bulkItemsSubscription?.unsubscribe();
    this.bulkItemsLoading.set(false);
    this.bulkModalRef?.close();
    this.bulkModalRef = undefined;
  }

  viewBulkItems(): void {
    if (!this.canViewBulk) return;

    this.bulkDrafts.clear();
    this.bulkRows.set([]);
    this.bulkViewed.set(true);
    this.bulkError.set('');
    this.bulkSearch.set('');
    this.bulkCurrentPage.set(1);
    this.bulkTotalItems.set(0);
    this.bulkResultContext = this.currentBulkContext();

    this.queueBulkPage();
  }

  private queueBulkPage(): void {
    if (!this.bulkViewed()) return;

    ++this.bulkRequestId;
    this.bulkRows.set([]);
    this.bulkItemsLoading.set(true);
    this.bulkError.set('');
    this.bulkReload$.next();
  }

  private loadBulkPage(): void {
    if (
      !this.canShowAddProduct ||
      this.bulkResultContext !== this.currentBulkContext()
    ) {
      this.bulkItemsLoading.set(false);
      this.bulkError.set(
        'Header or filters changed. View the items again before continuing.',
      );
      return;
    }

    const requestId = ++this.bulkRequestId;

    this.bulkItemsLoading.set(true);
    this.bulkError.set('');

    this.bulkItemsSubscription = this.requisitionService.GetBulkItems({
      UnitID: this.selectedUnitId,
      BusinessID: Number(this.formGroup.get('BusinessId')?.value),
      FromDate: this.formGroup.get('StartDate')!.value!,
      ToDate: this.formGroup.get('EndDate')!.value!,
      SizeID: this.bulkFilters.controls.SizeId.value,
      SubCategoryID: this.bulkFilters.controls.SubCategoryId.value,
    }, {
      page: this.bulkCurrentPage(),
      pageSize: this.bulkPageSize(),
      globalSearch: this.bulkSearch(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (requestId !== this.bulkRequestId) return;

          this.bulkRows.set(response.Data.map(item => {
            const itemId = Number(item.ItemID);
            const draft = this.bulkDrafts.get(itemId);

            const row: BulkRow = {
              itemId,
              itemName: item.ItemName,
              uomId: draft?.uomId ?? (this.plannerUoMs().length === 1 ? this.plannerUoMs()[0].UoMId : null),
              stockQuantity: Number(item.StockQuantity),
              salesQuantity: Number(item.SalesQuantity),
              quantity: draft?.quantity ?? null,
              remarks: draft?.remarks ?? '',
            };

            if (draft) this.bulkDrafts.set(itemId, row);

            return row;
          }));

          this.bulkTotalItems.set(response.Total);
          this.bulkItemsLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.bulkRequestId) return;

          this.bulkRows.set([]);
          this.bulkItemsLoading.set(false);
          this.bulkError.set(
            this.getErrorMessage(error, 'Unable to load bulk items.'),
          );
        },
      });
  }

  setBulkSearch(value: string): void {
    this.bulkSearch.set(value);
    this.bulkCurrentPage.set(1);
    this.queueBulkPage();
  }

  onBulkPageChange(page: number): void {
    this.bulkCurrentPage.set(Number(page));
    this.queueBulkPage();
  }

  onBulkPageSizeChange(pageSize: number): void {
    this.bulkPageSize.set(Number(pageSize));
    this.bulkCurrentPage.set(1);
    this.queueBulkPage();
  }

  setBulkQuantity(row: BulkRow, raw: string, input: HTMLInputElement): void {
    const cleaned = raw.replace(/[^\d.]/g, '');
    const dot = cleaned.indexOf('.');
    const validText = dot === -1
      ? cleaned
      : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');

    input.value = validText;

    const quantity = validText === '' || validText === '.'
      ? null
      : Number(validText);

    if (quantity !== null && quantity > 0 && this.isAlreadyAdded(row.itemId)) {
      input.value = row.quantity == null ? '' : String(row.quantity);
      this.toastr.warning(`${row.itemName} is already in this requisition.`);
      return;
    }

    const updated: BulkRow = { ...row, quantity };
    this.bulkDrafts.set(row.itemId, updated);
    this.bulkRows.update(rows => rows.map(current =>
      current.itemId === row.itemId ? updated : current));
  }

  setBulkRemarks(row: BulkRow, remarks: string): void {
    const updated: BulkRow = { ...row, remarks };

    this.bulkDrafts.set(row.itemId, updated);
    this.bulkRows.update(rows => rows.map(current =>
      current.itemId === row.itemId ? updated : current));
  }


  setBulkUoM(row: BulkRow, value: string): void {
    const uomId = Number(value);
    const updated: BulkRow = {
      ...row,
      uomId: this.plannerUoMs().some(uom => uom.UoMId === uomId)
        ? uomId
        : null,
    };

    this.bulkDrafts.set(row.itemId, updated);
    this.bulkRows.update(rows => rows.map(current =>
      current.itemId === row.itemId ? updated : current));
  }
  

  addBulkLines(): void {
    if (!this.canShowAddProduct || this.bulkItemsLoading()) return;

    if (!this.bulkViewed() || this.bulkResultContext !== this.currentBulkContext()) {
      this.toastr.warning(
        'Header or filters changed. View the items again before adding.',
      );
      return;
    }

    const selected = Array.from(this.bulkDrafts.values()).filter(row =>
      row.quantity !== null &&
      Number.isFinite(row.quantity) &&
      row.quantity > 0);

    if (!selected.length) {
      this.toastr.warning('Enter a quantity greater than zero for at least one item.');
      return;
    }
    
    if (selected.some(row =>
      row.uomId === null ||
      !this.plannerUoMs().some(uom => uom.UoMId === row.uomId)
    )) {
      this.toastr.warning('Please select UoM for every selected item.');
      return;
    }

    if (selected.some(row => this.isAlreadyAdded(row.itemId))) {
      this.toastr.warning('Some selected items are already in this requisition.');
      return;
    }

    if (selected.some(row =>
      !Number.isSafeInteger(row.itemId) ||
      row.itemId <= 0 ||
      row.itemId > 2147483647)) {
      this.toastr.error('An item ID is outside the supported range.');
      return;
    }

    selected.forEach(row => {
      const selectedUoM = this.plannerUoMs().find(uom => uom.UoMId === row.uomId)!;

      this.lines.push(new FormGroup({
        ID: new FormControl(0),
        ReqID: new FormControl(this.header?.ReqID ?? 0),
        ProductTypeId: new FormControl(2),
        ItemId: new FormControl(row.itemId),
        ItemName: new FormControl(row.itemName),
        UOMId: new FormControl(selectedUoM.UoMId),
        UOMName: new FormControl(selectedUoM.UoMName ?? ''),
        Quantity: new FormControl(row.quantity),
        RemainingQuantity: new FormControl<number | null>(null),
        StockQuantity: new FormControl(row.stockQuantity),
        SalesQuantity: new FormControl(row.salesQuantity),
        Remarks: new FormControl(row.remarks.trim()),
        DocStatusId: new FormControl(DocumentStatusId.Pending),
        IsActive: new FormControl(true),
      }));
    });

    this.syncHeaderLock();
    this.bulkDrafts.clear();
    this.bulkRows.set([]);
    this.bulkViewed.set(false);
    this.bulkSearch.set('');
    this.bulkCurrentPage.set(1);
    this.bulkTotalItems.set(0);
    this.bulkError.set('');
    this.closeBulkModal();
  }

  private loadInitialData(): void {
    this.state.set('initializing');

    forkJoin({
      units: this.commonService.GetUnitList(),
      productTypes: this.commonService.GetProductTypeList(),
      documentStatuses: this.commonService.GetDocumentStatusList(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ units, productTypes, documentStatuses }) => {
          this.units.set(units);
          this.productTypes.set(productTypes);
          this.documentStatuses.set(documentStatuses);
          console.log('productTypes', productTypes);

          if (this.isEditMode && this.header) {
            this.initializeEditMode(this.header);
            return;
          }

          this.state.set('ready');
        },
        error: (error: HttpErrorResponse) => {
          this.failInitialization(
            this.getErrorMessage(
              error,
              'Unable to initialize the requisition form.',
            ),
          );
        },
      });
  }

  private initializeEditMode(header: IViewRequisitionHeader): void {
    this.formGroup.patchValue({
      UnitId: String(header.UnitId),
      BusinessId: String(header.BusinessId),
      ReqDate: this.toDateInputValue(header.ReqDate),
      StartDate: this.toDateInputValue(header.StartDate),
      EndDate: this.toDateInputValue(header.EndDate),
      Remarks: header.Remarks ?? '',
    });

    this.syncHeaderLock();

    forkJoin({
      businesses: this.commonService.GetBusinessList(header.UnitId),
      lines: this.requisitionService.GetLinesByReqId(header.ReqID),
      plannerUoMs: this.commonService.GetPlannerUoM(header.UnitId, header.BusinessId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ businesses, lines, plannerUoMs }) => {
          this.businesses.set(businesses);
          this.plannerUoMs.set(plannerUoMs);
          this.lineFormGroup.controls.UOMId.setValue(
            plannerUoMs.length === 1 ? String(plannerUoMs[0].UoMId) : '',
          );
          this.populateExistingLines(lines.filter(line => line.IsActive));
          this.state.set('ready');
        },
        error: (error: HttpErrorResponse) => {
          this.failInitialization(
            this.getErrorMessage(
              error,
              'Unable to load the requisition for editing.',
            ),
          );
        },
      });
  }


  private clearPlannerUoMs(): void {
    ++this.plannerUoMRequestId;
    this.lineFormGroup.controls.UOMId.setValue('');
    this.plannerUoMs.set([]);
    this.plannerUoMsLoading.set(false);
  }

  private loadPlannerUoMs(unitId: number, businessId: number): void {
    const requestId = ++this.plannerUoMRequestId;
    this.plannerUoMs.set([]);
    this.plannerUoMsLoading.set(true);

    this.commonService.GetPlannerUoM(unitId, businessId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: plannerUoMs => {
          if (
            requestId !== this.plannerUoMRequestId ||
            unitId !== this.selectedUnitId ||
            businessId !== Number(this.formGroup.get('BusinessId')?.value)
          ) return;

          this.plannerUoMs.set(plannerUoMs);
          this.lineFormGroup.controls.UOMId.setValue(
            plannerUoMs.length === 1 ? String(plannerUoMs[0].UoMId) : '',
          );
          this.plannerUoMsLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          if (requestId !== this.plannerUoMRequestId) return;

          this.plannerUoMsLoading.set(false);
          this.toastr.error(
            this.getErrorMessage(error, 'Unable to load UoM options.'),
          );
        },
      });
  }

  private loadUnitDependentData(unitId: number): void {
    this.unitDataLoading.set(true);

    this.commonService.GetBusinessList(unitId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: businesses => {
          if (this.selectedUnitId !== unitId) return;

          this.businesses.set(businesses);
          this.unitDataLoading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          if (this.selectedUnitId !== unitId) return;

          this.businesses.set([]);
          this.unitDataLoading.set(false);
          this.toastr.error(
            this.getErrorMessage(
              error,
              'Unable to load Unit-related information.',
            ),
          );
        },
      });
  }

  private watchItemInput(): void {
    this.lineFormGroup.get('ItemSearch')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        if (this.selectedLineProductTypeId === 2 && typeof value === 'string') {
          this.lineFormGroup.patchValue({
            ItemId: '',
            ItemName: '',
            StockQuantity: 0,
            SalesQuantity: 0,
          }, { emitEvent: false });
        }
      });
  }

  private watchProductType(): void {
    this.lineFormGroup.get('ProductTypeId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        const productTypeId = Number(value);
        const itemSearch = this.lineFormGroup.get('ItemSearch');
        const itemId = this.lineFormGroup.get('ItemId');
        const itemName = this.lineFormGroup.get('ItemName');

        this.lineFormGroup.patchValue({
          ItemSearch: '',
          ItemId: '',
          ItemName: '',
          StockQuantity: 0,
          SalesQuantity: 0,
        }, { emitEvent: false });

        if (productTypeId === 1) {
          itemSearch?.clearValidators();
          itemId?.clearValidators();
          itemName?.setValidators([Validators.required, Validators.maxLength(200)]);
        } else if (productTypeId === 2) {
          itemSearch?.setValidators(Validators.required);
          itemId?.setValidators(Validators.required);
          itemName?.clearValidators();
        } else {
          itemSearch?.clearValidators();
          itemId?.clearValidators();
          itemName?.clearValidators();
        }

        itemSearch?.updateValueAndValidity({ emitEvent: false });
        itemId?.updateValueAndValidity({ emitEvent: false });
        itemName?.updateValueAndValidity({ emitEvent: false });
        this.resetItemSearchState();
      });
  }

  private watchDateRange(): void {
    for (const key of ['StartDate', 'EndDate']) {
      this.formGroup.get(key)?.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          if (this.lines.length > 0 || this.isEditMode) return;
          this.invalidateBulkResults();
          this.resetLineInput(this.selectedLineProductTypeId);
        });
    }
  }

  private loadStockQuantity(productId: number, target: AbstractControl): void {
    const startDate = this.formGroup.get('StartDate')?.value;
    const endDate = this.formGroup.get('EndDate')?.value;
    const businessId = Number(this.formGroup.get('BusinessId')?.value);

    this.commonService.GetStockQty(
      startDate, endDate, this.selectedUnitId, businessId, null, productId,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: quantity => {
          target.patchValue(
            { StockQuantity: Number(quantity) },
            { emitEvent: false },
          );
        },
        error: () => {
          target.patchValue({ StockQuantity: 0 }, { emitEvent: false });
          this.toastr.error('Unable to load Stock Quantity.');
        },
      });
  }

  private loadSalesQuantity(productId: number, target: AbstractControl): void {
    const startDate = this.formGroup.get('StartDate')?.value;
    const endDate = this.formGroup.get('EndDate')?.value;

    this.commonService.GetSalesQty(
      startDate, endDate, this.selectedUnitId, productId, null, null,
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: quantity => {
          target.patchValue(
            { SalesQuantity: Number(quantity) },
            { emitEvent: false },
          );
        },
        error: () => {
          target.patchValue({ SalesQuantity: 0 }, { emitEvent: false });
          this.toastr.error('Unable to load Sales Quantity.');
        },
      });
  }

  private populateExistingLines(existingLines: IViewRequisitionLine[]): void {
    this.lines.clear();

    existingLines.forEach(line => {
      this.lines.push(new FormGroup({
        ID: new FormControl(Number(line.ID)),
        ReqID: new FormControl(Number(line.ReqID)),
        ProductTypeId: new FormControl(Number(line.ProductTypeId)),
        ItemId: new FormControl(Number(line.ItemId)),
        ItemName: new FormControl(line.ItemName ?? ''),
        UOMId: new FormControl(Number(line.UOMId)),
        UOMName: new FormControl(
          Number(line.UOMId) === 0 ? 'N/A' : (line.UOMName ?? ''),
        ),
        Quantity: new FormControl(Number(line.Quantity)),
        RemainingQuantity: new FormControl<number | null>(line.RemainingQuantity),
        StockQuantity: new FormControl(Number(line.StockQuantity) || 0),
        SalesQuantity: new FormControl(Number(line.SalesQuantity) || 0),
        Remarks: new FormControl(line.Remarks ?? ''),
        DocStatusId: new FormControl(Number(line.DocStatusId)),
        IsActive: new FormControl(true),
      }));
    });

    this.syncHeaderLock();
  }

  private resetLineInput(productTypeId = 2): void {
    this.lineFormGroup.reset({
      ProductTypeId: productTypeId,
      ItemSearch: '',
      ItemId: '',
      ItemName: '',
      UOMId: this.plannerUoMs().length === 1 ? String(this.plannerUoMs()[0].UoMId) : '',
      Quantity: '',
      StockQuantity: 0,
      SalesQuantity: 0,
      Remarks: '',
    });

    this.resetItemSearchState();
    this.lineSubmitted = false;
  }

  private resetItemSearchState(): void {
    this.isItemSearching.set(false);
    this.itemSearchCompleted.set(false);
    this.itemSearchHasResults.set(true);
    this.itemSearchFailed.set(false);
  }

  private create(): void {
    this.submitted = true;
    this.formGroup.markAllAsTouched();

    if (
      this.formGroup.invalid ||
      !this.canShowAddProduct ||
      this.lines.length === 0
    ) return;

    this.state.set('submitting');

    const value = this.formGroup.getRawValue();
    const enroll = Number(localStorage.getItem('Enroll'));
    const now = new Date();

    const requisitionData: IRequisition = {
      Header: {
        ReqID: 0,
        RequisitionNumber: '',
        UnitId: Number(value.UnitId),
        BusinessId: Number(value.BusinessId),
        ReqDate: now,//new Date(value.ReqDate!),
        StartDate: new Date(value.StartDate!),
        EndDate: new Date(value.EndDate!),
        Remarks: value.Remarks?.trim() ?? '',
        DocStatusId: DocumentStatusId.Pending,
        IsActive: true,
        CREATEDBY: enroll,
        UPDATEDBY: enroll,
        CREATEDDATE: now,
        UPDATEDDATE: now,
      },
      Lines: this.lines.getRawValue().map((line: any) => ({
        ID: 0,
        ReqID: 0,
        ProductTypeId: Number(line.ProductTypeId),
        ItemId: Number(line.ProductTypeId) === 1 ? 0 : Number(line.ItemId),
        ItemName: Number(line.ProductTypeId) === 1
          ? (line.ItemName?.trim() ?? '')
          : null,
        UOMId: Number(line.UOMId),
        Quantity: Number(line.Quantity),
        StockQuantity: Number(line.StockQuantity) || 0,
        SalesQuantity: Number(line.SalesQuantity) || 0,
        Remarks: line.Remarks?.trim() ?? '',
        DocStatusId: DocumentStatusId.Pending,
        IsActive: true,
      })),
      DeletedLineIds: [],
    };

    this.requisitionService.addData(requisitionData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (response.Status) {
            this.toastr.success(response.Message);
            this.activeModal.close({ changed: true });
          } else {
            this.finishSubmissionFailure(
              response.Message || 'Unable to save the requisition.',
            );
          }
        },
        error: (error: HttpErrorResponse) => {
          this.finishSubmissionFailure(
            this.getErrorMessage(
              error,
              'Something went wrong while saving the requisition.',
            ),
          );
        },
      });
  }

  private update(): void {
    this.submitted = true;
    this.formGroup.markAllAsTouched();

    if (
      this.formGroup.invalid ||
      !this.canShowAddProduct ||
      this.lines.length === 0 ||
      !this.header
    ) return;

    this.state.set('submitting');

    const value = this.formGroup.getRawValue();
    const enroll = Number(localStorage.getItem('Enroll'));
    const now = new Date();

    const requisitionData: IRequisition = {
      Header: {
        ReqID: this.header.ReqID,
        RequisitionNumber: this.header.RequisitionNumber,
        UnitId: Number(value.UnitId),
        BusinessId: Number(value.BusinessId),
        ReqDate: new Date(value.ReqDate!),
        StartDate: new Date(value.StartDate!),
        EndDate: new Date(value.EndDate!),
        Remarks: value.Remarks?.trim() ?? '',
        DocStatusId: Number(this.header.DocStatusId),
        IsActive: this.header.IsActive,
        CREATEDBY: Number(this.header.CREATEDBY),
        UPDATEDBY: enroll,
        CREATEDDATE: new Date(this.header.CREATEDDATE!),
        UPDATEDDATE: now,
      },
      Lines: this.lines.getRawValue()
        .filter((line: any) => Number(line.ID) === 0)
        .map((line: any) => ({
          ID: 0,
          ReqID: this.header!.ReqID,
          ProductTypeId: Number(line.ProductTypeId),
          ItemId: Number(line.ProductTypeId) === 1 ? 0 : Number(line.ItemId),
          ItemName: Number(line.ProductTypeId) === 1
            ? (line.ItemName?.trim() ?? '')
            : null,
          UOMId: Number(line.UOMId),
          Quantity: Number(line.Quantity),
          StockQuantity: Number(line.StockQuantity) || 0,
          SalesQuantity: Number(line.SalesQuantity) || 0,
          Remarks: line.Remarks?.trim() ?? '',
          DocStatusId: DocumentStatusId.Pending,
          IsActive: true,
        })),
      DeletedLineIds: this.deletedLineIds,
    };

    this.requisitionService.updateData(requisitionData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (response.Status) {
            this.toastr.success(response.Message);
            this.activeModal.close({ changed: true });
          } else {
            this.finishSubmissionFailure(
              response.Message || 'Unable to update the requisition.',
            );
          }
        },
        error: (error: HttpErrorResponse) => {
          this.finishSubmissionFailure(
            this.getErrorMessage(
              error,
              'Something went wrong while updating the requisition.',
            ),
          );
        },
      });
  }

  private finishSubmissionFailure(message: string): void {
    this.state.set('failed');
    this.toastr.error(message);
    this.activeModal.dismiss('submission-failed');
  }

  private failInitialization(message: string): void {
    this.state.set('failed');
    this.toastr.error(message);
    this.activeModal.dismiss('initialization-failed');
  }

  private getErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const detail = error.error?.detail ?? error.error?.Detail;
    if (typeof detail === 'string' && detail.trim()) return detail;

    const message = error.error?.message ?? error.error?.Message;
    if (typeof message === 'string' && message.trim()) return message;

    return fallback;
  }

  private toDateInputValue(value: Date | string | null | undefined): string {
    if (!value) return '';

    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return value.substring(0, 10);
  }
}