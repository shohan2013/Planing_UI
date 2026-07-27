import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import {
  NgbModal,
  NgbTypeaheadModule,
  NgbTypeaheadSelectItemEvent
} from '@ng-bootstrap/ng-bootstrap';
import {
  catchError,
  debounceTime,
  
  distinctUntilChanged,
  finalize,
  map,
  Observable,
  of,
  Subject,
  switchMap,
  takeUntil,
  tap
} from 'rxjs';

import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IProductType } from 'src/app/core/model/Common/ProductType/ProductType';
import { IItem } from 'src/app/core/model/Common/Items/Item';
import { IRequisitionItemName } from 'src/app/core/model/Common/RequisitionItemName/RequisitionItemName';
import { IUOM } from 'src/app/core/model/Common/UOM/UOM';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { IDropdownBind } from 'src/app/core/model/Common/dropdown-bind';

import { RequisitionService } from 'src/app/core/services/Requisition/requisition.service';
import { IRequisition } from 'src/app/core/model/Requisition/Requisition';

import { ServerQueryRequest, ServerQueryResponse } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';

import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-requisition',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbTypeaheadModule,
    PaginationComponent
  ],
  templateUrl: './requisition.html',
  styleUrl: './requisition.scss'
})
export class Requisition extends ServerSideFilteredPaginatedComponent<IRequisition> implements OnDestroy {

  submitted = false;
  lineSubmitted = false;
  selectedRequisition: IRequisition | null = null;
  isViewLoading = false;

  isEditMode = false;
  editingReqID = 0;
  deletedLineIds: number[] = [];
  

  units: IUnit[] = [];
  businesses: IBusiness[] = [];
  filteredBusinesses: IBusiness[] = [];
  productTypes: IProductType[] = [];
  uoms: IUOM[] = [];
  fileStatusList: IDropdownBind[] = [];

  isItemSearching = false;
  itemSearchCompleted = false;
  itemSearchHasResults = true;
  itemSearchFailed = false;

  private destroy$ = new Subject<void>();

  formGroup: FormGroup = new FormGroup({
    UnitId: new FormControl('',Validators.required),
    BusinessId: new FormControl('',Validators.required),
    ReqDate: new FormControl(new Date().toISOString().split('T')[0],Validators.required),

    StartDate: new FormControl('',Validators.required),
    EndDate: new FormControl('',Validators.required),

    Remarks: new FormControl(''),
    Lines: new FormArray([])
  });

  lineFormGroup: FormGroup = new FormGroup({
    ProductTypeId: new FormControl(2,Validators.required),
    ItemSearch: new FormControl('',Validators.required),
    ItemId: new FormControl('',Validators.required),
    ItemName: new FormControl(''),
    UOMId: new FormControl('',Validators.required),
    Quantity: new FormControl('',[
      Validators.required,
      Validators.min(1)
    ]),
    StockQuantity: new FormControl(0),
    SalesQuantity: new FormControl(0),
    Remarks: new FormControl('')
  });

  constructor(
    private commonService: CommonService,
    private modalService: NgbModal,
    private requisitionService: RequisitionService,
    private toastr: ToastrService
  ) {
    super();
    this.loadCommonData();
    this.watchItemInput();
    this.watchProductType();
    this.watchDateRange();
  }


  // protected override fetchData(request: ServerQueryRequest): Observable<ServerQueryResponse<IRequisition>> {
  //   return this.requisitionService.GetRequisition(request);
  // }

  protected override fetchData(request: ServerQueryRequest): Observable<ServerQueryResponse<IRequisition>> {
  return this.requisitionService.GetRequisition(request).pipe(
    tap(response => console.log('Requisition table response:',response))
  );
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

  get canAddLine(): boolean {
    return this.selectedUnitId > 0;
  }

  get selectedLineProductTypeId(): number {
    return Number(this.lineFormGroup.get('ProductTypeId')?.value);
  }


  getUnitName(unitId: number): string {
    return this.units.find(x => Number(x.Id) === Number(unitId))?.Name ?? '-';
  }

  getBusinessName(businessId: number): string {
    return this.businesses.find(x => Number(x.Id) === Number(businessId))?.Name ?? '-';
  }

  getProductTypeName(productTypeId: number): string {
    return this.productTypes.find(x => Number(x.Id) === Number(productTypeId))?.Name ?? '-';
  }

  getUOMName(uomId: number): string {
    return this.uoms.find(x => Number(x.Id) === Number(uomId))?.Name ?? '-';
  }

  getFileStatusName(fileStatusId: number): string {
  return this.fileStatusList.find(
    x => Number(x.Id) === Number(fileStatusId)
    )?.Name ?? '-';
  }


  loadCommonData(): void {
    this.commonService.GetUnitList()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.units = data;
      });

