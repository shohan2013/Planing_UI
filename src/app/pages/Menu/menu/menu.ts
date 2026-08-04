import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { finalize, Observable, Subject, takeUntil } from 'rxjs';
import { Module } from 'src/app/core/model/Common/Module/Module';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { IMenu } from 'src/app/core/model/Menu/Menu';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { MenuService } from 'src/app/core/services/menu/menu-service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';

import { InputHelper } from 'src/app/shared/pipes/NumberInputOnly';

@Component({
  selector: 'app-menu',
  standalone: true,
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
  imports: [
    CommonModule,
    PaginationComponent,
    FormsModule,
    ReactiveFormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Menu extends ServerSideFilteredPaginatedComponent<IMenu> {
  InputHelper = InputHelper;
  closeResult = '';
  submitted = false;
  modules: Module[] = [];
  Menu: IMenu[] = [];
  PID: number;
  private destroy$ = new Subject<void>();
  isLoadingdata = false;

  protected override fetchData(
    request: ServerQueryRequest,
  ): Observable<ServerQueryResponse<IMenu>> {
    this.isLoadingdata = true;
    return this.menuservice.GetMenu(request).pipe(
      finalize(() => {
        this.isLoadingdata = false;
      }),
    );
  }

  getMenuById(id: number) {
    this.menuservice
      .getMenuById(Number(id))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.eformGroup.controls['eModuleID'].setValue(data.ModuleID);
          this.eformGroup.controls['eName'].setValue(data.Name);
          this.eformGroup.controls['eSequence'].setValue(data.Sequence);
          this.eformGroup.controls['eCode'].setValue(data.Code);
          this.eformGroup.controls['eIsActive'].setValue(
            Boolean(data.IsActive),
          );
          this.PID = data.Id;
          this.isLoading.set(false);
        },
      });
  }

  constructor(
    private menuservice: MenuService,
    private commonservice: CommonService,
    private modalService: NgbModal,
    private toastr: ToastrService,
  ) {
    super();
    this.loadModule();
    this.loadMenu();
  }

  loadModule() {
    this.commonservice
      .GetModuleList()
      .pipe(takeUntilDestroyed())
      .subscribe((data) => {
        this.modules = data;
      });
  }

  loadMenu() {
    this.commonservice
      .GetModuleList()
      .pipe(takeUntilDestroyed())
      .subscribe((data) => {
        this.modules = data;
      });
  }

  Create(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.submitted = true;

    if (this.formGroup.valid) {
      const menuData = {
        Id: 0,
        ModuleID: this.formGroup.value.ModuleID,
        Code: this.formGroup.value.Code,
        Name: this.formGroup.value.Name,
        Icon: '',
        Description: this.formGroup.value.Description,
        Sequence: this.formGroup.value.Sequence,
        IsActive: this.formGroup.value.IsActive,
        CreatedBy: Number(localStorage.getItem('Enroll')),
        CreatedDate: new Date(),
        UpdatedBy: Number(localStorage.getItem('Enroll')),
        UpdatedDate: new Date(),
      };

      this.menuservice
        .addMenu(menuData)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.isLoading.set(false)),
        )
        .subscribe({
          next: () => {
            this.formGroup.reset();
            this.submitted = false;
            this.toastr.success('Data saved successfully.');
          },
        });
    }
  }

  Update(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.submitted = true;

    if (this.eformGroup.valid) {
      const menuData = {
        Id: this.PID,
        ModuleID: this.eformGroup.value.eModuleID,
        Code: this.eformGroup.value.eCode,
        Name: this.eformGroup.value.eName,
        Icon: '',
        Description: this.eformGroup.value.eDescription,
        Sequence: this.eformGroup.value.eSequence,
        IsActive: this.eformGroup.value.eIsActive,
        CreatedBy: Number(localStorage.getItem('Enroll')),
        CreatedDate: new Date(),
        UpdatedBy: Number(localStorage.getItem('Enroll')),
        UpdatedDate: new Date(),
      };

      this.menuservice
        .updateMenu(this.PID, menuData)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.isLoading.set(false)),
        )
        .subscribe({
          next: (data) => {
            this.formGroup.reset();
            this.submitted = false;
            this.toastr.success(data.Message);
          },
        });
    }
  }

  onToggle() {}

  trackById(index: number, item: any): number {
    return item.Id;
  }

  formGroup: FormGroup = new FormGroup({
    Name: new FormControl('', Validators.required),
    ModuleID: new FormControl('', Validators.required),
    Code: new FormControl('', Validators.required),
    Sequence: new FormControl('', Validators.required),
    IsActive: new FormControl(''),
  });

  eformGroup: FormGroup = new FormGroup({
    eName: new FormControl('', Validators.required),
    eModuleID: new FormControl('', Validators.required),
    eCode: new FormControl('', Validators.required),
    eSequence: new FormControl('', Validators.required),
    eIsActive: new FormControl(''),
  });

  get f(): { [key: string]: AbstractControl } {
    return this.formGroup.controls;
  }

  get ef(): { [key: string]: AbstractControl } {
    return this.eformGroup.controls;
  }

  Delete(id: number) {
    this.submitted = false;
    this.menuservice
      .deleteMenu(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (data) => {
          this.submitted = false;
          this.toastr.success(data.Message);
        },
      });
  }

  saveModal(content: any) {
    this.modalService.open(content, {
      size: 'lg',
    });
  }

  EditModal(content: any, id: number) {
    this.getMenuById(id);
    this.modalService.open(content, {
      size: 'lg',
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }
}
