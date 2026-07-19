import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
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
import { IUOM } from 'src/app/core/model/Common/UOM/UOM';
import { CommonService } from 'src/app/core/services/Common/CommonService';

@Component({
  selector: 'app-requisition',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgbTypeaheadModule
  ],
  templateUrl: './requisition.html',
  styleUrl: './requisition.scss'
})
export class Requisition implements OnDestroy {

  submitted = false;
  lineSubmitted = false;

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
    ProductTypeId: new FormControl('',Validators.required),
    Remarks: new FormControl(''),
    Lines: new FormArray([])
  });

  lineFormGroup: FormGroup = new FormGroup({
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
    private modalService: NgbModal
  ) {
    this.loadCommonData();
    this.watchItemInput();
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
        if (typeof value === 'string') {
          this.lineFormGroup.patchValue({
            ItemId: '',
            ItemName: ''
          },{
            emitEvent: false
          });
        }
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

        if (!this.selectedUnitId || text.length < 2) {
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

    const selectedUOM = this.uoms.find(
      uom => Number(uom.Id) === Number(lineValue.UOMId)
    );

    const newLine = new FormGroup({
      ID: new FormControl(0),
      ReqID: new FormControl(0),
      ItemId: new FormControl(Number(lineValue.ItemId)),
      ItemName: new FormControl(lineValue.ItemName),
      UOMId: new FormControl(Number(lineValue.UOMId)),
      UOMName: new FormControl(selectedUOM?.Name ?? ''),
      Quantity: new FormControl(Number(lineValue.Quantity)),
      Remarks: new FormControl(lineValue.Remarks ?? ''),
      IsActive: new FormControl(true)
    });

    this.lines.push(newLine);

    this.resetLineInput();
    this.lineSubmitted = false;
  }

  resetLineInput(): void {
    this.lineFormGroup.reset({
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
      ProductTypeId: '',
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
    console.warn('Requisition validation failed.',{
      headerValid: this.formGroup.valid,
      lineCount: this.lines.length
    });

    return;
  }

  const formValue = this.formGroup.getRawValue();

  const requisitionData = {
    Header: {
      ReqID: 0,
      RequisitionNumber: '',
      UnitId: Number(formValue.UnitId),
      BusinessId: Number(formValue.BusinessId),
      ReqDate: formValue.ReqDate,
      ProductTypeId: Number(formValue.ProductTypeId),
      Remarks: formValue.Remarks?.trim() ?? ''
    },
    Lines: this.lines.getRawValue().map((line:any) => ({
      ID: 0,
      ReqID: 0,
      ItemId: Number(line.ItemId),
      UOMId: Number(line.UOMId),
      Quantity: Number(line.Quantity),
      Remarks: line.Remarks?.trim() ?? '',
      IsActive: true
    }))
  };

  console.log('Requisition object:',requisitionData);
  console.log(
    'Requisition API payload:',
    JSON.stringify(requisitionData,null,2)
  );
  console.table(requisitionData.Lines);
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}




}