    this.commonService.GetBusinessList()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.businesses = data;

        if (this.selectedUnitId) {
          this.filterBusinesses();
        }
      });

    this.commonService.GetProductTypeList()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.productTypes = data;
      });

    this.commonService.GetUOMList()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.uoms = data;
      });

    this.commonService.GetDocumentStatusList()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.fileStatusList = data;
      });


  }

  watchItemInput(): void {
    this.lineFormGroup.get('ItemSearch')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
        if (this.selectedLineProductTypeId === 2 && typeof value === 'string') {
          this.lineFormGroup.patchValue({
            ItemId: '',
            ItemName: '',  
            StockQuantity: 0,
            SalesQuantity: 0
          },{
            emitEvent: false
          });
        }
      });
  }

  watchProductType(): void {
    this.lineFormGroup.get('ProductTypeId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        const productTypeId = Number(value);
        const itemSearchControl = this.lineFormGroup.get('ItemSearch');
        const itemIdControl = this.lineFormGroup.get('ItemId');
        const itemNameControl = this.lineFormGroup.get('ItemName');

        this.lineFormGroup.patchValue({
          ItemSearch: '',
          ItemId: '',
          ItemName: '',
          StockQuantity: 0,
          SalesQuantity: 0
        },{
          emitEvent: false
        });

        if (productTypeId === 1) {
          itemSearchControl?.clearValidators();
          itemIdControl?.clearValidators();
          itemNameControl?.setValidators([
            Validators.required,
            Validators.maxLength(200)
          ]);
        }
        else if (productTypeId === 2) {
          itemSearchControl?.setValidators(Validators.required);
          itemIdControl?.setValidators(Validators.required);
          itemNameControl?.clearValidators();
        }
        else {
          itemSearchControl?.clearValidators();
          itemIdControl?.clearValidators();
          itemNameControl?.clearValidators();
        }

        itemSearchControl?.updateValueAndValidity({ emitEvent: false });
        itemIdControl?.updateValueAndValidity({ emitEvent: false });
        itemNameControl?.updateValueAndValidity({ emitEvent: false });

        this.isItemSearching = false;
        this.itemSearchCompleted = false;
        this.itemSearchHasResults = true;
        this.itemSearchFailed = false;
      });
  }


watchDateRange(): void {
  this.formGroup.get('StartDate')?.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.refreshStockQuantities();
    });

  this.formGroup.get('EndDate')?.valueChanges
    .pipe(takeUntil(this.destroy$))
    .subscribe(() => {
      this.refreshStockQuantities();
    });
}

refreshStockQuantities(): void {
  const startDate = this.formGroup.get('StartDate')?.value;
  const endDate = this.formGroup.get('EndDate')?.value;
  const businessId = Number(this.formGroup.get('BusinessId')?.value);

  this.lineFormGroup.patchValue({
    StockQuantity: 0,
    SalesQuantity: 0
  },{
    emitEvent: false
  });

  this.lines.controls.forEach(line => {
    line.patchValue({
      StockQuantity: 0,
      SalesQuantity: 0
    },{
      emitEvent: false
    });
  });

  if (
    !this.selectedUnitId ||
    !businessId ||
    !startDate ||
    !endDate ||
    new Date(startDate) > new Date(endDate)
  ) {
    return;
  }

  const selectedItemId = Number(this.lineFormGroup.get('ItemId')?.value);

  if (this.selectedLineProductTypeId === 2 && selectedItemId > 0) {
    this.loadStockQuantity(selectedItemId,this.lineFormGroup);
    this.loadSalesQuantity(selectedItemId,this.lineFormGroup);  
  }

  this.lines.controls.forEach(line => {
    const productTypeId = Number(line.get('ProductTypeId')?.value);
    const itemId = Number(line.get('ItemId')?.value);

    if (productTypeId === 2 && itemId > 0) {
      this.loadStockQuantity(itemId,line);
      this.loadSalesQuantity(itemId,line);
    }
  });
}

