import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
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
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, takeUntil } from 'rxjs';
import { ApproveMatrixGroupHeader } from 'src/app/core/model/ApproveMatrixGroup/ApproveMatrixGroupHeader';
import { ApproveMatrixGroupSave } from 'src/app/core/model/ApproveMatrixGroup/ApproveMatrixGroupSave';
import { IViewApprovalGroup } from 'src/app/core/model/ApproveMatrixGroup/ViewApproveMatrixGroup';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { SubMenuModel } from 'src/app/core/model/Common/SubMenu/SubMenu';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { ApprovematrixGroupservice } from 'src/app/core/services/ApproveMatrix/approvematrixgroupservice';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import {
  IDropdownSettings,
  NgMultiSelectDropDownModule,
} from 'ng-multiselect-dropdown';
import { Enroll } from 'src/app/core/model/ApproveMatrixGroup/ApproveMatrixGroupEnroll';

@Component({
  selector: 'app-group-assign',
  standalone: true,
  templateUrl: './group-assign.html',
  styleUrl: './group-assign.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgMultiSelectDropDownModule,
  ],
})
export class GroupAssign {
  private destroy$ = new Subject<void>();
  paginatedItems: IViewApprovalGroup[] = [];
  UnitList: IUnit[] = [];
  selectedUnitId: number | null = null;
  selectedSubMenuId: number | null = null;
  SubMenuDropdown: SubMenuModel[] = [];
  submitted = false;
  selectedEmployees: Enroll[] = [];
  EmpList: Enroll[] = [];

  isLoading: boolean;
  error: any;

  constructor(
    private service: ApprovematrixGroupservice,
    private commonservice: CommonService,
    private modalService: NgbModal,
    private toastr: ToastrService,
  ) {
    this.loadUnit();
    this.loadSubMenu();
    this.loadEmployee();
  }

  ngOnInit(): void {
    //this.GetApproveMatrixGroup(6);
  }

  trackById(index: number, item: any): number {
    return item.Id;
  }

  GetApproveMatrixGroup(id: number) {
    this.service
      .GetApproveMatrixGroup(
        this.selectedUnitId == null ? 0 : this.selectedUnitId,
        this.selectedSubMenuId == null ? 0 : this.selectedSubMenuId,
      )
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

  formGroup: FormGroup = new FormGroup({
    GroupName: new FormControl('', Validators.required),
    UnitId: new FormControl('', Validators.required),
    IsActive: new FormControl(false),
    EmpList: new FormControl<Enroll[]>([]),
  });

  get f(): { [key: string]: AbstractControl } {
    return this.formGroup.controls;
  }

  loadUnit() {
    this.commonservice
      .GetUnitList()
      .pipe(takeUntilDestroyed())
      .subscribe((data) => {
        this.UnitList = data;
        this.UnitList = data;
      });
  }

  loadEmployee() {
    this.commonservice
      .GetEnrollList()
      .pipe(takeUntilDestroyed())
      .subscribe((data) => {
        console.log(data);
        this.EmpList = data;
      });
  }

  loadSubMenu() {
    this.commonservice
      .GetSubMenuList()
      .pipe(takeUntilDestroyed())
      .subscribe((data) => {
        this.SubMenuDropdown = data;
      });
  }

  Create() {
    const model = new ApproveMatrixGroupSave();

    if (this.formGroup.valid) {
      const ApproveMatrixGroupHeader = {
        Id: 0,
        GroupName: this.formGroup.value.GroupName,
        UnitId: this.formGroup.value.UnitId,
        IsActive: this.formGroup.value.IsActive,

        CreatedBy: Number(localStorage.getItem('Enroll')),
        CreatedDate: new Date(),
        UpdatedBy: Number(localStorage.getItem('Enroll')),
        UpdatedDate: new Date(),
      };

      // const ApproverMatrixGroupAssign = {
      // Id:0,
      // ApproveMatrixGroupId: 0,
      // Enroll:0,
      // IsActive: true
      // };

      model.Header = ApproveMatrixGroupHeader;

      model.Line.push(...this.selectedEmployees);

      this.service
        .addData(model)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.formGroup.reset();
            this.submitted = false;
            this.toastr.success('Data saved successfully.');
          },
        });
    }
  }

  saveModal(content: any) {
    this.modalService.open(content, {
      size: 'lg',
    });
  }

  onToggle(id: number, type: number, status: boolean) {
    //  this.permissionservice.PermissionByType(type, id, status).pipe(takeUntil(this.destroy$)).subscribe({
    //             next: (response) => {
    //                 console.log('API Response:', response);
    //             },
    //             error: (error) => {
    //                 console.error('API Error:', error);
    //             }
    //         });
  }

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

  onItemSelect(item: any) {
    if (!this.selectedEmployees.some((e) => e.Id === item.Id)) {
      this.selectedEmployees = [...this.selectedEmployees, item];
    }

    console.log(this.selectedEmployees);
  }

  onItemDeSelect(item: any) {
    //console.log(item);

    this.selectedEmployees = this.selectedEmployees.filter(
      (e) => e.Id !== item.Id,
    );
    console.log(this.selectedEmployees);
  }

  onSelectAll(items: any[]) {
    this.selectedEmployees = [...items];
  }

  onDeSelectAll() {
    this.selectedEmployees = [];
  }
}
