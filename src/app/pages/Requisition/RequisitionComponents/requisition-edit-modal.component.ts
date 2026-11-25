import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, Input, OnInit, TemplateRef, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgModel } from '@angular/forms';
import { NgbActiveModal, NgbModal, NgbModalRef, NgbPopoverModule, NgbTypeaheadModule, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, Subscription, catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, of, switchMap, tap } from 'rxjs';

import { MenuPermissionDirective } from 'src/app/core/directives/menu-permission.directive';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { IItem } from 'src/app/core/model/Common/Items/Item';
import { IProductType } from 'src/app/core/model/Common/ProductType/ProductType';
import { IPriority } from 'src/app/core/model/Common/Priority/Priority';
import { IPlannerUoM } from 'src/app/core/model/Common/UOM/PlannerUoM';
import { DocumentStatusId } from 'src/app/core/model/document-status';
import { IAddRequisitionLineInput, IRequisitionLineHistory } from 'src/app/core/model/Requisition/RequisitionEdit';
import { IViewRequisitionHeader, IViewRequisitionLine } from 'src/app/core/model/Requisition/ViewRequisition';
import { IApiResponse } from 'src/app/core/model/Response/ApiResponse';
import { PermissionAction } from 'src/app/core/services/Authorization/authorization.service';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { RequisitionService } from 'src/app/core/services/Requisition/requisition.service';
// import { PriorityInputComponent } from 'src/app/shared/priority-input/priority-input.component';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';

import { requisitionRemainingBadgeStyle, requisitionTotalRemainingBadgeStyle } from 'src/app/shared/utils/requisition-quantity-badge.styles';


type LineDraft = {
  quantity: number | null;
  priority: number | null;
  remarks: string;
  additionalQuantity: number | null;
};

type BulkRow = {
  itemId: number;
  name: string;
  sizeId: number | null;
  size: string | null;
  stock: number;
  sales: number;
  count: number | null;
  countedRequisitions: Record<string, string>;
  totalRequestedQuantity: number | null;
  totalRemainingQuantity: number | null;
};

type BulkDraft = {
  row: BulkRow;
  quantity: number | null;
  priority: number | null;
  uomId: number;
  remarks: string;
  quantityText?: string;
};

type RequestConfirmation = {
  title: string;
  text: string;
  message: string;
  submit: (message: string | null) => void;
};

@Component({
  selector: 'app-requisition-edit-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbTypeaheadModule, NgbPopoverModule, MenuPermissionDirective, PaginationComponent],
  templateUrl: './requisition-edit-modal.component.html',
  styleUrl: './requisition-edit-modal.component.scss',
})
export class RequisitionEditModalComponent implements OnInit {


  



  @Input({ required: true }) header!: IViewRequisitionHeader;
  @ViewChild('bulkModal') bulkModal!: TemplateRef<unknown>;
  @ViewChild('bulkTable') private bulkTable?: ElementRef<HTMLElement>;
  @ViewChild('historyModal') historyModal!: TemplateRef<unknown>;
  private historyModalRef?: NgbModalRef;
  @ViewChild('requestModal') requestModal!: TemplateRef<unknown>;


      readonly requisitionRemainingBadgeStyle = requisitionRemainingBadgeStyle;
      readonly requisitionTotalRemainingBadgeStyle = requisitionTotalRemainingBadgeStyle;

  readonly PermissionAction = PermissionAction;
  readonly lines = signal<IViewRequisitionLine[]>([]);

  readonly lineSearch = signal('');

  private readonly linesByProduct = computed(() => {
    const lookup = new Map<string, IViewRequisitionLine>();
    for (const line of this.lines()) {
      const key = `${Number(line.ProductTypeId)}:${Number(line.ItemId)}`;
      if (!lookup.has(key)) lookup.set(key, line);
    }
    return lookup;
  });

  readonly filteredLines = computed(() => {
    const lines = this.lines();
    const search = this.lineSearch().trim().toLowerCase();
    if (!search) return lines;

    return lines.filter(line =>
      (line.ItemName ?? '').toLowerCase().includes(search) ||
      String(line.ItemId).includes(search));
  });