loadStockQuantity(productId:number,target:AbstractControl): void {
  const startDate = this.formGroup.get('StartDate')?.value;
  const endDate = this.formGroup.get('EndDate')?.value;
  const businessId = Number(this.formGroup.get('BusinessId')?.value);

  this.commonService.GetStockQty(
    startDate,
    endDate,
    this.selectedUnitId,
    businessId,
    null,
    productId
  )
  .pipe(takeUntil(this.destroy$))
  .subscribe({
    next: quantity => {
      target.patchValue({
        StockQuantity: Number(quantity)
       
      },{
        emitEvent: false
      });
    },
    error: () => {
      target.patchValue({
        StockQuantity: 0
      },{
        emitEvent: false
      });

      this.toastr.error('Unable to load Stock Quantity.');
    }
  });
}



loadSalesQuantity(productId:number,target:AbstractControl): void {
  const startDate = this.formGroup.get('StartDate')?.value;
  const endDate = this.formGroup.get('EndDate')?.value;

  this.commonService.GetSalesQty(
    startDate,
    endDate,
    this.selectedUnitId,
    productId,
    null,
    null
  )
  .pipe(takeUntil(this.destroy$))
  .subscribe({
    next: quantity => {
      target.patchValue({
        SalesQuantity: Number(quantity)
      },{
        emitEvent: false
      });
    },
    error: () => {
      target.patchValue({
        SalesQuantity: 0
      },{
        emitEvent: false
      });

      this.toastr.error('Unable to load Sales Quantity.');
    }
  });
}




  searchItems = (text$: Observable<string>): Observable<IItem[]> => {
    return text$.pipe(
      debounceTime(800), //
      distinctUntilChanged(),

      switchMap(searchText => {
        const text = searchText.trim();

        this.itemSearchCompleted = false;
        this.itemSearchHasResults = true;
        this.itemSearchFailed = false;

        if (
          this.selectedLineProductTypeId !== 2 ||
          !this.selectedUnitId ||
          text.length < 2
        ) {
          this.isItemSearching = false;
          return of([]);
        }




        this.isItemSearching = true;

        return this.commonService.GetItemList(this.selectedUnitId,text).pipe(
          tap(items => {
            this.itemSearchCompleted = true;
            this.itemSearchHasResults = items.length > 0;
            this.itemSearchFailed = false;
          }),

          catchError(() => {
            this.itemSearchCompleted = true;
            this.itemSearchHasResults = false;
            this.itemSearchFailed = true;
            return of([]);
          }),

          finalize(() => {
            this.isItemSearching = false;
          })
        );
      })
    );
  };

  itemFormatter = (item: IItem | string): string => {
    if (typeof item === 'string') {
      return item;
    }

    // return item ? `${item.Name} (${item.Id})` : '';
    return item ? item.Name : '';
  };

  scrollActiveItem(): void {
    setTimeout(() => {
      const dropdown = document.querySelector(
        // 'ngb-typeahead-window.dropdown-menu'
        '.requisition-item-dropdown'
      ) as HTMLElement | null;

      const activeItem = dropdown?.querySelector(
        '.dropdown-item.active'
      ) as HTMLElement | null;

      if (!dropdown || !activeItem) {
        return;
      }

      const itemTop = activeItem.offsetTop;
      const itemBottom = itemTop + activeItem.offsetHeight;
      const visibleTop = dropdown.scrollTop;
      const visibleBottom = visibleTop + dropdown.clientHeight;

      if (itemTop < visibleTop) {
        dropdown.scrollTop = itemTop;
      }
      else if (itemBottom > visibleBottom) {
        dropdown.scrollTop = itemBottom - dropdown.clientHeight;
      }
    });
  }






