import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, Input, OnInit, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormControl, FormGroup, FormsModule, NgModel, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal, NgbModalRef, NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, map, merge, Observable, of, startWith, Subject, Subscription, switchMap, tap } from 'rxjs';
import { MenuPermissionDirective } from 'src/app/core/directives/menu-permission.directive';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { IItem } from 'src/app/core/model/Common/Items/Item';
import { IPriority } from 'src/app/core/model/Common/Priority/Priority';
import { IProductType } from 'src/app/core/model/Common/ProductType/ProductType';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IPlannerUoM } from 'src/app/core/model/Common/UOM/PlannerUoM';
import { DocumentStatusId } from 'src/app/core/model/document-status';
import { IRequisition } from 'src/app/core/model/Requisition/Requisition';
import { PermissionAction } from 'src/app/core/services/Authorization/authorization.service';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { RequisitionService } from 'src/app/core/services/Requisition/requisition.service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { PriorityInputComponent } from 'src/app/shared/priority-input/priority-input.component';

type FormModalState = 'initializing' | 'ready' | 'submitting' | 'failed';
type BulkRow = {
  itemId: number;
  itemName: string;
  sizeId: number | null;
  size: string | null;
  priority: number | null;
  uomId: number | null;
  stockQuantity: number;
  salesQuantity: number;
  count: number;
  quantity: number | null;
  remarks: string;
};

@Component({
  selector: 'app-requisition-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgbTypeaheadModule, MenuPermissionDirective, PaginationComponent, PriorityInputComponent],
  templateUrl: './requisition-form-modal.component.html',
  styleUrl: './requisition-form-modal.component.scss',
})
export class RequisitionFormModalComponent implements OnInit {
  readonly PermissionAction = PermissionAction;
  readonly DocumentStatusId = DocumentStatusId;

  @ViewChild('bulkModal') bulkModal!: TemplateRef<unknown>;

  readonly state = signal<FormModalState>('initializing');
  readonly units = signal<IUnit[]>([]);
  readonly businesses = signal<IBusiness[]>([]);
  readonly plannerUoMs = signal<IPlannerUoM[]>([]);
  readonly plannerUoMsLoading = signal(false);
  readonly productTypes = signal<IProductType[]>([]);
  readonly priorities = signal<IPriority[]>([]);
  readonly documentStatuses = signal<IDropdownBind[]>([]);
  readonly unitDataLoading = signal(false);
  readonly isItemSearching = signal(false);
  readonly itemSearchCompleted = signal(false);
  readonly itemSearchHasResults = signal(true);
  readonly itemSearchFailed = signal(false);
  readonly itemQuantitiesLoading = signal(false);
  readonly bulkSizes = signal<IDropdownBind[]>([]);
  readonly bulkSubCategories = signal<IDropdownBind[]>([]);
  readonly bulkGrades = signal<IDropdownBind[]>([]);
  readonly bulkFiltersLoading = signal(false);
  readonly bulkSubCategoriesLoading = signal(false);
  readonly bulkFiltersReady = signal(false);
  readonly bulkRows = signal<BulkRow[]>([]);
  readonly bulkItemsLoading = signal(false);
  readonly bulkViewed = signal(false);
  readonly bulkError = signal('');
  readonly bulkSearch = signal('');
  readonly bulkCurrentPage = signal(1);
  readonly bulkPageSize = signal(100);
  readonly bulkTotalItems = signal(0);

  readonly bulkFilters = new FormGroup({
    ProductTypeId: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    SizeId: new FormControl(0, { nonNullable: true }),
    SubCategoryId: new FormControl(0, { nonNullable: true }),
    GradeId: new FormControl(0, { nonNullable: true }),
  });
  readonly formGroup = new FormGroup({
    UnitId: new FormControl('', Validators.required),
    BusinessId: new FormControl('', Validators.required),
    ReqDate: new FormControl({ value: new Date().toISOString().split('T')[0], disabled: true }, Validators.required),
    StartDate: new FormControl('', Validators.required),
    EndDate: new FormControl('', Validators.required),
    Remarks: new FormControl('', Validators.maxLength(500)),
    Lines: new FormArray([]),
  });


  readonly lineSearch = signal('');
  private readonly mainLineRows = signal<{ line: AbstractControl; index: number }[]>([]);

  private readonly linesByProduct = computed(() => {
    const lookup = new Map<string, AbstractControl>();
    for (const { line } of this.mainLineRows()) {
      const key = `${Number(line.get('ProductTypeId')?.value)}:${Number(line.get('ItemId')?.value)}`;
      if (!lookup.has(key)) lookup.set(key, line);
    }
    return lookup;
  });