  readonly totalQuantity = computed(() => this.lines().reduce((total, line) => total + line.Quantity, 0));
  readonly saving = signal(false);
  readonly loadingLines = signal(false);
  readonly linesReady = signal(false);
  readonly loadingOptions = signal(true);
  readonly productTypes = signal<IProductType[]>([]);
  readonly priorities = signal<IPriority[]>([]);
  readonly plannerUoMs = signal<IPlannerUoM[]>([]);
  readonly drafts = new Map<number, LineDraft>();

  headerRemarks = '';
  private savedHeaderRemarks = '';
  private changed = false;

  productTypeId = 0;
  itemSearch: IItem | string = '';
  selectedItem: IItem | null = null;
  priority: number | null = 0;
  uomId = 0;
  quantity: number | null = null;
  remarks = '';
  stock: number | null = null;
  sales: number | null = null;
  count: number | null = null;
  countedRequisitions: Record<string, string> = {};
  totalRequestedQuantity: number | null = null;
  totalRemainingQuantity: number | null = null;
  remainingQuantity: number | null = null;
  readonly loadingItem = signal(false);
  readonly isItemSearching = signal(false);
  readonly itemSearchCompleted = signal(false);
  readonly itemSearchHasResults = signal(true);
  readonly itemSearchFailed = signal(false);
  private itemSubscription?: Subscription;
  appliedBulkFilters = { ProductTypeId: 0, SizeId: 0, SubCategoryId: 0, GradeId: 0 };
  bulkProductTypeId = 0;
  bulkSizeId = 0;
  bulkSubCategoryId = 0;
  bulkGradeId = 0;
  bulkSearch = '';
  readonly bulkPage = signal(1);
  readonly bulkPageSize = signal(100);
  readonly bulkTotal = signal(0);

  readonly bulkViewed = signal(false);



  readonly bulkRows = signal<BulkRow[]>([]);
  readonly bulkSizes = signal<IDropdownBind[]>([]);
  readonly bulkSubCategories = signal<IDropdownBind[]>([]);
  readonly bulkGrades = signal<IDropdownBind[]>([]);
  readonly loadingBulkOptions = signal(false);
  readonly loadingSubCategories = signal(false);
  readonly loadingBulk = signal(false);
  readonly bulkError = signal('');
  readonly bulkDrafts = new Map<number, BulkDraft>();
  private bulkRef?: NgbModalRef;
  private bulkOptionsSubscription?: Subscription;
  private bulkSubscription?: Subscription;
  private subCategorySubscription?: Subscription;
  private readonly bulkSearchChanges = new Subject<void>();
  private bulkSearchPending = false;
  private bulkRequestId = 0;
  private bulkNeedsReload = false;

  expandedLineId: number | null = null;
  readonly history = signal<IRequisitionLineHistory[]>([]);
  readonly loadingHistory = signal(false);
  readonly historyError = signal('');
  readonly historyActionTakers = signal(new Map<string, IRequisitionLineHistory[]>());
  readonly viewedActionTakersBatchId = signal<string | null>(null);
  private historySubscription?: Subscription;