onItemSelect(event: NgbTypeaheadSelectItemEvent): void {
  const startDate = this.formGroup.get('StartDate')?.value;
  const endDate = this.formGroup.get('EndDate')?.value;
  const businessId = Number(this.formGroup.get('BusinessId')?.value);

  if (!startDate || !endDate) {
    event.preventDefault();
    this.toastr.warning('Please select Start Date and End Date first.');
    return;
  }

  if (!this.selectedUnitId || !businessId) {
    event.preventDefault();
    this.toastr.warning('Please select Unit and Business first.');
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    event.preventDefault();
    this.toastr.warning('Start Date cannot be greater than End Date.');
    return;
  }

  const item = event.item as IItem;

  this.lineFormGroup.patchValue({
    ItemId: item.Id,
    ItemName: item.Name,
    StockQuantity: 0,
    SalesQuantity: 0
  },{
    emitEvent: false
  });

  this.loadStockQuantity(Number(item.Id),this.lineFormGroup);
  this.loadSalesQuantity(Number(item.Id),this.lineFormGroup);

  this.itemSearchCompleted = false;
  this.itemSearchHasResults = true;
  this.itemSearchFailed = false;
}




  onUnitChange(): void {
    this.formGroup.get('BusinessId')?.reset('');
    this.filterBusinesses();

    this.lines.clear();
    this.resetLineInput();

    this.isItemSearching = false;
    this.itemSearchCompleted = false;
    this.itemSearchHasResults = true;
    this.itemSearchFailed = false;
    this.lineSubmitted = false;
  }

  onBusinessChange(): void {
  this.lines.clear();
  this.resetLineInput();

  this.isItemSearching = false;
  this.itemSearchCompleted = false;
  this.itemSearchHasResults = true;
  this.itemSearchFailed = false;
  this.lineSubmitted = false;
}

  filterBusinesses(): void {
    this.filteredBusinesses = this.businesses.filter(
      business => Number(business.UnitId) === this.selectedUnitId
    );
  }

  addLine(): void {
    this.lineSubmitted = true;
    this.lineFormGroup.markAllAsTouched();

    if (!this.canAddLine || this.lineFormGroup.invalid) {
      return;
    }

    const lineValue = this.lineFormGroup.getRawValue();
    const productTypeId = Number(lineValue.ProductTypeId);

    const selectedUOM = this.uoms.find(
      uom => Number(uom.Id) === Number(lineValue.UOMId)
    );

    const newLine = new FormGroup({
      ID: new FormControl(0),
      ReqID: new FormControl(0),
      ProductTypeId: new FormControl(productTypeId),
      ItemId: new FormControl(productTypeId === 1 ? 0 : Number(lineValue.ItemId)
      ),
      ItemName: new FormControl(
        productTypeId === 1
          ? lineValue.ItemName?.trim() ?? ''
          : lineValue.ItemName
      ),
      UOMId: new FormControl(Number(lineValue.UOMId)),
      UOMName: new FormControl(selectedUOM?.Name ?? ''),
      Quantity: new FormControl(Number(lineValue.Quantity)),

      StockQuantity: new FormControl(Number(lineValue.StockQuantity) || 0),
      SalesQuantity: new FormControl(Number(lineValue.SalesQuantity) || 0),

      Remarks: new FormControl(lineValue.Remarks ?? ''),
      FileStatusId: new FormControl(1),
      IsActive: new FormControl(true)
    });

    this.lines.push(newLine);

    this.resetLineInput(productTypeId);
    this.lineSubmitted = false;
  }

  resetLineInput(productTypeId: number = 2): void {
    this.lineFormGroup.reset({
      ProductTypeId: productTypeId,
      ItemSearch: '',
      ItemId: '',
      ItemName: '',
      UOMId: '',
      StockQuantity: 0,
      SalesQuantity: 0,
      Quantity: '',
      Remarks: ''
    });

    this.isItemSearching = false;
    this.itemSearchCompleted = false;
    this.itemSearchHasResults = true;
    this.itemSearchFailed = false;
  }

  // removeLine(index:number): void {
  //   this.lines.removeAt(index);
  // }

  removeLine(index:number): void {
  const lineId = Number(this.lines.at(index).get('ID')?.value);

  if (this.isEditMode && lineId > 0) {
    this.deletedLineIds.push(lineId);
  }

  this.lines.removeAt(index);
}


openViewModal(content:any,requisition:IRequisition): void {
  const activeLines = requisition.Lines.filter(x => x.IsActive);

  this.loadItemNames(activeLines).subscribe(lines => {
    this.selectedRequisition = {
      Header: requisition.Header,
      Lines: lines,
      DeletedLineIds: []
    };

    this.modalService.open(content,{
      size: 'xl'
    });
  });
}
loadItemNames(lines:any[]): Observable<any[]> {
  const items = lines.map(line => ({
    Type: Number(line.ProductTypeId),
    Id: Number(line.ItemId),
    Name: ''
  }));

  return this.commonService.GetRequisitionItemNames(items).pipe(
    map(result => {
      return lines.map(line => ({
        ...line,
        ItemName: result.find(x =>
          Number(x.Type) === Number(line.ProductTypeId) &&
          Number(x.Id) === Number(line.ItemId)
        )?.Name ?? ''
      }));
    })
  );
}



