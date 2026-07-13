import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalDismissReasons, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { finalize, Observable, Subject, takeUntil } from 'rxjs';
import { ServerQueryRequest, ServerQueryResponse } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { IMenu } from 'src/app/core/model/Menu/Menu';
import { ISubMenu, ISubMenuView } from 'src/app/core/model/SubMenu/SubMenu';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { SubMenuService } from 'src/app/core/services/SubMenu/sub-menu-service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { InputHelper } from 'src/app/shared/pipes/NumberInputOnly';
import { MenuModel } from 'src/app/core/model/Common/Menus/Menu';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-submenu',
  standalone: true,
  templateUrl: './submenu.html',
  styleUrl: './submenu.scss',
  imports: [CommonModule, PaginationComponent, FormsModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Submenu extends ServerSideFilteredPaginatedComponent<ISubMenuView>{

   InputHelper = InputHelper;
    closeResult = '';
    submitted = false;
    Menu: ISubMenu[] = [];
    PID:number;
    MenuDropdown: MenuModel[] = [];
    private destroy$ = new Subject<void>();

     
  protected override fetchData(request: ServerQueryRequest): Observable<ServerQueryResponse<ISubMenuView>> {
    return this.submenuservice.GetSubMenu(request)
  }

  getSubMenuById(id:number)
  {
    this.isLoading.set(true);
    this.submenuservice.getSubMenuById(Number(id)).pipe(takeUntil(this.destroy$)).subscribe({
      next:(data)=>{
          console.log(data);
          this.eformGroup.controls['eMenuID'].setValue(data.MenuID);
          this.eformGroup.controls['eSubMenuName'].setValue(data.SubMenuName);
          this.eformGroup.controls['eSequence'].setValue(data.Sequence);
          this.eformGroup.controls['eCode'].setValue(data.Code);
          this.eformGroup.controls['eIsActive'].setValue(Boolean(data.IsActive));
          this.PID=data.Id;
          this.isLoading.set(false);
      }
    });
  }

  constructor(private submenuservice: SubMenuService, private commonservice: CommonService, private modalService: NgbModal, private toastr: ToastrService) {
    super();
    this.loadMenu();
  }

  protected override onInit(): void {
    //this.GetMenu();
  }

    loadMenu() {
    this.commonservice.GetMenuList()
      .pipe(takeUntilDestroyed())
      .subscribe(data => {
        this.MenuDropdown = data;
      });
  }

  CreateSubMenu(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.submitted = true;

    if (this.formGroup.valid) { 

      const SubMenuData = {
      Id:0,
      SubMenuName: this.formGroup.value.SubMenuName,
      MenuID: this.formGroup.value.MenuID,
      Code: this.formGroup.value.Code,
      RouterLink: this.formGroup.value.RouterLink,
      Icon:'',
      Description: this.formGroup.value.Description,
      Sequence: this.formGroup.value.Sequence,
      IsActive: this.formGroup.value.IsActive,
      CreatedBy: Number(localStorage.getItem('Enroll')),
      CreatedDate:new Date(),
      UpdatedBy: Number(localStorage.getItem('Enroll')),
      UpdatedDate:new Date()
    };

        this.submenuservice.addSubMenu(SubMenuData).pipe(takeUntil(this.destroy$),finalize(()=>this.isLoading.set(false))).subscribe({
          next: () => {
            this.formGroup.reset();
            this.submitted=false;
            this.toastr.success('Data saved successfully.')
          }
        })
    }
  }

  
  Update(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.submitted = true;

    if (this.eformGroup.valid) { 

      const SubMenuData = {
      Id:this.PID,
      SubMenuName: this.eformGroup.value.eSubMenuName,
      MenuID: this.eformGroup.value.eMenuID,
      Code: this.eformGroup.value.eCode,
      RouterLink: this.eformGroup.value.eRouterLink,
      Icon:'',
      Description: this.eformGroup.value.eDescription,
      Sequence: this.eformGroup.value.eSequence,
      IsActive: this.eformGroup.value.eIsActive,
      CreatedBy: Number(localStorage.getItem('Enroll')),
      CreatedDate:new Date(),
      UpdatedBy: Number(localStorage.getItem('Enroll')),
      UpdatedDate:new Date()
    };

        this.submenuservice.updateSubMenu(this.PID,SubMenuData).pipe(takeUntil(this.destroy$),finalize(()=>this.isLoading.set(false))).subscribe({
          next: (data) => {
            this.formGroup.reset();
            this.submitted=false;
            this.toastr.success(data.Message)
          }
        })
    }
  }

  onToggle()
  {
    
  }

  trackById(index: number, item: any): number {
    return item.Id;
  }

  formGroup: FormGroup = new FormGroup({
    SubMenuName: new FormControl('', Validators.required),
    RouterLink: new FormControl('', Validators.required),
    MenuID: new FormControl('', Validators.required),
    Code: new FormControl('', Validators.required),
    Sequence: new FormControl('', Validators.required),
    IsActive: new FormControl('')
  });

  eformGroup: FormGroup = new FormGroup({
    eSubMenuName: new FormControl('', Validators.required),
    eRouterLink: new FormControl('', Validators.required),
    eMenuID: new FormControl('', Validators.required),
    eCode: new FormControl('', Validators.required),
    eSequence: new FormControl('', Validators.required),
    eIsActive: new FormControl('')
  });

  get f(): { [key: string]: AbstractControl } {
    return this.formGroup.controls;
  }

   get ef(): { [key: string]: AbstractControl } {
    return this.eformGroup.controls;
  }

  DeleteSubMenu(id: number) {
    this.submitted=false;
     this.submenuservice.deleteSubMenu(id).pipe(takeUntil(this.destroy$),finalize(()=>this.isLoading.set(false))).subscribe({
      next :(data=>{
        this.submitted=false;
        this.toastr.success(data.Message)
      })
     })
  }

  saveModal(content: any) {
    this.modalService.open(content, {
      size: 'lg'
    });
  }

    EditModal(content: any,id:number) {
    this.getSubMenuById(id);
    this.modalService.open(content, {
      size: 'lg'
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

