import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  Input,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  NgbActiveModal,
  NgbTypeaheadModule,
  NgbTypeaheadSelectItemEvent,
} from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  Observable,
  of,
  switchMap,
  tap,
} from 'rxjs';

import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';
import { IItem } from 'src/app/core/model/Common/Items/Item';
import { IProductType } from 'src/app/core/model/Common/ProductType/ProductType';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IUOM } from 'src/app/core/model/Common/UOM/UOM';
import { IRequisition } from 'src/app/core/model/Requisition/Requisition';
import {
  IViewRequisitionHeader,
  IViewRequisitionLine,
} from 'src/app/core/model/Requisition/ViewRequisition';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { RequisitionService } from 'src/app/core/services/Requisition/requisition.service';

export type RequisitionFormMode = 'create' | 'edit';

type FormModalState =
  | 'initializing'
  | 'ready'
  | 'submitting'
  | 'failed';

@Component({
  selector: 'app-requisition-form-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbTypeaheadModule,
  ],
  templateUrl: './requisition-form-modal.component.html',
  styleUrl: './requisition-form-modal.component.scss',
})
export class RequisitionFormModalComponent implements OnInit {
  @Input({ required: true })
  mode: RequisitionFormMode = 'create';

  @Input()
  header: IViewRequisitionHeader | null = null;

  readonly state = signal<FormModalState>('initializing');

  readonly units = signal<IUnit[]>([]);
  readonly businesses = signal<IBusiness[]>([]);
  readonly productTypes = signal<IProductType[]>([]);
  readonly uoms = signal<IUOM[]>([]);
  readonly documentStatuses = signal<IDropdownBind[]>([]);

  readonly unitDataLoading = signal(false);

  readonly isItemSearching = signal(false);
  readonly itemSearchCompleted = signal(false);
  readonly itemSearchHasResults = signal(true);
  readonly itemSearchFailed = signal(false);

  submitted = false;
  lineSubmitted = false;
  deletedLineIds: number[] = [];

  readonly formGroup = new FormGroup({
    UnitId: new FormControl('', Validators.required),

    BusinessId: new FormControl(
      '',
      Validators.required,
    ),

    ReqDate: new FormControl(
      {
        value:
          new Date()
            .toISOString()
            .split('T')[0],
        disabled: true,
      },
      Validators.required,
    ),

    StartDate: new FormControl(
      '',
      Validators.required,
    ),

    EndDate: new FormControl(
      '',
      Validators.required,
    ),

    Remarks: new FormControl(''),

    Lines: new FormArray([]),
  });

  readonly lineFormGroup = new FormGroup({
    ProductTypeId: new FormControl(
      2,
      Validators.required,
    ),

    ItemSearch: new FormControl(
      '',
      Validators.required,
    ),

    ItemId: new FormControl(
      '',
      Validators.required,
    ),

    ItemName: new FormControl(''),

    UOMId: new FormControl(
      '',
      Validators.required,
    ),

    Quantity: new FormControl('', [
      Validators.required,
      Validators.min(1),
    ]),

    StockQuantity: new FormControl(0),
    SalesQuantity: new FormControl(0),
    Remarks: new FormControl(''),
  });

  private readonly destroyRef =
    inject(DestroyRef);