openEditModal(content:any,requisition:IRequisition): void {
  const activeLines = requisition.Lines.filter(x => x.IsActive);

  this.loadItemNames(activeLines).subscribe(lines => {
    this.resetCreateForm();

    this.isEditMode = true;
    this.editingReqID = requisition.Header.ReqID;
    this.deletedLineIds = [];

    this.selectedRequisition = {
      Header: requisition.Header,
      Lines: lines,
      DeletedLineIds: []
    };

    this.formGroup.patchValue({
      UnitId: requisition.Header.UnitId,
      BusinessId: requisition.Header.BusinessId,
      ReqDate: String(requisition.Header.ReqDate).substring(0,10),

      StartDate: String(requisition.Header.StartDate).substring(0,10),
      EndDate: String(requisition.Header.EndDate).substring(0,10),

      Remarks: requisition.Header.Remarks
    });

    this.filterBusinesses();
    this.formGroup.get('UnitId')?.disable();

    lines.forEach(line => {
      this.lines.push(new FormGroup({
        ID: new FormControl(Number(line.ID)),
        ReqID: new FormControl(Number(line.ReqID)),
        ProductTypeId: new FormControl(Number(line.ProductTypeId)),
        ItemId: new FormControl(Number(line.ItemId)),
        ItemName: new FormControl(line.ItemName ?? ''),
        UOMId: new FormControl(Number(line.UOMId)),
        UOMName: new FormControl(this.getUOMName(Number(line.UOMId))),
        Quantity: new FormControl(Number(line.Quantity)),

        StockQuantity: new FormControl(line.StockQuantity ?? 0),
        SalesQuantity: new FormControl(line.SalesQuantity ?? 0),

        Remarks: new FormControl(line.Remarks ?? ''),
        FileStatusId: new FormControl(Number(line.FileStatusId)),
        IsActive: new FormControl(true)
      }));
    });

    this.modalService.open(content,{
      fullscreen: true,
      backdrop: 'static',
      keyboard: false,
      windowClass: 'requisition-fullscreen-modal'
    });
  });
}






  openCreateModal(content:any): void {
    this.resetCreateForm();

    this.modalService.open(content,{
      fullscreen: true,
      backdrop: 'static',
      keyboard: false,
      windowClass: 'requisition-fullscreen-modal'
    });
  }

  resetCreateForm(): void {
    this.formGroup.get('UnitId')?.enable();

    this.isEditMode = false;
    this.editingReqID = 0;
    this.deletedLineIds = [];
    this.selectedRequisition = null;

    this.lines.clear();

    this.formGroup.reset({
      UnitId: '',
      BusinessId: '',
      ReqDate: {
        value: new Date().toISOString().split('T')[0],
        disabled: true
      },
      StartDate: '',
      EndDate: '',
      Remarks: ''
    });

    this.resetLineInput();

    this.filteredBusinesses = [];
    this.submitted = false;
    this.lineSubmitted = false;
  }

  Create(): void {
  this.submitted = true;
  this.formGroup.markAllAsTouched();

  if (this.formGroup.invalid || this.lines.length === 0) {
    console.warn('Requisition validation failed.', {
      headerValid: this.formGroup.valid,
      lineCount: this.lines.length
    });

    return;
  }

  const formValue = this.formGroup.getRawValue();
  const enroll = Number(localStorage.getItem('Enroll'));
  const currentDate = new Date();

  const requisitionData: IRequisition = {
    Header: {
      ReqID: 0,
      RequisitionNumber: '',
      UnitId: Number(formValue.UnitId),
      BusinessId: Number(formValue.BusinessId),
      ReqDate: new Date(formValue.ReqDate),

      StartDate: new Date(formValue.StartDate),
      EndDate: new Date(formValue.EndDate),

      Remarks: formValue.Remarks?.trim() ?? '',
      FileStatusId: 1,
      IsActive: true,
      CREATEDBY: enroll,
      UPDATEDBY: enroll,
      CREATEDDATE: currentDate,
      UPDATEDDATE: currentDate
    },
    Lines: this.lines.getRawValue().map((line: any) => ({
      ID: 0,
      ReqID: 0,
      ProductTypeId: Number(line.ProductTypeId),
      ItemId: Number(line.ProductTypeId) === 1
        ? 0
        : Number(line.ItemId),
      ItemName: Number(line.ProductTypeId) === 1
        ? line.ItemName?.trim() ?? ''
        : null,
      UOMId: Number(line.UOMId),
      Quantity: Number(line.Quantity),

      StockQuantity: Number(line.StockQuantity) || 0,
      SalesQuantity: Number(line.SalesQuantity) || 0,

      Remarks: line.Remarks?.trim() ?? '',
      FileStatusId: 1,
      IsActive: true
    })),

    DeletedLineIds: []

  };

  console.log('Requisition API payload:', requisitionData);

  this.requisitionService.addData(requisitionData)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: response => {
        if (response.Status) {
          this.toastr.success(response.Message);
          this.resetCreateForm();
          this.modalService.dismissAll();
          this.currentPage.set(1);
          this.retry();
        } else {
          this.toastr.warning(
            response.Message || 'Unable to save the requisition.'
          );
        }
      },
      error: () => {
        this.toastr.error(
          'Something went wrong while saving the requisition.'
        );
      }
    });
    }