  readonly filteredLines = computed(() => {
    const rows = this.mainLineRows();
    const search = this.lineSearch().trim().toLowerCase();
    if (!search) return rows;

    return rows.filter(({ line }) =>
      String(line.get('ItemName')?.value ?? '').toLowerCase().includes(search) ||
      String(line.get('ItemId')?.value ?? '').includes(search));
  });

  readonly totalQuantity = toSignal(
    this.lines.valueChanges.pipe(
      map(() => this.lines.controls.reduce(
        (total, line) => total + Number(line.get('Quantity')?.value ?? 0),
        0,
      )),
    ),
    { initialValue: 0 },
  );

  priorityName(id: number | null): string {
    return this.priorities().find(p => p.Id === (id ?? 0))?.PriorityName ?? 'N/A';
  }

  readonly lineFormGroup = new FormGroup({
    ProductTypeId: new FormControl<number | null>(null, Validators.required),
    ItemSearch: new FormControl<IItem | string>({ value: '', disabled: true }, Validators.required),
    ItemId: new FormControl('', Validators.required),
    ItemName: new FormControl(''),
    SizeID: new FormControl<number | null>(null),
    Size: new FormControl<string | null>(null),
    Priority: new FormControl<number | null>(null),
    UOMId: new FormControl('', Validators.required),
    Quantity: new FormControl('', [Validators.required, Validators.min(1)]),
    StockQuantity: new FormControl(0),
    SalesQuantity: new FormControl(0),
    Count: new FormControl<number | null>(null),
    Remarks: new FormControl('', Validators.maxLength(500)),
  });

