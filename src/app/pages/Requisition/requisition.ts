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
  

  units: IUnit[] = [];
  businesses: IBusiness[] = [];
  filteredBusinesses: IBusiness[] = [];
  productTypes: IProductType[] = [];
  uoms: IUOM[] = [];

  isItemSearching = false;
  itemSearchCompleted = false;
  itemSearchHasResults = true;
  itemSearchFailed = false;

  private destroy$ = new Subject<void>();

  formGroup: FormGroup = new FormGroup({
    UnitId: new FormControl('',Validators.required),
    BusinessId: new FormControl('',Validators.required),
    ReqDate: new FormControl(
      new Date().toISOString().split('T')[0],
      Validators.required
    ),
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
  }


  protected override fetchData(request: ServerQueryRequest): Observable<ServerQueryResponse<IRequisition>> {
    return this.requisitionService.GetRequisition(request);
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
  }

  watchItemInput(): void {
    this.lineFormGroup.get('ItemSearch')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        if (this.selectedLineProductTypeId === 2 && typeof value === 'string') {
          this.lineFormGroup.patchValue({
            ItemId: '',
            ItemName: ''
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
          ItemName: ''
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

  searchItems = (text$: Observable<string>): Observable<IItem[]> => {
    return text$.pipe(
      debounceTime(300),
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

    return item ? `${item.Name} (${item.Id})` : '';
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
    const item = event.item as IItem;

    this.lineFormGroup.patchValue({
      ItemId: item.Id,
      ItemName: item.Name
    },{
      emitEvent: false
    });

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
      ItemId: new FormControl(
        productTypeId === 1 ? 0 : Number(lineValue.ItemId)
      ),
      ItemName: new FormControl(
        productTypeId === 1
          ? lineValue.ItemName?.trim() ?? ''
          : lineValue.ItemName
      ),
      UOMId: new FormControl(Number(lineValue.UOMId)),
      UOMName: new FormControl(selectedUOM?.Name ?? ''),
      Quantity: new FormControl(Number(lineValue.Quantity)),
      Remarks: new FormControl(lineValue.Remarks ?? ''),
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
      Quantity: '',
      Remarks: ''
    });

    this.isItemSearching = false;
    this.itemSearchCompleted = false;
    this.itemSearchHasResults = true;
    this.itemSearchFailed = false;
  }

  removeLine(index:number): void {
    this.lines.removeAt(index);
  }


openViewModal(content:any,requisition:IRequisition): void {
  const activeLines = requisition.Lines.filter(x => x.IsActive);

  this.loadItemNames(activeLines).subscribe(lines => {
    this.selectedRequisition = {
      Header: requisition.Header,
      Lines: lines
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
    this.lines.clear();

    this.formGroup.reset({
      UnitId: '',
      BusinessId: '',
      ReqDate: new Date().toISOString().split('T')[0],
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
      Remarks: formValue.Remarks?.trim() ?? '',
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
      Remarks: line.Remarks?.trim() ?? '',
      IsActive: true
    }))
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

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}




}