  constructor(
    public readonly activeModal: NgbActiveModal,
    private readonly commonService: CommonService,
    private readonly requisitionService: RequisitionService,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    if (
      this.mode === 'edit' &&
      !this.header
    ) {
      this.failInitialization(
        'Requisition header information was not provided.',
      );

      return;
    }

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

  get f(): {
    [key: string]: AbstractControl;
  } {
    return this.formGroup.controls;
  }

  get lf(): {
    [key: string]: AbstractControl;
  } {
    return this.lineFormGroup.controls;
  }

  get lines(): FormArray {
    return this.formGroup.get(
      'Lines',
    ) as FormArray;
  }

  get selectedUnitId(): number {
    return Number(
      this.formGroup.get('UnitId')?.value,
    );
  }

  get selectedLineProductTypeId(): number {
    return Number(
      this.lineFormGroup.get(
        'ProductTypeId',
      )?.value,
    );
  }

  get canAddLine(): boolean {
    return (
      this.state() === 'ready' &&
      !this.unitDataLoading() &&
      this.selectedUnitId > 0 &&
      Number(
        this.formGroup.get(
          'BusinessId',
        )?.value,
      ) > 0
    );
  }

  close(): void {
    if (this.isSubmitting) {
      return;
    }

    this.activeModal.close({
      changed: false,
    });
  }

  dismiss(): void {
    if (this.isSubmitting) {
      return;
    }

    this.activeModal.dismiss(
      'dismissed',
    );
  }

  submit(): void {
    if (this.isSubmitting) {
      return;
    }

    if (this.isEditMode) {
      this.update();
      return;
    }

    this.create();
  }

  onUnitChange(): void {
    const unitId = this.selectedUnitId;

    this.formGroup
      .get('BusinessId')
      ?.reset('');

    this.businesses.set([]);
    this.uoms.set([]);

    this.lines.clear();
    this.resetLineInput();
    this.resetItemSearchState();

    if (unitId <= 0) {
      this.unitDataLoading.set(false);
      return;
    }

    this.loadUnitDependentData(
      unitId,
    );
  }

  onBusinessChange(): void {
    this.lines.clear();
    this.resetLineInput();
    this.resetItemSearchState();
  }

  addLine(): void {
    this.lineSubmitted = true;
    this.lineFormGroup.markAllAsTouched();

    if (
      !this.canAddLine ||
      this.lineFormGroup.invalid
    ) {
      return;
    }

    const lineValue =
      this.lineFormGroup.getRawValue();

    const productTypeId = Number(
      lineValue.ProductTypeId,
    );

    const selectedUOM =
      this.uoms().find(
        (uom) =>
          Number(uom.Id) ===
          Number(lineValue.UOMId),
      );

    const line = new FormGroup({
      ID: new FormControl(0),

      ReqID: new FormControl(
        this.header?.ReqID ?? 0,
      ),

      ProductTypeId:
        new FormControl(
          productTypeId,
        ),

      ItemId: new FormControl(
        productTypeId === 1
          ? 0
          : Number(lineValue.ItemId),
      ),

      ItemName: new FormControl(
        productTypeId === 1
          ? (
              lineValue.ItemName?.trim() ??
              ''
            )
          : (
              lineValue.ItemName ??
              ''
            ),
      ),

      UOMId: new FormControl(
        Number(lineValue.UOMId),
      ),

      UOMName: new FormControl(
        selectedUOM?.Name ?? '',
      ),

      Quantity: new FormControl(
        Number(lineValue.Quantity),
      ),

      StockQuantity: new FormControl(
        Number(
          lineValue.StockQuantity,
        ) || 0,
      ),

      SalesQuantity: new FormControl(
        Number(
          lineValue.SalesQuantity,
        ) || 0,
      ),

      Remarks: new FormControl(
        lineValue.Remarks ?? '',
      ),

      DocStatusId:
        new FormControl(1),

      IsActive:
        new FormControl(true),
    });

    this.lines.push(line);

    this.resetLineInput(
      productTypeId,
    );

    this.lineSubmitted = false;
  }

  removeLine(index: number): void {
    const lineId = Number(
      this.lines
        .at(index)
        .get('ID')?.value,
    );

    if (
      this.isEditMode &&
      lineId > 0 &&
      !this.deletedLineIds.includes(
        lineId,
      )
    ) {
      this.deletedLineIds.push(
        lineId,
      );
    }

    this.lines.removeAt(index);
  }

  onItemSelect(
    event: NgbTypeaheadSelectItemEvent,
  ): void {
    const startDate =
      this.formGroup.get(
        'StartDate',
      )?.value;

    const endDate =
      this.formGroup.get(
        'EndDate',
      )?.value;

    const businessId = Number(
      this.formGroup.get(
        'BusinessId',
      )?.value,
    );

    if (!startDate || !endDate) {
      event.preventDefault();

      this.toastr.warning(
        'Please select Start Date and End Date first.',
      );

      return;
    }

    if (
      !this.selectedUnitId ||
      !businessId
    ) {
      event.preventDefault();

      this.toastr.warning(
        'Please select Unit and Business first.',
      );

      return;
    }

    if (
      new Date(startDate) >
      new Date(endDate)
    ) {
      event.preventDefault();

      this.toastr.warning(
        'Start Date cannot be greater than End Date.',
      );

      return;
    }

    const item =
      event.item as IItem;

    this.lineFormGroup.patchValue(
      {
        // ItemId: item.Id,
        ItemId: String(item.Id),
        ItemName: item.Name,
        StockQuantity: 0,
        SalesQuantity: 0,
      },
      {
        emitEvent: false,
      },
    );

    this.loadStockQuantity(
      Number(item.Id),
      this.lineFormGroup,
    );

    this.loadSalesQuantity(
      Number(item.Id),
      this.lineFormGroup,
    );

    this.resetItemSearchState();
  }

  searchItems = (
    text$: Observable<string>,
  ): Observable<IItem[]> => {
    return text$.pipe(
      debounceTime(800),
      distinctUntilChanged(),

      switchMap((searchText) => {
        const text =
          searchText.trim();

        this.itemSearchCompleted.set(
          false,
        );

        this.itemSearchHasResults.set(
          true,
        );

        this.itemSearchFailed.set(
          false,
        );

        if (
          this.selectedLineProductTypeId !==
            2 ||
          !this.selectedUnitId ||
          text.length < 2
        ) {
          this.isItemSearching.set(
            false,
          );

          return of([]);
        }

        this.isItemSearching.set(true);

        return this.commonService
          .GetItemList(
            this.selectedUnitId,
            text,
          )
          .pipe(
            tap((items) => {
              this.itemSearchCompleted.set(
                true,
              );

              this.itemSearchHasResults.set(
                items.length > 0,
              );

              this.itemSearchFailed.set(
                false,
              );
            }),

            catchError(() => {
              this.itemSearchCompleted.set(
                true,
              );

              this.itemSearchHasResults.set(
                false,
              );

              this.itemSearchFailed.set(
                true,
              );

              return of([]);
            }),

            finalize(() => {
              this.isItemSearching.set(
                false,
              );
            }),
          );
      }),
    );
  };

  itemFormatter = (
    item: IItem | string,
  ): string => {
    if (typeof item === 'string') {
      return item;
    }

    return item?.Name ?? '';
  };

  scrollActiveItem(): void {
    setTimeout(() => {
      const dropdown =
        document.querySelector(
          '.requisition-item-dropdown',
        ) as HTMLElement | null;

      const activeItem =
        dropdown?.querySelector(
          '.dropdown-item.active',
        ) as HTMLElement | null;

      if (
        !dropdown ||
        !activeItem
      ) {
        return;
      }

      const itemTop =
        activeItem.offsetTop;

      const itemBottom =
        itemTop +
        activeItem.offsetHeight;

      const visibleTop =
        dropdown.scrollTop;

      const visibleBottom =
        visibleTop +
        dropdown.clientHeight;

      if (
        itemTop < visibleTop
      ) {
        dropdown.scrollTop =
          itemTop;
      } else if (
        itemBottom >
        visibleBottom
      ) {
        dropdown.scrollTop =
          itemBottom -
          dropdown.clientHeight;
      }
    });
  }

  getProductTypeName(
    productTypeId: number,
  ): string {
    return (
      this.productTypes().find(
        (productType) =>
          Number(
            productType.Id,
          ) ===
          Number(
            productTypeId,
          ),
      )?.Name ?? '-'
    );
  }

  getDocStatusName(
    docStatusId: number,
  ): string {
    return (
      this.documentStatuses().find(
        (status) =>
          Number(status.Id) ===
          Number(docStatusId),
      )?.Name ?? '-'
    );
  }

  private loadInitialData(): void {
    this.state.set(
      'initializing',
    );

    forkJoin({
      units:
        this.commonService
          .GetUnitList(),

      productTypes:
        this.commonService
          .GetProductTypeList(),

      documentStatuses:
        this.commonService
          .GetDocumentStatusList(),
    })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: ({
          units,
          productTypes,
          documentStatuses,
        }) => {
          this.units.set(units);

          this.productTypes.set(
            productTypes,
          );

          this.documentStatuses.set(
            documentStatuses,
          );

          if (
            this.isEditMode &&
            this.header
          ) {
            this.initializeEditMode(
              this.header,
            );

            return;
          }

          this.state.set('ready');
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.failInitialization(
            this.getErrorMessage(
              error,
              'Unable to initialize the requisition form.',
            ),
          );
        },
      });
  }

  private initializeEditMode(
    header: IViewRequisitionHeader,
  ): void {
    this.formGroup.patchValue({
      UnitId:
        String(header.UnitId),

      BusinessId:
        String(header.BusinessId),

      ReqDate:
        this.toDateInputValue(
          header.ReqDate,
        ),

      StartDate:
        this.toDateInputValue(
          header.StartDate,
        ),

      EndDate:
        this.toDateInputValue(
          header.EndDate,
        ),

      Remarks:
        header.Remarks ?? '',
    });

    this.formGroup
      .get('UnitId')
      ?.disable();

    this.formGroup
      .get('BusinessId')
      ?.disable();

    forkJoin({
      businesses:
        this.commonService
          .GetBusinessList(
            header.UnitId,
          ),

      uoms:
        this.commonService
          .GetUOMList(
            header.UnitId,
          ),

      lines:
        this.requisitionService
          .GetLinesByReqId(
            header.ReqID,
          ),
    })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: ({
          businesses,
          uoms,
          lines,
        }) => {
          this.businesses.set(
            businesses,
          );

          this.uoms.set(uoms);

          this.populateExistingLines(
            lines.filter(
              (line) =>
                line.IsActive,
            ),
          );

          this.state.set('ready');
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.failInitialization(
            this.getErrorMessage(
              error,
              'Unable to load the requisition for editing.',
            ),
          );
        },
      });
  }

  private loadUnitDependentData(
    unitId: number,
  ): void {
    this.unitDataLoading.set(
      true,
    );

    forkJoin({
      businesses:
        this.commonService
          .GetBusinessList(unitId),

      uoms:
        this.commonService
          .GetUOMList(unitId),
    })
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: ({
          businesses,
          uoms,
        }) => {
          if (
            this.selectedUnitId !==
            unitId
          ) {
            return;
          }

          this.businesses.set(
            businesses,
          );

          this.uoms.set(uoms);

          console.log(
            `Loaded ${businesses.length} businesses and ${uoms.length} UOMs for Unit ID ${unitId}.`,
          );

          this.unitDataLoading.set(
            false,
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          if (
            this.selectedUnitId !==
            unitId
          ) {
            return;
          }

          this.businesses.set([]);
          this.uoms.set([]);

          this.unitDataLoading.set(
            false,
          );

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
    this.lineFormGroup
      .get('ItemSearch')
      ?.valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe((value) => {
        if (
          this.selectedLineProductTypeId ===
            2 &&
          typeof value === 'string'
        ) {
          this.lineFormGroup.patchValue(
            {
              ItemId: '',
              ItemName: '',
              StockQuantity: 0,
              SalesQuantity: 0,
            },
            {
              emitEvent: false,
            },
          );
        }
      });
  }

  private watchProductType(): void {
    this.lineFormGroup
      .get('ProductTypeId')
      ?.valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe((value) => {
        const productTypeId =
          Number(value);

        const itemSearchControl =
          this.lineFormGroup.get(
            'ItemSearch',
          );

        const itemIdControl =
          this.lineFormGroup.get(
            'ItemId',
          );

        const itemNameControl =
          this.lineFormGroup.get(
            'ItemName',
          );

        this.lineFormGroup.patchValue(
          {
            ItemSearch: '',
            ItemId: '',
            ItemName: '',
            StockQuantity: 0,
            SalesQuantity: 0,
          },
          {
            emitEvent: false,
          },
        );

        if (productTypeId === 1) {
          itemSearchControl
            ?.clearValidators();

          itemIdControl
            ?.clearValidators();

          itemNameControl
            ?.setValidators([
              Validators.required,
              Validators.maxLength(
                200,
              ),
            ]);
        } else if (
          productTypeId === 2
        ) {
          itemSearchControl
            ?.setValidators(
              Validators.required,
            );

          itemIdControl
            ?.setValidators(
              Validators.required,
            );

          itemNameControl
            ?.clearValidators();
        } else {
          itemSearchControl
            ?.clearValidators();

          itemIdControl
            ?.clearValidators();

          itemNameControl
            ?.clearValidators();
        }

        itemSearchControl
          ?.updateValueAndValidity({
            emitEvent: false,
          });

        itemIdControl
          ?.updateValueAndValidity({
            emitEvent: false,
          });

        itemNameControl
          ?.updateValueAndValidity({
            emitEvent: false,
          });

        this.resetItemSearchState();
      });
  }

  private watchDateRange(): void {
    this.formGroup
      .get('StartDate')
      ?.valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(() => {
        this.refreshQuantities();
      });

    this.formGroup
      .get('EndDate')
      ?.valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe(() => {
        this.refreshQuantities();
      });
  }

  private refreshQuantities(): void {
    const startDate =
      this.formGroup.get(
        'StartDate',
      )?.value;

    const endDate =
      this.formGroup.get(
        'EndDate',
      )?.value;

    const businessId = Number(
      this.formGroup.get(
        'BusinessId',
      )?.value,
    );

    this.lineFormGroup.patchValue(
      {
        StockQuantity: 0,
        SalesQuantity: 0,
      },
      {
        emitEvent: false,
      },
    );

    this.lines.controls.forEach(
      (line) => {
        line.patchValue(
          {
            StockQuantity: 0,
            SalesQuantity: 0,
          },
          {
            emitEvent: false,
          },
        );
      },
    );

    if (
      !this.selectedUnitId ||
      !businessId ||
      !startDate ||
      !endDate ||
      new Date(startDate) >
        new Date(endDate)
    ) {
      return;
    }

    const selectedItemId =
      Number(
        this.lineFormGroup.get(
          'ItemId',
        )?.value,
      );

    if (
      this.selectedLineProductTypeId ===
        2 &&
      selectedItemId > 0
    ) {
      this.loadStockQuantity(
        selectedItemId,
        this.lineFormGroup,
      );

      this.loadSalesQuantity(
        selectedItemId,
        this.lineFormGroup,
      );
    }

    this.lines.controls.forEach(
      (line) => {
        const productTypeId =
          Number(
            line.get(
              'ProductTypeId',
            )?.value,
          );

        const itemId = Number(
          line.get('ItemId')?.value,
        );

        if (
          productTypeId === 2 &&
          itemId > 0
        ) {
          this.loadStockQuantity(
            itemId,
            line,
          );

          this.loadSalesQuantity(
            itemId,
            line,
          );
        }
      },
    );
  }

  private loadStockQuantity(
    productId: number,
    target: AbstractControl,
  ): void {
    const startDate =
      this.formGroup.get(
        'StartDate',
      )?.value;

    const endDate =
      this.formGroup.get(
        'EndDate',
      )?.value;

    const businessId = Number(
      this.formGroup.get(
        'BusinessId',
      )?.value,
    );

    this.commonService
      .GetStockQty(
        startDate,
        endDate,
        this.selectedUnitId,
        businessId,
        null,
        productId,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (quantity) => {
          target.patchValue(
            {
              StockQuantity:
                Number(quantity),
            },
            {
              emitEvent: false,
            },
          );
        },

        error: () => {
          target.patchValue(
            {
              StockQuantity: 0,
            },
            {
              emitEvent: false,
            },
          );

          this.toastr.error(
            'Unable to load Stock Quantity.',
          );
        },
      });
  }

  private loadSalesQuantity(
    productId: number,
    target: AbstractControl,
  ): void {
    const startDate =
      this.formGroup.get(
        'StartDate',
      )?.value;

    const endDate =
      this.formGroup.get(
        'EndDate',
      )?.value;

    this.commonService
      .GetSalesQty(
        startDate,
        endDate,
        this.selectedUnitId,
        productId,
        null,
        null,
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (quantity) => {
          target.patchValue(
            {
              SalesQuantity:
                Number(quantity),
            },
            {
              emitEvent: false,
            },
          );
        },

        error: () => {
          target.patchValue(
            {
              SalesQuantity: 0,
            },
            {
              emitEvent: false,
            },
          );

          this.toastr.error(
            'Unable to load Sales Quantity.',
          );
        },
      });
  }

  private populateExistingLines(
    existingLines:
      IViewRequisitionLine[],
  ): void {
    this.lines.clear();

    existingLines.forEach(
      (line) => {
        this.lines.push(
          new FormGroup({
            ID: new FormControl(
              Number(line.ID),
            ),

            ReqID: new FormControl(
              Number(line.ReqID),
            ),

            ProductTypeId:
              new FormControl(
                Number(
                  line.ProductTypeId,
                ),
              ),

            ItemId: new FormControl(
              Number(line.ItemId),
            ),

            ItemName:
              new FormControl(
                line.ItemName ?? '',
              ),

            UOMId: new FormControl(
              Number(line.UOMId),
            ),

            UOMName:
              new FormControl(
                line.UOMName ?? '',
              ),

            Quantity:
              new FormControl(
                Number(
                  line.Quantity,
                ),
              ),

            StockQuantity:
              new FormControl(
                Number(
                  line.StockQuantity,
                ) || 0,
              ),

            SalesQuantity:
              new FormControl(
                Number(
                  line.SalesQuantity,
                ) || 0,
              ),

            Remarks:
              new FormControl(
                line.Remarks ?? '',
              ),

            DocStatusId:
              new FormControl(
                Number(
                  line.DocStatusId,
                ),
              ),

            IsActive:
              new FormControl(true),
          }),
        );
      },
    );
  }

  private resetLineInput(
    productTypeId: number = 2,
  ): void {
    this.lineFormGroup.reset({
      ProductTypeId:
        productTypeId,

      ItemSearch: '',
      ItemId: '',
      ItemName: '',
      UOMId: '',
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
      this.lines.length === 0
    ) {
      return;
    }

    this.state.set('submitting');

    const formValue =
      this.formGroup.getRawValue();

    const enroll = Number(
      localStorage.getItem('Enroll'),
    );

    const currentDate =
      new Date();

    const requisitionData:
      IRequisition = {
      Header: {
        ReqID: 0,
        RequisitionNumber: '',

        UnitId: Number(
          formValue.UnitId,
        ),

        BusinessId: Number(
          formValue.BusinessId,
        ),

        ReqDate: new Date(
          formValue.ReqDate!,
        ),

        StartDate: new Date(
          formValue.StartDate!,
        ),

        EndDate: new Date(
          formValue.EndDate!,
        ),

        Remarks:
          formValue.Remarks
            ?.trim() ?? '',

        DocStatusId: 1,
        IsActive: true,

        CREATEDBY: enroll,
        UPDATEDBY: enroll,

        CREATEDDATE:
          currentDate,

        UPDATEDDATE:
          currentDate,
      },

      Lines:
        this.lines
          .getRawValue()
          .map((line: any) => ({
            ID: 0,
            ReqID: 0,

            ProductTypeId:
              Number(
                line.ProductTypeId,
              ),

            ItemId:
              Number(
                line.ProductTypeId,
              ) === 1
                ? 0
                : Number(
                    line.ItemId,
                  ),

            ItemName:
              Number(
                line.ProductTypeId,
              ) === 1
                ? (
                    line.ItemName
                      ?.trim() ?? ''
                  )
                : null,

            UOMId:
              Number(line.UOMId),

            Quantity:
              Number(
                line.Quantity,
              ),

            StockQuantity:
              Number(
                line.StockQuantity,
              ) || 0,

            SalesQuantity:
              Number(
                line.SalesQuantity,
              ) || 0,

            Remarks:
              line.Remarks
                ?.trim() ?? '',

            DocStatusId: 1,
            IsActive: true,
          })),

      DeletedLineIds: [],
    };

    this.requisitionService
      .addData(requisitionData)
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          if (response.Status) {
            this.toastr.success(
              response.Message,
            );

            this.activeModal.close({
              changed: true,
            });

            return;
          }

          this.finishSubmissionFailure(
            response.Message ||
              'Unable to save the requisition.',
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
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
      this.lines.length === 0 ||
      !this.header
    ) {
      return;
    }

    this.state.set('submitting');

    const formValue =
      this.formGroup.getRawValue();

    const enroll = Number(
      localStorage.getItem('Enroll'),
    );

    const currentDate =
      new Date();

    const requisitionData:
      IRequisition = {
      Header: {
        ReqID:
          this.header.ReqID,

        RequisitionNumber:
          this.header
            .RequisitionNumber,

        UnitId: Number(
          formValue.UnitId,
        ),

        BusinessId: Number(
          formValue.BusinessId,
        ),

        ReqDate: new Date(
          formValue.ReqDate!,
        ),

        StartDate: new Date(
          formValue.StartDate!,
        ),

        EndDate: new Date(
          formValue.EndDate!,
        ),

        Remarks:
          formValue.Remarks
            ?.trim() ?? '',

        DocStatusId:
          Number(
            this.header
              .DocStatusId,
          ),

        IsActive:
          this.header.IsActive,

        CREATEDBY:
          Number(
            this.header
              .CREATEDBY,
          ),

        UPDATEDBY: enroll,

        CREATEDDATE:
          new Date(
            this.header
              .CREATEDDATE!,
          ),

        UPDATEDDATE:
          currentDate,
      },

      Lines:
        this.lines
          .getRawValue()
          .filter(
            (line: any) =>
              Number(line.ID) === 0,
          )
          .map((line: any) => ({
            ID: 0,

            ReqID:
              this.header!.ReqID,

            ProductTypeId:
              Number(
                line.ProductTypeId,
              ),

            ItemId:
              Number(
                line.ProductTypeId,
              ) === 1
                ? 0
                : Number(
                    line.ItemId,
                  ),

            ItemName:
              Number(
                line.ProductTypeId,
              ) === 1
                ? (
                    line.ItemName
                      ?.trim() ?? ''
                  )
                : null,

            UOMId:
              Number(line.UOMId),

            Quantity:
              Number(
                line.Quantity,
              ),

            StockQuantity:
              Number(
                line.StockQuantity,
              ) || 0,

            SalesQuantity:
              Number(
                line.SalesQuantity,
              ) || 0,

            Remarks:
              line.Remarks
                ?.trim() ?? '',

            DocStatusId: 1,
            IsActive: true,
          })),

      DeletedLineIds:
        this.deletedLineIds,
    };

    this.requisitionService
      .updateData(requisitionData)
      .pipe(
        takeUntilDestroyed(
          this.destroyRef,
        ),
      )
      .subscribe({
        next: (response) => {
          if (response.Status) {
            this.toastr.success(
              response.Message,
            );

            this.activeModal.close({
              changed: true,
            });

            return;
          }

          this.finishSubmissionFailure(
            response.Message ||
              'Unable to update the requisition.',
          );
        },

        error: (
          error: HttpErrorResponse,
        ) => {
          this.finishSubmissionFailure(
            this.getErrorMessage(
              error,
              'Something went wrong while updating the requisition.',
            ),
          );
        },
      });
  }

  private finishSubmissionFailure(
    message: string,
  ): void {
    this.state.set('failed');
    this.toastr.error(message);

    this.activeModal.dismiss(
      'submission-failed',
    );
  }

  private failInitialization(
    message: string,
  ): void {
    this.state.set('failed');
    this.toastr.error(message);

    this.activeModal.dismiss(
      'initialization-failed',
    );
  }

  private getErrorMessage(
    error: HttpErrorResponse,
    fallback: string,
  ): string {
    const detail =
      error.error?.detail ??
      error.error?.Detail;

    if (
      typeof detail === 'string' &&
      detail.trim()
    ) {
      return detail;
    }

    const message =
      error.error?.message ??
      error.error?.Message;

    if (
      typeof message === 'string' &&
      message.trim()
    ) {
      return message;
    }

    return fallback;
  }

  private toDateInputValue(
    value:
      | Date
      | string
      | null
      | undefined,
  ): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      const year =
        value.getFullYear();

      const month = String(
        value.getMonth() + 1,
      ).padStart(2, '0');

      const day = String(
        value.getDate(),
      ).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    return value.substring(0, 10);
  }
}