  confirmation: RequestConfirmation | null = null;
  private confirmationRef?: NgbModalRef;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private readonly activeModal: NgbActiveModal,
    private readonly modalService: NgbModal,
    private readonly commonService: CommonService,
    private readonly requisitionService: RequisitionService,
    private readonly toastr: ToastrService,
  ) {
    this.destroyRef.onDestroy(() => {
      this.confirmationRef?.dismiss('parent-closed');
      this.bulkRef?.dismiss('parent-closed');
      this.historyModalRef?.dismiss('parent-closed');
    });
  }

  ngOnInit(): void {
    this.savedHeaderRemarks = this.header.Remarks ?? '';
    this.headerRemarks = this.savedHeaderRemarks;
    this.reloadLines();

    forkJoin({
      types: this.commonService.GetProductTypeList(),
      priorities: this.commonService.GetPriorityList(),
      uoms: this.commonService.GetPlannerUoM(this.header.UnitId, this.header.BusinessId),
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingOptions.set(false)),
    ).subscribe({
      next: ({ types, uoms, priorities }) => {
        this.productTypes.set(types);
        this.priorities.set(priorities);
        this.plannerUoMs.set(uoms);
        this.uomId = this.defaultUomId;
      },
      error: error => this.toastr.error(this.errorMessage(error, 'Unable to load product types and UoMs.')),
    });

    this.bulkSearchChanges.pipe(debounceTime(800), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.bulkSearchPending && this.bulkRef) this.loadBulkPage();
    });
  }

  get isRequestMode(): boolean {
    return !this.header.IsEditable;
  }

  get isOpen(): boolean {
    return this.header.IsActive &&
      this.header.DocStatusId !== DocumentStatusId.Completed &&
      this.header.DocStatusId !== 5; // REJC
  }

  get canWrite(): boolean {
    return this.isOpen && this.linesReady() && !this.loadingLines() && !this.saving();
  }

  get canAdd(): boolean {
    return this.canWrite && !this.loadingOptions() && this.productTypes().length > 0 &&
      !!this.fromDate && !!this.toDate && this.fromDate <= this.toDate;
  }

  get fromDate(): string { return this.dateInput(this.header.StartDate); }
  get toDate(): string { return this.dateInput(this.header.EndDate); }

  get defaultUomId(): number {
    const uoms = this.plannerUoMs();
    return uoms.length === 1 ? uoms[0].UoMId : 0;
  }

  get canSaveHeader(): boolean {
    return this.isOpen && !this.saving() && this.headerRemarks.trim() !== this.savedHeaderRemarks.trim();
  }

  get canAddSingle(): boolean {
    return this.canAdd && !this.loadingItem() && !!this.selectedItem &&
      this.productTypeId > 0 && this.validUom(this.uomId) &&
      this.validQuantity(this.quantity, true) && this.validPriority(this.priority) &&
      !this.savedLine(this.selectedItem.Id, this.productTypeId);
  }

  get bulkSelection(): BulkDraft[] {
    return [...this.bulkDrafts.values()].filter(draft =>
      draft.quantity !== null && Number.isFinite(draft.quantity) && draft.quantity > 0);
  }

  get canAddBulk(): boolean {
    const selected = this.bulkSelection;
      return this.canAdd && this.bulkViewed() && this.appliedBulkFilters.ProductTypeId > 0 && !this.loadingBulk() && !this.bulkError() && selected.length > 0 &&
      selected.every(draft =>
        this.validQuantity(draft.quantity, true) && this.validUom(draft.uomId) && this.validPriority(draft.priority) &&
        !this.savedLine(draft.row.itemId, this.appliedBulkFilters.ProductTypeId));
  }

  close(): void {
    if (!this.saving()) this.activeModal.close({ changed: this.changed });
  }



  reloadLines(): void {
    if (this.loadingLines()) return;

    this.loadingLines.set(true);
    this.requisitionService.GetLinesByReqId(this.header.ReqID).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingLines.set(false)),
    ).subscribe({
      next: rows => {
        const active = rows.filter(row => row.IsActive);
        const activeIds = new Set(active.map(row => row.ID));

        for (const id of this.drafts.keys()) {
          if (!activeIds.has(id)) this.drafts.delete(id);
        }
        for (const row of active) {
          if (!this.drafts.has(row.ID)) {
            this.drafts.set(row.ID, { quantity: row.Quantity, priority: row.Priority ?? 0, remarks: row.Remarks ?? '', additionalQuantity: null,});
          }
        }

        this.lines.set(active);
        this.linesReady.set(true);
        if (this.expandedLineId !== null && !activeIds.has(this.expandedLineId)) {
          this.expandedLineId = null;
          this.historySubscription?.unsubscribe();
          this.history.set([]);
        }
      },
      error: error => {
        this.linesReady.set(false);
        this.toastr.error(this.errorMessage(error, 'Unable to load requisition lines.'));
      },
    });
  }

  saveHeaderRemarks(): void {
    if (!this.canSaveHeader) return;
    const enroll = this.getEnroll();
    if (enroll === null) return;

    const remarks = this.headerRemarks.trim();
    this.write(this.requisitionService.updateHeaderRemarks({
      ReqID: this.header.ReqID, Enroll: enroll, Remarks: remarks,
    }), () => {
      this.savedHeaderRemarks = remarks;
      this.headerRemarks = remarks;
    });
  }

  priorityName(id: number | null): string {
    return this.priorities().find(p => p.Id === (id ?? 0))?.PriorityName ?? 'N/A';
  }

  validPriority(id: number | null): boolean {
    return Number.isSafeInteger(id) && this.priorities().some(p => p.Id === id && p.IsActive !== false);
  }

  canSaveLine(line: IViewRequisitionLine, draft: LineDraft): boolean {
    return this.canWrite && !this.isRequestMode &&
      this.validQuantity(draft.quantity, true) && this.validPriority(draft.priority) &&
      (draft.quantity !== line.Quantity ||
       draft.priority !== (line.Priority ?? 0) ||
       draft.remarks.trim() !== (line.Remarks ?? '').trim());
  }

  saveLine(line: IViewRequisitionLine, draft: LineDraft): void {
    if (!this.canSaveLine(line, draft) || draft.quantity === null) return;
    const enroll = this.getEnroll();
    if (enroll === null) return;

    const quantity = draft.quantity;
    const priority = draft.priority ?? 0;
    const remarks = draft.remarks.trim();
    this.write(this.requisitionService.updateLine({
      ReqLineID: line.ID, Quantity: quantity, Priority: priority,
      Remarks: remarks, Enroll: enroll,
    }), () => {
      this.lines.update(rows => rows.map(row => row.ID === line.ID
        ? { ...row, Quantity: quantity, Priority: priority, Remarks: remarks }
        : row));
      this.drafts.set(line.ID, { quantity, priority, remarks, additionalQuantity: null });
      this.reloadLines();
    });
  }

  deleteLine(line: IViewRequisitionLine): void {
    if (!this.canWrite || this.isRequestMode || this.lines().length <= 1) return;
    if (!window.confirm(`Delete ${line.ItemName} from this requisition?`)) return;

    const enroll = this.getEnroll();
    if (enroll === null) return;

    this.write(this.requisitionService.deleteLine({ ReqLineID: line.ID, Enroll: enroll }), () => {
      this.drafts.delete(line.ID);
      this.lines.update(rows => rows.filter(row => row.ID !== line.ID));
      this.reloadLines();
    });
  }

  canRequestChange(draft: LineDraft): boolean {
    return this.canWrite && this.isRequestMode && this.validQuantity(draft.additionalQuantity, false);
  }

  requestChange(line: IViewRequisitionLine, draft: LineDraft): void {
    if (!this.canRequestChange(draft) || draft.additionalQuantity === null) return;
    const enroll = this.getEnroll();
    if (enroll === null) return;

    const additional = draft.additionalQuantity;
    const projected = (line.Quantity + additional).toFixed(4);
    this.openConfirmation(
      'Request Change',
      `${line.ItemName} · ${line.ProductTypeName}. Current ${line.Quantity}, adjustment ${additional}, projected ${projected}.`,
      message => this.write(this.requisitionService.changeLineRequest({
        ReqLineID: line.ID, AdditionalRequestedQuantity: additional, Enroll: enroll, RequesterMessage: message,
      }), () => {
        draft.additionalQuantity = null;
        this.reloadLines();
        if (this.expandedLineId === line.ID) this.loadHistory(line.ID);
      }),
    );
  }

  get historyLine(): IViewRequisitionLine | null {
    return this.lines().find(line => line.ID === this.expandedLineId) ?? null;
  }

  openHistory(line: IViewRequisitionLine): void {
    if (!this.isRequestMode || this.historyModalRef) return;

    this.expandedLineId = line.ID;
    this.viewedActionTakersBatchId.set(null);
    this.loadHistory(line.ID);

    const ref = this.modalService.open(this.historyModal, {
      fullscreen: true,
      windowClass: 'fullscreen-modal',
      scrollable: true,
      ariaLabelledBy: 'requisition-line-history-title',
    });

    this.historyModalRef = ref;
    ref.hidden.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.historyModalRef = undefined;
        this.expandedLineId = null;
        this.historySubscription?.unsubscribe();
        this.history.set([]);
    });
    }


  toggleHistoryActionTakers(requestBatchId: string): void {
    this.viewedActionTakersBatchId.update(current => current === requestBatchId ? null : requestBatchId);
  }

  withdrawHistoryRequest(request: IRequisitionLineHistory): void {
    const lineId = this.expandedLineId;
    if (lineId === null || this.saving() || !request.IsActive || request.StatusCode !== 'PEND') return;

    const enroll = this.getEnroll();
    if (enroll === null) return;

    if (!window.confirm('Withdraw this request?')) return;

    this.write(this.requisitionService.withdrawLineRequest(request.RequestBatchId, enroll), () => {
      if (this.expandedLineId === lineId) this.loadHistory(lineId);
      this.reloadLines();
    });
  }

  private loadHistory(lineId: number): void {
    this.historySubscription?.unsubscribe();
    this.history.set([]);
    this.historyError.set('');
    this.loadingHistory.set(true);

    this.historySubscription = this.requisitionService.GetLineHistory(lineId).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingHistory.set(false)),
    ).subscribe({
    next: rows => {
      const batches = new Map<string, IRequisitionLineHistory>();
      const actionTakers = new Map<string, IRequisitionLineHistory[]>();

      for (const row of rows) {
        if (!batches.has(row.RequestBatchId)) {
          batches.set(row.RequestBatchId, row);
          actionTakers.set(row.RequestBatchId, []);
        }

        actionTakers.get(row.RequestBatchId)!.push(row);
      }

      this.historyActionTakers.set(actionTakers);
      this.history.set([...batches.values()]);
    },
      error: error => this.historyError.set(this.errorMessage(error, 'Unable to load request history.')),
    });
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
        if (!this.productTypeId || !this.canAdd || text.length < 2) {
          this.isItemSearching.set(false);
          return of([]);
        }
        this.isItemSearching.set(true);
        return this.requisitionService.GetItemList( this.header.UnitId, text, this.header.BusinessId, this.fromDate, this.toDate, this.productTypeId, this.header.ReqID,)
        .pipe(
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

  onItemTextChange(value: IItem | string): void {
    this.itemSearch = value;
  }

  onItemSelect(event: NgbTypeaheadSelectItemEvent): void {
    event.preventDefault();
    const item = event.item as IItem;
    this.selectedItem = item;
    this.itemSearch = item;
    this.loadItemMetrics(item);
  }

  onProductTypeChange(productTypeId: number): void {
    this.productTypeId = productTypeId;
    this.loadItemMetrics();
  }

  private clearItemMetrics(): void {
    this.itemSubscription?.unsubscribe();
    this.itemSubscription = undefined;
    this.loadingItem.set(false);
    this.stock = this.sales = this.count = null;
    this.countedRequisitions = {};
    this.totalRequestedQuantity = this.totalRemainingQuantity = this.remainingQuantity = null;
  }

  private loadItemMetrics(searchResult?: IItem): void {
    this.clearItemMetrics();
    const item = this.selectedItem;
    if (!item || !this.productTypeId || !this.fromDate || !this.toDate) return;

    const { UnitId, BusinessId, ReqID } = this.header;
    this.loadingItem.set(true);
    this.itemSubscription = forkJoin({
      stock: this.commonService.GetLatestStockQty(this.toDate, UnitId, BusinessId, null, item.Id),
      metrics: searchResult
        ? of([searchResult])
        : this.requisitionService.GetItemList(UnitId, String(item.Id), BusinessId, this.fromDate, this.toDate, this.productTypeId, ReqID),
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingItem.set(false)),
    ).subscribe({
      next: ({ stock, metrics }) => {
        const result = metrics.find(row => Number(row.Id) === Number(item.Id));
        this.stock = Number(stock);
        this.sales = result?.SalesQuantity ?? 0;
        this.count = result?.Count ?? null;
        this.countedRequisitions = result?.CountedRequisitions ?? {};
        this.totalRequestedQuantity = result?.TotalRequestedQuantity ?? null;
        this.totalRemainingQuantity = result?.TotalRemainingQuantity ?? null;
        this.remainingQuantity = result?.RemainingQuantity ?? null;
      },
      error: error => {
        this.toastr.error(this.errorMessage(error, 'Unable to load item quantities and metrics.'));
      },
    });
  }

  savedLine(itemId: number, productTypeId: number): IViewRequisitionLine | undefined {
    return this.linesByProduct().get(`${Number(productTypeId)}:${Number(itemId)}`);
  }

  addSingle(): void {
    if (!this.canAddSingle || !this.selectedItem || this.quantity === null) return;

    this.submitLines([{
      ProductTypeId: this.productTypeId, ItemId: Number(this.selectedItem.Id),
      SizeID: this.selectedItem.SizeId ?? null,
      Size: this.selectedItem.Size ?? null,
      Priority: this.priority ?? 0,
      UOMId: this.uomId, Quantity: this.quantity, StockQuantity: this.stock,
      SalesQuantity: this.sales, Remarks: this.remarks.trim() || null,
    }], () => {
      this.itemSearch = this.selectedItem ?? '';
      this.quantity = null;
      this.priority = 0;
      this.remarks = '';
      this.uomId = this.defaultUomId;
    });
  }

  openBulk(): void {
    if (!this.canAdd || this.header.UnitId !== 6 || this.bulkRef) return;

    const ref = this.modalService.open(this.bulkModal, {
      fullscreen: true, backdrop: 'static', keyboard: false, 
      windowClass: 'requisition-bulk-modal',
    });
    this.bulkRef = ref;
    ref.hidden.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.bulkRef === ref) this.cleanupBulk();
    });
    if (this.bulkNeedsReload) {
      this.bulkNeedsReload = false;
      this.bulkViewed.set(false);
    }

    const { UnitId, BusinessId } = this.header;
    this.loadingBulkOptions.set(true);
    this.bulkOptionsSubscription = forkJoin({
      sizes: this.requisitionService.GetACRLtilesSize(UnitId, BusinessId),
      grades: this.requisitionService.GetItemDimentionGrade(UnitId, BusinessId),
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loadingBulkOptions.set(false)),
    ).subscribe({
      next: ({ sizes, grades }) => {
        this.bulkSizes.set(sizes);
        this.bulkGrades.set(grades);
      },
      error: error => this.toastr.error(this.errorMessage(error, 'Unable to load bulk filters.')),
    });

    if (!this.bulkViewed()) this.onBulkFilterChange();
  }

  closeBulk(): void {
    if (this.saving()) return;
    this.bulkRef?.close();
  }

  private cleanupBulk(): void {
    if (this.bulkSearchPending) {
      this.bulkNeedsReload = true;
      this.loadingBulk.set(false);
    }
    this.bulkRef = undefined;
    this.bulkSearchPending = false;
  }

  onBulkTypeChange(productTypeId: number, productTypeModel: NgModel): void {
    const nextType = Number(productTypeId);
    if (nextType === this.bulkProductTypeId) return;

    if (this.bulkSelection.length > 0 &&
        !window.confirm('Your saved draft will be lost upon changing Product Type. Continue?')) {
      productTypeModel.control.setValue(this.bulkProductTypeId, { emitViewToModelChange: false });
      return;
    }

    this.bulkProductTypeId = nextType;
    this.bulkDrafts.clear();
    this.bulkRows.set([]);
    this.bulkTotal.set(0);
    this.onBulkFilterChange();
  }

  onBulkFilterChange(): void {
    if (!this.bulkRef || !this.canAdd || this.bulkProductTypeId <= 0) return;
    this.appliedBulkFilters = {
      ProductTypeId: this.bulkProductTypeId,
      SizeId: this.bulkSizeId,
      SubCategoryId: this.bulkSubCategoryId,
      GradeId: this.bulkGradeId,
    };
    this.bulkPage.set(1);
    this.bulkViewed.set(true);
    this.queueBulkPage();
  }

  private queueBulkPage(): void {
    if (!this.bulkRef || !this.bulkViewed() || this.bulkProductTypeId <= 0) return;
    ++this.bulkRequestId;
    this.bulkSearchPending = true;
    this.bulkError.set('');
    this.loadingBulk.set(true);
    this.bulkTable?.nativeElement.scrollTo(0, 0);
    this.bulkSearchChanges.next();
  }

  onBulkSizeChange(sizeId: number): void {
    this.bulkSizeId = sizeId;
    this.subCategorySubscription?.unsubscribe();
    this.bulkSubCategoryId = 0;
    this.bulkSubCategories.set([]);
    this.loadingSubCategories.set(sizeId > 0);
    this.onBulkFilterChange();
    if (sizeId <= 0) return;
    this.subCategorySubscription = this.requisitionService
      .GetACRLtilesSubCategory(this.header.UnitId, this.header.BusinessId, this.bulkSizeId)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loadingSubCategories.set(false)))
      .subscribe({
        next: rows => this.bulkSubCategories.set(rows),
        error: error => this.toastr.error(this.errorMessage(error, 'Unable to load subcategories.')),
      });
  }


  onBulkSearch(value: string): void {
    const previous = this.bulkSearch.trim();
    const next = value.trim();
    this.bulkSearch = value;

    if ((previous.length >= 2 ? previous : '') === (next.length >= 2 ? next : '')) return;

    this.bulkPage.set(1);
    this.queueBulkPage();
  }

  onBulkPageChange(page: number): void {
    this.bulkPage.set(Number(page));
    this.queueBulkPage();
  }

  onBulkPageSizeChange(pageSize: number): void {
    this.bulkPageSize.set(Number(pageSize));
    this.bulkPage.set(1);
    this.queueBulkPage();
  }

  retryBulkLoad(): void {
    this.queueBulkPage();
  }

  private loadBulkPage(): void {
    if (!this.bulkRef || !this.bulkViewed() || !this.appliedBulkFilters.ProductTypeId) return;

    const requestId = ++this.bulkRequestId;
    this.bulkSearchPending = false;
    this.bulkSubscription?.unsubscribe();
    this.bulkError.set('');
    this.loadingBulk.set(true);
    this.bulkTable?.nativeElement.scrollTo(0, 0);

    const { UnitId, BusinessId, ReqID } = this.header;
    const search = this.bulkSearch.trim();
    this.bulkSubscription = this.requisitionService.GetBulkItems({
      UnitID: UnitId, BusinessID: BusinessId, FromDate: this.fromDate, ToDate: this.toDate,
      ProductTypeId: this.appliedBulkFilters.ProductTypeId, ExcludeReqId: ReqID,
      SizeID: this.appliedBulkFilters.SizeId, SubCategoryID: this.appliedBulkFilters.SubCategoryId, GradeID: this.appliedBulkFilters.GradeId,
    }, {
      page: this.bulkPage(), pageSize: this.bulkPageSize(), globalSearch: search.length >= 2 ? search : '',
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        if (requestId === this.bulkRequestId) this.loadingBulk.set(false);
      }),
    ).subscribe({
      next: response => {
        if (requestId !== this.bulkRequestId) return;
        const rows = response.Data.map(item => ({
          itemId: Number(item.ItemID), name: item.ItemName, stock: item.StockQuantity,
          sizeId: item.SizeId ?? null, size: item.Size ?? null,
          sales: item.SalesQuantity, count: item.Count,
          countedRequisitions: item.CountedRequisitions ?? {},
          totalRequestedQuantity: item.TotalRequestedQuantity,
          totalRemainingQuantity: item.TotalRemainingQuantity,
        }));
        for (const row of rows) {
          const draft = this.bulkDrafts.get(row.itemId);
          if (draft) draft.row = row;
        }
        this.bulkRows.set(rows);
        this.bulkTotal.set(response.Total);
      },
      error: error => {
        if (requestId !== this.bulkRequestId) return;
        this.bulkRows.set([]);
        this.bulkTotal.set(0);
        this.bulkError.set(this.errorMessage(error, 'Unable to load bulk items.'));
      },
    });
  }

  setBulkQuantity(row: BulkRow, input: HTMLInputElement): void {
    const cleaned = input.value.replace(/[^\d.]/g, '');
    const dot = cleaned.indexOf('.');
    const quantityText = dot < 0 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
    input.value = quantityText;
    const quantity = quantityText === '' || quantityText === '.' ? null : Number(quantityText);
    this.updateBulkDraft(row, { quantity, quantityText });
  }

  updateBulkDraft(row: BulkRow, patch: Partial<Pick<BulkDraft, 'quantity' | 'quantityText' | 'priority' | 'uomId' | 'remarks'>>): void {
    if (this.savedLine(row.itemId, this.appliedBulkFilters.ProductTypeId)) return;

    const draft = this.bulkDrafts.get(row.itemId) ?? {
      row, quantity: null, priority: 0, uomId: this.defaultUomId, remarks: '',
    };
    this.bulkDrafts.set(row.itemId, { ...draft, ...patch });
  }

  addBulk(): void {
    if (!this.canAddBulk) return;

    const lines = this.bulkSelection.map(draft => ({
      ProductTypeId: this.appliedBulkFilters.ProductTypeId, ItemId: draft.row.itemId,
      SizeID: draft.row.sizeId ?? null,
      Size: draft.row.size ?? null,
      Priority: draft.priority ?? 0,
      UOMId: draft.uomId, Quantity: draft.quantity!,
      StockQuantity: draft.row.stock, SalesQuantity: draft.row.sales,
      Remarks: draft.remarks.trim() || null,
    }));
    this.submitLines(lines, () => {
      this.bulkDrafts.clear();
      this.bulkRows.set([]);
      this.bulkTotal.set(0);
      this.bulkNeedsReload = true;
      this.bulkRef?.close();
    });
  }

  private submitLines(lines: IAddRequisitionLineInput[], onSaved: () => void): void {
    const enroll = this.getEnroll();
    if (enroll === null) return;

    const body = { ReqID: this.header.ReqID, Enroll: enroll, Lines: lines };
    const finish = (): void => {
      onSaved();
      this.reloadLines();
    };

    if (this.isRequestMode) {
      this.openConfirmation(
        'Request New',
        lines.length === 1 ? `Submit an add request for quantity ${lines[0].Quantity}?` : `Submit add requests for ${lines.length} lines?`,
        message => this.write(this.requisitionService.addLineRequest({ ...body, RequesterMessage: message }), finish),
      );
    } else {
      this.write(this.requisitionService.addLines(body), finish);
    }
  }

  private openConfirmation(title: string, text: string, submit: (message: string | null) => void): void {
    if (this.confirmationRef) return;
    this.confirmation = { title, text, message: '', submit };
    const ref = this.modalService.open(this.requestModal, { backdrop: 'static' });
    this.confirmationRef = ref;
    const clear = (): void => {
      this.confirmationRef = undefined;
      this.confirmation = null;
    };
    ref.result.then(clear, clear);
  }

  confirmRequest(): void {
    const confirmation = this.confirmation;
    if (!confirmation || !this.canWrite) return;

    const message = confirmation.message.trim() || null;
    this.confirmationRef?.close();
    confirmation.submit(message);
  }

  cancelConfirmation(): void {
    this.confirmationRef?.dismiss();
  }

  private write(request: Observable<IApiResponse>, onSaved: () => void): void {
    if (this.saving()) return;

    this.saving.set(true);
    request.pipe( takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false)),
    ).subscribe({
      next: result => {
        if (!result.Status) {
          this.toastr.error(result.Message || 'The requisition could not be saved.');
          return;
        }
        this.changed = true;
        this.toastr.success(result.Message || 'Saved.');
        onSaved();
      },
      error: error => this.toastr.error(this.errorMessage(error, 'The requisition could not be saved.')),
    });
  }

  private getEnroll(): number | null {
    const enroll = Number(localStorage.getItem('Enroll'));
    if (Number.isInteger(enroll) && enroll > 0) return enroll;
    this.toastr.error('Your employee number is unavailable. Please sign in again.');
    return null;
  }

  private validUom(id: number): boolean {
    const uoms = this.plannerUoMs();
    return uoms.length === 0 ? id === 0 : uoms.some(uom => uom.UoMId === id);
  }

  private validQuantity(value: number | null, positive: boolean): boolean {
    return value !== null && Number.isFinite(value) &&
      (!positive || value > 0) &&
      Math.abs(value) <= 99999999999999.9999 &&
      /^-?\d+(\.\d{1,4})?$/.test(String(value));
  }

  private dateInput(value: Date | string | null): string {
    if (!value) return '';
    if (typeof value === 'string') return value.substring(0, 10);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  private errorMessage(error: { error?: { detail?: string; Detail?: string; Message?: string; message?: string } }, fallback: string): string {
    return error.error?.detail ?? error.error?.Detail ?? error.error?.Message ?? error.error?.message ?? fallback;
  }
}