Update(): void {
  this.submitted = true;
  this.formGroup.markAllAsTouched();

  if (
    this.formGroup.invalid ||
    this.lines.length === 0 ||
    !this.selectedRequisition
  ) {
    return;
  }

  const formValue = this.formGroup.getRawValue();
  const enroll = Number(localStorage.getItem('Enroll'));
  const currentDate = new Date();
  const existingHeader = this.selectedRequisition.Header;

  const requisitionData: IRequisition = {
    Header: {
      ReqID: this.editingReqID,
      RequisitionNumber: existingHeader.RequisitionNumber,
      UnitId: Number(formValue.UnitId),
      BusinessId: Number(formValue.BusinessId),
      ReqDate: new Date(formValue.ReqDate),

      StartDate: new Date(formValue.StartDate),
      EndDate: new Date(formValue.EndDate),


      Remarks: formValue.Remarks?.trim() ?? '',
      FileStatusId: existingHeader.FileStatusId,
      IsActive: existingHeader.IsActive,
      CREATEDBY: existingHeader.CREATEDBY,
      UPDATEDBY: enroll,
      CREATEDDATE: existingHeader.CREATEDDATE,
      UPDATEDDATE: currentDate
    },
    Lines: this.lines.getRawValue()
      .filter((line:any) => Number(line.ID) === 0)
      .map((line:any) => ({
        ID: 0,
        ReqID: this.editingReqID,
        ProductTypeId: Number(line.ProductTypeId),
        ItemId: Number(line.ProductTypeId) === 1
          ? 0
          : Number(line.ItemId),
        ItemName: Number(line.ProductTypeId) === 1
          ? line.ItemName?.trim() ?? ''
          : null,
        UOMId: Number(line.UOMId),
        Quantity: Number(line.Quantity),

        StockQuantity: Number(line.StockQuantity) || 0,
        SalesQuantity: Number(line.SalesQuantity) || 0,

        Remarks: line.Remarks?.trim() ?? '',
        FileStatusId: Number(line.FileStatusId),
        IsActive: true
      })),
    DeletedLineIds: this.deletedLineIds
  };

  this.requisitionService.updateData(requisitionData)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: response => {
        if (response.Status) {
          this.toastr.success(response.Message);
          this.resetCreateForm();
          this.modalService.dismissAll();
          this.retry();
        }
        else {
          this.toastr.warning(
            response.Message || 'Unable to update the requisition.'
          );
        }
      },
      error: () => {
        this.toastr.error(
          'Something went wrong while updating the requisition.'
        );
      }
    });
}






Delete(reqId:number): void {

  const isConfirmed = confirm('Are you sure you want to delete this requisition?');

  if (!isConfirmed) {
    return;
  }

  this.requisitionService.deleteData(reqId).subscribe({
    next: (response) => {

      if (response.Status) {
        this.toastr.success(response.Message);
        //this.currentPage.set(1);
        this.retry();
      }
      else {
        this.toastr.error(response.Message);
      }

    },
    error: (error) => {

      this.toastr.error(
        error?.error?.Message || 'Unable to delete the requisition.'
      );

    }
  });

}









ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}




}