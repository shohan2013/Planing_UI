import { CommonModule } from '@angular/common';
import { Component, NgModule, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import {
  debounceTime,
  distinctUntilChanged,
  finalize,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { ApproveMatrixHeader } from 'src/app/core/model/ApproveMatrix/ApproveMatrixHeader';
import { ApproveMatrixSave } from 'src/app/core/model/ApproveMatrix/ApproveMatrixSave';
import { IViewApproveMatrixEntity } from 'src/app/core/model/ApproveMatrix/ViewApproveMatrix';

import { IApproveMatrixGroup } from 'src/app/core/model/Common/ApproveMatrixGroup/ApproveMatrixGroup';
import { IApproveMatrixGroupList } from 'src/app/core/model/Common/ApproveMatrixGroupList/ApproveMatrixGroupList';
import { IEnroll } from 'src/app/core/model/Common/Enroll/Enroll';

import { MenuModel } from 'src/app/core/model/Common/Menus/Menu';
import { IPriority } from 'src/app/core/model/Common/Priority/Priority';
import { SubMenuModel } from 'src/app/core/model/Common/SubMenu/SubMenu';
import { ApproveMatrixService } from 'src/app/core/services/ApproveMatrix/approve-matrix-service';
import { CommonService } from 'src/app/core/services/Common/CommonService';

import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import {
  IDropdownSettings,
  NgMultiSelectDropDownModule,
} from 'ng-multiselect-dropdown';

@Component({
  selector: 'app-approvematrix',
  standalone: true,
  templateUrl: './approvematrix.html',
  styleUrl: './approvematrix.scss',
  imports: [
    NgSelectModule,
    FormsModule,
    CommonModule,
    ReactiveFormsModule,
    NgMultiSelectDropDownModule,
  ],
})
export class Approvematrix implements OnInit, OnDestroy {
  searchText = '';
  submitted = false;
  selectedId: number;
  ApproveGroupTypeListDropdown: IApproveMatrixGroupList[] = [];
  paginatedItems: IViewApproveMatrixEntity[] = [];
  EmpList: IEnroll[] = []; //EmpList: any[] = [];
  MenuDropdown: MenuModel[] = [];
  SubMenuDropdown: SubMenuModel[] = []; // dropdown source
  ApproveGroupListDropdown: IApproveMatrixGroup[] = [];
  PriorityListDropdown: IPriority[] = [];
  selectedUser: number;
  search$ = new Subject<string>();
  UnitList: IUnit[] = [];
  private destroy$ = new Subject<void>();
  isLoading: boolean;
  error: any;

  constructor(
    private approvematrixservice: ApproveMatrixService,
    private commonservice: CommonService,
    private modalService: NgbModal,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.loadMenu();
    this.loadSubMenu();
    this.loadGroup();
    this.loadPriority();

    this.loadUnit();
    this.loadGroupType();
    this.loadEnroll();
  }

  loadUnit() {
    this.commonservice
      .GetUnitList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.UnitList = data;
        // console.log('Unit List:', data);
      });
  }

  loadGroupType() {
    this.commonservice
      .GetApproveMatrixGroupTypeList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        // console.log('Group Type List:', data);
        this.ApproveGroupTypeListDropdown = data;
      });
  }

  loadEnroll() {
    this.commonservice
      .GetEnrollList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        // console.log('Enroll List:', data);
        this.EmpList = data;
      });
  }

  loadMenu() {
    this.commonservice
      .GetMenuList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        //console.log('Menu:', data);
        this.MenuDropdown = data;
      });
  }

  loadSubMenu() {
    this.commonservice
      .GetSubMenuList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        //console.log('SubMenu:', data);
        this.SubMenuDropdown = data;
      });
  }

  onMenuChange() {
    //console.log(this.formGroup.value);
    this.formGroup.patchValue({
      SubMenuId: '',
    });
  }

  loadPriority() {
    this.commonservice
      .GetPriorityList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.PriorityListDropdown = data;
      });
  }

  // select individuals

  onItemSelect(item: any) {
    if (!this.selectedEmployees.some((e) => e.Id === item.Id)) {
      this.selectedEmployees = [...this.selectedEmployees, item];
    }
  }

  onItemDeSelect(item: any) {
    this.selectedEmployees = this.selectedEmployees.filter(
      (e) => e.Id !== item.Id,
    );
  }

  onSelectAll(items: any[]) {
    this.selectedEmployees = [...items];
  }

  onDeSelectAll() {
    this.selectedEmployees = [];
  }

  selectedEmployees: any[] = [];

  dropdownSettings: IDropdownSettings = {
    singleSelection: false,
    idField: 'Id',
    textField: 'Name',
    selectAllText: 'Select All',
    unSelectAllText: 'Unselect All',
    itemsShowLimit: 10,
    allowSearchFilter: true,
    enableCheckAll: true,
  };

  Create() {
    this.isLoading = true;
    this.error = null;
    this.submitted = true;
    const model = new ApproveMatrixSave();

    if (this.formGroup.valid) {
      const ApproverMatrixHeader = {
        Id: 0,
        SubMenuId: this.formGroup.value.SubMenuId,
        IsApprovalAllowed: true,
        Description: '',
        IsActive: true,
        CreatedBy: Number(localStorage.getItem('Enroll')),
        CreatedDate: new Date(),
        UpdatedBy: Number(localStorage.getItem('Enroll')),
        UpdatedDate: new Date(),
      };

      const ApproverMatrixLine = {
        Id: 0,
        ApproverMatrixHeaderId: 0,
        GroupId:
          Number(this.formGroup.value.GroupTypeId) === 1
            ? 0
            : Number(this.formGroup.value.GroupId),
        Enrolls:
          Number(this.formGroup.value.GroupTypeId) === 1
            ? this.selectedEmployees.map((x) => Number(x.Id))
            : [],
        Sequence: Number(this.formGroup.value.PriorityId),
        IsActive: true,
        UnitId:
          Number(this.formGroup.value.GroupTypeId) === 1
            ? Number(this.formGroup.value.UnitId)
            : 0,
      };

      model.Header = ApproverMatrixHeader;
      model.Lines.push(ApproverMatrixLine);

      console.log('ApproveMatrixSave Payload:', model);

      this.approvematrixservice
        .addData(model)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // this.formGroup.reset();
            this.formGroup.reset({
              GroupTypeId: 2,
              Enroll: [],
              GroupId: '',
              UnitId: '',
            });
            this.submitted = false;
            this.toastr.success('Data saved successfully.');
          },
        });
    }
  }

  loadGroup() {
    this.commonservice
      .GetApprovalGroupList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.ApproveGroupListDropdown = data;
      });
  }

  onToggle(id: number, type: number, status: boolean) {
    this.approvematrixservice
      .ProvideApproveMatrix(type, id, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log(response);
          this.toastr.success(response.Message);
        },
        error: (error) => {
          console.error('API Error:', error);
        },
      });
  }

  GetEmpInfo() {
    this.search$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((term) => this.commonservice.GetEmpData(term)),
      )
      .subscribe((data) => {
        this.EmpList = data;
      });
  }

  trackById(index: number, item: any): number {
    return item.Id;
  }

  formGroup: FormGroup = new FormGroup({
    MenuId: new FormControl('', Validators.required),
    SubMenuId: new FormControl('', Validators.required),
    GroupTypeId: new FormControl(2, Validators.required),
    Enroll: new FormControl<any[]>([]), //new FormControl(''),

    GroupId: new FormControl('', Validators.required),
    PriorityId: new FormControl('', Validators.required),

    UnitId: new FormControl(''),
  });

  onGroupTypeChange(groupTypeId: any) {
    const selectedType = Number(groupTypeId);

    this.selectedEmployees = [];

    this.formGroup.patchValue({
      GroupId: '',
      Enroll: [],
      UnitId: '',
    });

    if (selectedType === 1) {
      // Individual
      this.formGroup.get('GroupId')?.clearValidators();

      this.formGroup.get('Enroll')?.setValidators([Validators.required]);
      this.formGroup.get('UnitId')?.setValidators([Validators.required]);
    } else {
      // Group
      this.formGroup.get('Enroll')?.clearValidators();
      this.formGroup.get('UnitId')?.clearValidators();

      this.formGroup.get('GroupId')?.setValidators([Validators.required]);
    }

    this.formGroup.get('GroupId')?.updateValueAndValidity();
    this.formGroup.get('Enroll')?.updateValueAndValidity();
    this.formGroup.get('UnitId')?.updateValueAndValidity();
  }

  get f(): { [key: string]: AbstractControl } {
    return this.formGroup.controls;
  }

  onSelect(e: any) {
    if (!e) return null;
    this.GetApproveMatrix(e);
  }

  GetApproveMatrix(name: string) {
    this.approvematrixservice
      .GetApproveMatrix(name)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.paginatedItems = data;
        },
        error: (error) => {
          console.log('Error :', error);
        },
      });
  }

  onSearch(event: any) {
    const term = event.term;

    if (!term || term.length < 2) {
      this.EmpList = [];
      return;
    }
    this.search$.next(term);
  }

  saveModal(content: any) {
    this.modalService.open(content, {
      size: 'lg',
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