  submitted = false;
  lineSubmitted = false;
  // deletedLineIds: number[] = [];
  private readonly destroyRef = inject(DestroyRef);
  private bulkModalRef?: NgbModalRef;
  private bulkRequestId = 0;
  private filterRequestId = 0;
  private plannerUoMRequestId = 0;
  private bulkSizeSubscription?: Subscription;
  private bulkItemsSubscription?: Subscription;
  private itemQuantitiesSubscription?: Subscription;
  private itemCountSubscription?: Subscription;
  readonly itemCountLoading = signal(false);
  private bulkResultContext = '';
  private bulkNeedsReload = false;
  private readonly bulkDrafts = new Map<number, BulkRow>();
  private readonly bulkReload$ = new Subject<void>();

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly modalService: NgbModal,
    private readonly commonService: CommonService,
    private readonly requisitionService: RequisitionService,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {

    this.bulkReload$.pipe(debounceTime(800), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.bulkModalRef && this.bulkViewed()) this.loadBulkPage();
    });
    merge(
      this.bulkFilters.controls.SubCategoryId.valueChanges,
      this.bulkFilters.controls.GradeId.valueChanges,
    ).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onBulkFilterChange());
    this.watchItemInput();
    this.watchProductType();
    this.watchDateRange();
    this.loadInitialData();
  }

  get isSubmitting(): boolean { return this.state() === 'submitting'; }
  get f(): { [key: string]: AbstractControl } { return this.formGroup.controls; }
  get lf(): { [key: string]: AbstractControl } { return this.lineFormGroup.controls; }
  get lines(): FormArray { return this.formGroup.get('Lines') as FormArray; }
  get selectedUnitId(): number { return Number(this.formGroup.controls.UnitId.value); }
  get selectedLineProductTypeId(): number { return Number(this.lineFormGroup.controls.ProductTypeId.value); }
  get selectedBulkProductTypeId(): number { return Number(this.bulkFilters.controls.ProductTypeId.value); }
  get hasSelectedLineProductType(): boolean { return this.isValidProductType(this.selectedLineProductTypeId); }
  get hasSelectedBulkProductType(): boolean { return this.isValidProductType(this.selectedBulkProductTypeId); }
  get dateRangeInvalid(): boolean {
    const start = this.formGroup.controls.StartDate.value;
    const end = this.formGroup.controls.EndDate.value;
    return !!start && !!end && start > end;
  }
  get canShowAddProduct(): boolean {
    return this.state() === 'ready' && !this.unitDataLoading() && this.selectedUnitId > 0 &&
      Number(this.formGroup.controls.BusinessId.value) > 0 &&
      !!this.formGroup.controls.StartDate.value && !!this.formGroup.controls.EndDate.value && !this.dateRangeInvalid;
  }
  get canAddLine(): boolean {
        return this.canShowAddProduct && this.hasSelectedLineProductType &&
              !this.itemQuantitiesLoading() && !this.itemCountLoading();
  }
  get isACRL(): boolean { return this.selectedUnitId === 6; }
  get canViewBulk(): boolean {
    return this.isACRL && this.canShowAddProduct && this.hasSelectedBulkProductType &&
      this.bulkFiltersReady() && !this.bulkFiltersLoading() &&
      !this.bulkSubCategoriesLoading() && !this.bulkItemsLoading();
  }
  get bulkSelectedCount(): number {
    return Array.from(this.bulkDrafts.values()).filter(row =>
      row.quantity !== null && Number.isFinite(row.quantity) && row.quantity > 0).length;
  }
  get canAddBulk(): boolean {
    return this.canShowAddProduct && this.hasSelectedBulkProductType && this.bulkViewed() &&
      !this.bulkItemsLoading() && !this.bulkError() && this.bulkSelectedCount > 0 &&
      this.bulkResultContext === this.currentBulkContext();
  }

  private isValidProductType(productTypeId: number): boolean {
    return (productTypeId === 1 || productTypeId === 2) &&
      this.productTypes().some(type => Number(type.Id) === productTypeId);
  }

  private findAddedLine(itemId: number, productTypeId: number): AbstractControl | undefined {
    return this.linesByProduct().get(`${productTypeId}:${itemId}`);
  }

  getAddedBulkLine(itemId: number): AbstractControl | undefined {
    return this.findAddedLine(itemId, this.selectedBulkProductTypeId);
  }

  isAlreadyAdded(itemId: number, productTypeId: number): boolean {
    return !!this.findAddedLine(itemId, productTypeId);
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
      this.selectedUnitId, this.formGroup.controls.BusinessId.value,
      this.formGroup.controls.StartDate.value, this.formGroup.controls.EndDate.value,
      this.selectedBulkProductTypeId, this.bulkFilters.controls.SizeId.value,
      this.bulkFilters.controls.SubCategoryId.value, this.bulkFilters.controls.GradeId.value,
    ].join('|');
  }

  private syncHeaderLock(): void {
    this.mainLineRows.set(this.lines.controls.map((line, index) => ({ line, index })));
    const locked = this.lines.length > 0;
    for (const key of ['UnitId', 'BusinessId', 'StartDate', 'EndDate']) {
      const control = this.formGroup.get(key);
      if (locked) control?.disable({ emitEvent: false });
      else control?.enable({ emitEvent: false });
    }
  }



  close(): void {
    if (!this.isSubmitting) this.activeModal.close({ changed: false });
  }

  dismiss(): void {
    if (!this.isSubmitting) this.activeModal.dismiss('dismissed');
  }

  submit(): void {
    if (this.isSubmitting) return;
    this.create();
  }

  onUnitChange(): void {
    this.invalidateBulkResults();
    this.clearPlannerUoMs();
    const unitId = this.selectedUnitId;
    this.formGroup.controls.BusinessId.reset('');
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
    const businessId = Number(this.formGroup.controls.BusinessId.value);
    if (this.selectedUnitId > 0 && businessId > 0) this.loadPlannerUoMs(this.selectedUnitId, businessId);
  }

  addLine(): void {
    this.lineSubmitted = true;
    this.lineFormGroup.markAllAsTouched();
    if (!this.canAddLine || this.lineFormGroup.invalid) return;
    const value = this.lineFormGroup.getRawValue();
    const productTypeId = Number(value.ProductTypeId);
    const itemId = Number(value.ItemId);
    if (!Number.isSafeInteger(itemId) || itemId <= 0 || itemId > 2147483647) {
      this.toastr.warning('Please search and select a valid Item.');
      return;
    }
    if (this.isAlreadyAdded(itemId, productTypeId)) {
      this.toastr.warning('Item already exists for this Product Type.');
      return;
    }
    const selectedUoM = this.plannerUoMs().find(uom => uom.UoMId === Number(value.UOMId));
    if (!selectedUoM) {
      this.toastr.warning('Please select a valid UoM.');
      return;
    }
    this.lines.push(new FormGroup({
      ID: new FormControl(0),
      ReqID: new FormControl(0),
      ProductTypeId: new FormControl(productTypeId),
      ItemId: new FormControl(itemId),
      ItemName: new FormControl(value.ItemName ?? ''),
      SizeID: new FormControl<number | null>(value.SizeID ?? null),
      Size: new FormControl<string | null>(value.Size ?? null),
      Priority: new FormControl<number | null>(value.Priority ?? null),
      UOMId: new FormControl(selectedUoM.UoMId),
      UOMName: new FormControl(selectedUoM.UoMName ?? ''),
      Quantity: new FormControl(Number(value.Quantity), [Validators.required, Validators.min(0.0001)]),
      RemainingQuantity: new FormControl<number | null>(null),
      StockQuantity: new FormControl(Number(value.StockQuantity) || 0),
      SalesQuantity: new FormControl(Number(value.SalesQuantity) || 0),
      Count: new FormControl<number | null>(value.Count),
      Remarks: new FormControl(value.Remarks ?? ''),
      DocStatusId: new FormControl(DocumentStatusId.Pending),
      IsActive: new FormControl(true),
    }));
    this.syncHeaderLock();
    this.resetLineInput(productTypeId);
    this.lineSubmitted = false;
  }

  removeLine(index: number): void {
    this.lines.removeAt(index);
    this.syncHeaderLock();
  }

  onItemSelect(event: NgbTypeaheadSelectItemEvent): void {
    event.preventDefault();
    if (!this.canShowAddProduct || !this.hasSelectedLineProductType) {
      this.toastr.warning('Select Product Type and valid header information first.');
      return;
    }
    const item = event.item as IItem;
    const itemId = Number(item.Id);
    if (!Number.isSafeInteger(itemId) || itemId <= 0 || itemId > 2147483647) {
      this.toastr.warning('Please select a valid Item.');
      return;
    }

    // Keep the selected item even when the current item/type pair is a duplicate.
    // Changing type can then make this same selection available for Add.
    this.cancelItemQuantities();
    this.lineFormGroup.patchValue({
      ItemSearch: item,
      ItemId: String(itemId),
      ItemName: item.Name,
      SizeID: item.SizeId ?? null,
      Size: item.Size ?? null,
      StockQuantity: 0,
      SalesQuantity: 0,
    }, { emitEvent: false });
    this.loadItemQuantities(itemId);
    this.loadItemCount();
    this.resetItemSearchState();
    if (this.isAlreadyAdded(itemId, this.selectedLineProductTypeId)) {
      this.toastr.warning('Item already exists for this Product Type.');
    }
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
        if (!this.hasSelectedLineProductType || !this.canShowAddProduct || text.length < 2) {
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
      takeUntilDestroyed(this.destroyRef),
    );



  itemFormatter = (item: IItem | string): string =>
  typeof item === 'string'
    ? item
    : `${item?.Name ?? ''}${item?.Size ? ` — Size: ${item.Size}` : ''}`;

  scrollActiveItem(): void {
    setTimeout(() => {
      const dropdown = document.querySelector('.requisition-item-dropdown') as HTMLElement | null;
      const activeItem = dropdown?.querySelector('.dropdown-item.active') as HTMLElement | null;
      if (!dropdown || !activeItem) return;
      const top = activeItem.offsetTop;
      const bottom = top + activeItem.offsetHeight;
      if (top < dropdown.scrollTop) dropdown.scrollTop = top;
      else if (bottom > dropdown.scrollTop + dropdown.clientHeight) dropdown.scrollTop = bottom - dropdown.clientHeight;
    });
  }

  getProductTypeName(productTypeId: number): string {
    return this.productTypes().find(type => Number(type.Id) === Number(productTypeId))?.Name ?? '-';
  }

  getDocStatusName(docStatusId: number): string {
    return this.documentStatuses().find(status => Number(status.Id) === Number(docStatusId))?.Name ?? '-';
  }

  openBulkModal(): void {
    if (!this.canShowAddProduct || !this.isACRL || !this.bulkModal || this.bulkModalRef) return;
    const modalRef = this.modalService.open(this.bulkModal, {
      fullscreen: true, scrollable: true, backdrop: 'static', keyboard: false,
      windowClass: 'requisition-bulk-modal',
    });
    this.bulkModalRef = modalRef;
    modalRef.hidden.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.bulkModalRef === modalRef) this.cleanupBulkModal();
    });
    if (this.bulkNeedsReload) {
      this.bulkNeedsReload = false;
      this.reloadBulkResults();
    }
    const unitId = this.selectedUnitId;
    const businessId = Number(this.formGroup.controls.BusinessId.value);
    const requestId = ++this.filterRequestId;
    let firstSizeEmission = true;
    this.bulkSizeSubscription = this.bulkFilters.controls.SizeId.valueChanges.pipe(
      startWith(this.bulkFilters.controls.SizeId.value),
      tap(() => {
        if (!firstSizeEmission) {
          this.bulkFilters.controls.SubCategoryId.setValue(0, { emitEvent: false });
          this.bulkSubCategories.set([]);
        }
        if (!firstSizeEmission) {
          this.bulkFilters.controls.SubCategoryId.setValue(0, { emitEvent: false });
          this.bulkSubCategories.set([]);
          this.onBulkFilterChange();
        }
        firstSizeEmission = false;
      }),
      switchMap(sizeId => {
        if (sizeId <= 0) {
          this.bulkSubCategories.set([]);
          this.bulkSubCategoriesLoading.set(false);
          return of([]);
        }
        this.bulkSubCategoriesLoading.set(true);
        return this.requisitionService.GetACRLtilesSubCategory(unitId, businessId, sizeId).pipe(
          catchError((error: HttpErrorResponse) => {
            this.toastr.error(this.getErrorMessage(error, 'Unable to load ACRL Subcategories.'));
            return of([]);
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(subCategories => {
      this.bulkSubCategories.set(subCategories);
      this.bulkSubCategoriesLoading.set(false);
    });
    this.bulkFiltersLoading.set(true);
    this.bulkFiltersReady.set(false);
    forkJoin({
      sizes: this.requisitionService.GetACRLtilesSize(unitId, businessId),
      grades: this.requisitionService.GetItemDimentionGrade(unitId, businessId),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ sizes, grades }) => {
        if (requestId !== this.filterRequestId || !this.bulkModalRef ||
            unitId !== this.selectedUnitId || businessId !== Number(this.formGroup.controls.BusinessId.value)) return;
        this.bulkSizes.set(sizes);
        this.bulkGrades.set(grades);
        this.bulkFiltersLoading.set(false);
        this.bulkFiltersReady.set(true);
      },
      error: (error: HttpErrorResponse) => {
        if (requestId !== this.filterRequestId || !this.bulkModalRef) return;
        this.bulkFiltersLoading.set(false);
        this.toastr.error(this.getErrorMessage(error, 'Unable to load ACRL Size or Grade.'));
      },
    });
  }

  private cleanupBulkModal(): void {
    this.bulkNeedsReload ||= this.bulkItemsLoading();
    ++this.filterRequestId;
    this.bulkSizeSubscription?.unsubscribe();
    this.bulkSizeSubscription = undefined;
    this.bulkSubCategoriesLoading.set(false);
    this.bulkFiltersLoading.set(false);
    ++this.bulkRequestId;
    this.bulkItemsSubscription?.unsubscribe();
    this.bulkItemsSubscription = undefined;
    this.bulkItemsLoading.set(false);
    this.bulkModalRef = undefined;
  }

  closeBulkModal(): void {
    const modalRef = this.bulkModalRef;
    this.cleanupBulkModal();
    modalRef?.close();
  }

  onBulkTypeChange(productTypeId: number, productTypeModel: NgModel): void {
    const control = this.bulkFilters.controls.ProductTypeId;
    if (productTypeId === control.value) return;

    if (this.bulkDrafts.size > 0 &&
        !window.confirm('Your saved draft will be lost upon changing this filter. Continue?')) {
      productTypeModel.control.setValue(control.value, { emitViewToModelChange: false });
      return;
    }

    control.setValue(productTypeId);
    this.bulkDrafts.clear();
    this.bulkRows.set([]);
    this.bulkTotalItems.set(0);
    this.onBulkFilterChange();
  }

  private onBulkFilterChange(): void {
    this.bulkCurrentPage.set(1);
    this.reloadBulkResults();
  }

  private reloadBulkResults(): void {
    if (!this.bulkModalRef || !this.hasSelectedBulkProductType) return;

    this.bulkResultContext = this.currentBulkContext();
    this.bulkViewed.set(true);
    this.queueBulkPage();
  }

  retryBulkLoad(): void {
    this.queueBulkPage();
  }

  private queueBulkPage(): void {
    if (!this.bulkViewed()) return;
    ++this.bulkRequestId;

    this.bulkItemsLoading.set(true);
    this.bulkError.set('');
    this.bulkReload$.next();
  }

  private loadBulkPage(): void {
    if (!this.canShowAddProduct || !this.hasSelectedBulkProductType ||
        this.bulkResultContext !== this.currentBulkContext()) {
      this.bulkItemsLoading.set(false);
      this.bulkError.set('Header or filters changed. View the items again before continuing.');
      return;
    }
    const requestId = ++this.bulkRequestId;
    this.bulkItemsSubscription?.unsubscribe();
    this.bulkItemsLoading.set(true);
    this.bulkError.set('');
    const search = this.bulkSearch().trim();
    this.bulkItemsSubscription = this.requisitionService.GetBulkItems({
      UnitID: this.selectedUnitId,
      BusinessID: Number(this.formGroup.controls.BusinessId.value),
      ProductTypeId: this.selectedBulkProductTypeId,
      ExcludeReqId: 0,
      FromDate: this.formGroup.controls.StartDate.value!,
      ToDate: this.formGroup.controls.EndDate.value!,
      SizeID: this.bulkFilters.controls.SizeId.value,
      SubCategoryID: this.bulkFilters.controls.SubCategoryId.value,
      GradeID: this.bulkFilters.controls.GradeId.value,
    }, {
      page: this.bulkCurrentPage(), pageSize: this.bulkPageSize(), globalSearch: search.length >= 2 ? search : '',
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (requestId !== this.bulkRequestId) return;
        this.bulkRows.set(response.Data.map(item => {
          const itemId = Number(item.ItemID);
          const draft = this.bulkDrafts.get(itemId);
          const row: BulkRow = {
            itemId, itemName: item.ItemName,
            sizeId: item.SizeId ?? null,
            size: item.Size ?? null,
            priority: draft?.priority ?? null,
            uomId: draft?.uomId ?? (this.plannerUoMs().length === 1 ? this.plannerUoMs()[0].UoMId : null),
            stockQuantity: Number(item.StockQuantity), salesQuantity: Number(item.SalesQuantity),
            count: Number(item.Count) || 0,
            quantity: draft?.quantity ?? null, remarks: draft?.remarks ?? '',
          };
          if (draft) this.bulkDrafts.set(itemId, row);
          return row;
        }));
        this.bulkTotalItems.set(response.Total);
        this.bulkItemsLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (requestId !== this.bulkRequestId) return;
        this.bulkItemsLoading.set(false);
        this.bulkError.set(this.getErrorMessage(error, 'Unable to load bulk items.'));
      },
    });
  }

  setBulkSearch(value: string): void {
    const previous = this.bulkSearch().trim();
    const next = value.trim();
    this.bulkSearch.set(value);

    if ((previous.length >= 2 ? previous : '') === (next.length >= 2 ? next : '')) return;

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
    const validText = dot === -1 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
    input.value = validText;
    const quantity = validText === '' || validText === '.' ? null : Number(validText);
    if (quantity !== null && quantity > 0 && this.isAlreadyAdded(row.itemId, this.selectedBulkProductTypeId)) {
      input.value = row.quantity == null ? '' : String(row.quantity);
      this.toastr.warning(`${row.itemName} is already added for this Product Type.`);
      return;
    }
    this.updateBulkDraft({ ...row, quantity });
  }

  setBulkPriority(row: BulkRow, priority: number | null): void {
    this.updateBulkDraft({ ...row, priority });
  }
  setBulkRemarks(row: BulkRow, remarks: string): void {
    this.updateBulkDraft({ ...row, remarks });
  }

  setBulkUoM(row: BulkRow, value: string): void {
    const uomId = Number(value);
    this.updateBulkDraft({
      ...row, uomId: this.plannerUoMs().some(uom => uom.UoMId === uomId) ? uomId : null,
    });
  }

  private updateBulkDraft(row: BulkRow): void {
    this.bulkDrafts.set(row.itemId, row);
    this.bulkRows.update(rows => rows.map(current => current.itemId === row.itemId ? row : current));
  }

  addBulkLines(): void {
    if (!this.canShowAddProduct || this.bulkItemsLoading()) return;
    if (!this.hasSelectedBulkProductType) {
      this.toastr.warning('Please select Product Type.');
      return;
    }
    if (!this.bulkViewed() || this.bulkResultContext !== this.currentBulkContext()) {
      this.toastr.warning('Header or filters changed. View the items again before adding.');
      return;
    }
    const selected = Array.from(this.bulkDrafts.values()).filter(row =>
      row.quantity !== null && Number.isFinite(row.quantity) && row.quantity > 0);
    if (!selected.length) {
      this.toastr.warning('Enter a quantity greater than zero for at least one item.');
      return;
    }
    if (selected.some(row => row.quantity !== null && row.quantity < 0.0001)) {
      this.toastr.warning('Quantity must be at least 0.0001 for every selected item.');
      return;
    }
    if (selected.some(row => row.uomId === null || !this.plannerUoMs().some(uom => uom.UoMId === row.uomId))) {
      this.toastr.warning('Please select UoM for every selected item.');
      return;
    }
    const productTypeId = this.selectedBulkProductTypeId;
    if (selected.some(row => this.isAlreadyAdded(row.itemId, productTypeId))) {
      this.toastr.warning('Some selected items are already added for this Product Type.');
      return;
    }
    if (selected.some(row => !Number.isSafeInteger(row.itemId) || row.itemId <= 0 || row.itemId > 2147483647)) {
      this.toastr.error('An item ID is outside the supported range.');
      return;
    }
    selected.forEach(row => {
      const selectedUoM = this.plannerUoMs().find(uom => uom.UoMId === row.uomId)!;
      this.lines.push(new FormGroup({
        ID: new FormControl(0),
        ReqID: new FormControl(0),
        ProductTypeId: new FormControl(productTypeId),
        ItemId: new FormControl(row.itemId),
        ItemName: new FormControl(row.itemName),
        SizeID: new FormControl<number | null>(row.sizeId),
        Size: new FormControl<string | null>(row.size),
        Priority: new FormControl<number | null>(row.priority),
        UOMId: new FormControl(selectedUoM.UoMId),
        UOMName: new FormControl(selectedUoM.UoMName ?? ''),
        Quantity: new FormControl(row.quantity, [Validators.required, Validators.min(0.0001)]),
        RemainingQuantity: new FormControl<number | null>(null),
        StockQuantity: new FormControl(row.stockQuantity),
        SalesQuantity: new FormControl(row.salesQuantity),
        Count: new FormControl(row.count),
        Remarks: new FormControl(row.remarks.trim()),
        DocStatusId: new FormControl(DocumentStatusId.Pending),
        IsActive: new FormControl(true),
      }));
    });
    this.syncHeaderLock();
    this.bulkDrafts.clear();
    this.bulkRows.set([]);
    this.bulkTotalItems.set(0);
    this.bulkNeedsReload = true;
    this.closeBulkModal();
  }

  private loadInitialData(): void {
    this.state.set('initializing');
    forkJoin({
      units: this.commonService.GetUnitList(),
      productTypes: this.commonService.GetProductTypeList(),
      priorities: this.commonService.GetPriorityList(),
      documentStatuses: this.commonService.GetDocumentStatusList(),
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: ({ units, productTypes, documentStatuses, priorities }) => {
        this.units.set(units);
        this.productTypes.set(productTypes);
        this.priorities.set(priorities);
        this.documentStatuses.set(documentStatuses);
        this.syncItemSearchEnabled();

        this.state.set('ready');
      },
      error: (error: HttpErrorResponse) => {
        this.failInitialization(this.getErrorMessage(error, 'Unable to initialize the requisition form.'));
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
    this.commonService.GetPlannerUoM(unitId, businessId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: plannerUoMs => {
        if (requestId !== this.plannerUoMRequestId || unitId !== this.selectedUnitId ||
            businessId !== Number(this.formGroup.controls.BusinessId.value)) return;
        this.plannerUoMs.set(plannerUoMs);
        this.lineFormGroup.controls.UOMId.setValue(plannerUoMs.length === 1 ? String(plannerUoMs[0].UoMId) : '');
        this.plannerUoMsLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (requestId !== this.plannerUoMRequestId) return;
        this.plannerUoMsLoading.set(false);
        this.toastr.error(this.getErrorMessage(error, 'Unable to load UoM options.'));
      },
    });
  }

  private loadUnitDependentData(unitId: number): void {
    this.unitDataLoading.set(true);
    this.commonService.GetBusinessList(unitId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: businesses => {
        if (this.selectedUnitId !== unitId) return;
        this.businesses.set(businesses);
        this.unitDataLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        if (this.selectedUnitId !== unitId) return;
        this.businesses.set([]);
        this.unitDataLoading.set(false);
        this.toastr.error(this.getErrorMessage(error, 'Unable to load Unit-related information.'));
      },
    });
  }

  private watchItemInput(): void {
    this.lineFormGroup.controls.ItemSearch.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => {
        if (typeof value !== 'string') return;
        this.cancelItemQuantities();
        this.clearItemCount();
        this.lineFormGroup.patchValue({
          ItemId: '', ItemName: '', SizeID: null, Size: null,
          StockQuantity: 0, SalesQuantity: 0,
        }, { emitEvent: false });
      });
  }

  private watchProductType(): void {
    this.lineFormGroup.controls.ProductTypeId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncItemSearchEnabled();
        this.loadItemCount();
      });
  }

  private syncItemSearchEnabled(): void {
    const control = this.lineFormGroup.controls.ItemSearch;
    if (this.hasSelectedLineProductType) control.enable({ emitEvent: false });
    else control.disable({ emitEvent: false });
  }

  private watchDateRange(): void {
    for (const key of ['StartDate', 'EndDate']) {
      this.formGroup.get(key)?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        if (this.lines.length > 0) return;
        this.invalidateBulkResults();
        this.resetLineInput(this.selectedLineProductTypeId || null);
      });
    }
  }


    private clearItemCount(): void {
    this.itemCountSubscription?.unsubscribe();
    this.itemCountSubscription = undefined;
    this.itemCountLoading.set(false);
    this.lineFormGroup.controls.Count.setValue(null, { emitEvent: false });
  }

  private loadItemCount(): void {
    this.clearItemCount();

    const itemId = Number(this.lineFormGroup.controls.ItemId.value);
    const fromDate = this.formGroup.controls.StartDate.value;
    const toDate = this.formGroup.controls.EndDate.value;

    if (!this.canShowAddProduct || !this.hasSelectedLineProductType ||
        itemId <= 0 || !fromDate || !toDate) return;

    this.itemCountLoading.set(true);
    this.itemCountSubscription = this.requisitionService.GetRequisitionCount(
      fromDate,
      toDate,
      this.selectedUnitId,
      Number(this.formGroup.controls.BusinessId.value),
      itemId,
      this.selectedLineProductTypeId,
      0,
    ).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.itemCountLoading.set(false)),
    ).subscribe({
      next: count => {
        this.lineFormGroup.controls.Count.setValue(Number(count), { emitEvent: false });
      },
      error: () => {
        this.toastr.error('Unable to load Requisition Count.');
      },
    });
  }

  private cancelItemQuantities(): void {
    this.itemQuantitiesSubscription?.unsubscribe();
    this.itemQuantitiesSubscription = undefined;
    this.itemQuantitiesLoading.set(false);
  }

  private loadItemQuantities(itemId: number): void {
    this.cancelItemQuantities();
    const startDate = this.formGroup.controls.StartDate.value;
    const endDate = this.formGroup.controls.EndDate.value;
    const unitId = this.selectedUnitId;
    const businessId = Number(this.formGroup.controls.BusinessId.value);
    this.itemQuantitiesLoading.set(true);
    this.itemQuantitiesSubscription = forkJoin({
      stock: this.commonService.GetLatestStockQty(endDate, unitId, businessId, null, itemId).pipe(
        catchError(() => {
          this.toastr.error('Unable to load Stock Quantity.');
          return of(0);
        }),
      ),
      sales: this.commonService.GetSalesQty(startDate, endDate, unitId, itemId, null, null).pipe(
        catchError(() => {
          this.toastr.error('Unable to load Sales Quantity.');
          return of(0);
        }),
      ),
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.itemQuantitiesLoading.set(false)),
    ).subscribe(({ stock, sales }) => {
      this.lineFormGroup.patchValue({
        StockQuantity: Number(stock) || 0, SalesQuantity: Number(sales) || 0,
      }, { emitEvent: false });
    });
  }


  private resetLineInput(productTypeId: number | null = null): void {
    this.cancelItemQuantities();
    this.clearItemCount();
    this.lineFormGroup.reset({
      ProductTypeId: productTypeId, ItemSearch: '', ItemId: '', ItemName: '',
      SizeID: null, Size: null, Priority: null,
      UOMId: this.plannerUoMs().length === 1 ? String(this.plannerUoMs()[0].UoMId) : '',
      Quantity: '', StockQuantity: 0, SalesQuantity: 0, Count: null, Remarks: '',
    }, { emitEvent: false });
    this.syncItemSearchEnabled();
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
    if (this.formGroup.invalid || !this.canShowAddProduct || this.lines.length === 0) return;
    this.state.set('submitting');
    const value = this.formGroup.getRawValue();
    const enroll = Number(localStorage.getItem('Enroll'));
    const now = new Date();
    const requisitionData: IRequisition = {
      Header: {
        ReqID: 0, RequisitionNumber: '',
        UnitId: Number(value.UnitId), BusinessId: Number(value.BusinessId),
        ReqDate: now, StartDate: new Date(value.StartDate!), EndDate: new Date(value.EndDate!),
        TotalQuantity: Number(this.totalQuantity().toFixed(4)),
        Remarks: value.Remarks?.trim() ?? '', DocStatusId: DocumentStatusId.Pending,
        IsActive: true, CREATEDBY: enroll, UPDATEDBY: enroll, CREATEDDATE: now, UPDATEDDATE: now,
      },
      Lines: this.lines.getRawValue().map((line: any) => ({
        ID: 0, ReqID: 0, ProductTypeId: Number(line.ProductTypeId), ItemId: Number(line.ItemId),
        ItemName: line.ItemName?.trim() ?? '', UOMId: Number(line.UOMId), Quantity: Number(line.Quantity),
        SizeID: line.SizeID ?? null,
        Size: line.Size ?? null,
        Priority: line.Priority ?? null,
        StockQuantity: Number(line.StockQuantity) || 0, SalesQuantity: Number(line.SalesQuantity) || 0,
        Remarks: line.Remarks?.trim() ?? '', DocStatusId: DocumentStatusId.Pending, IsActive: true,
      })),
      DeletedLineIds: [],
    };
    this.requisitionService.addData(requisitionData).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: response => {
        if (response.Status) {
          this.toastr.success(response.Message);
          this.activeModal.close({ changed: true });
        } else this.finishSubmissionFailure(response.Message || 'Unable to save the requisition.');
      },
      error: (error: HttpErrorResponse) => {
        this.finishSubmissionFailure(this.getErrorMessage(error, 'Something went wrong while saving the requisition.'));
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
    return typeof message === 'string' && message.trim() ? message : fallback;
  }


}