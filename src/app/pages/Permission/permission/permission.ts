import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';

import {
  debounceTime,
  distinctUntilChanged,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { PermissionService } from 'src/app/core/services/Permission/PermissionService';
import { IPermission } from 'src/app/core/model/Permission/Permission';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { IEmpViewInfo } from 'src/app/core/model/Common/EmpInfo/ViewEmpInfo';

import { Submenu } from '../../SubMenu/submenu/submenu';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Menu } from '../../Menu/menu/menu';
import { AccessPermission } from '../../Access/access-permission/access-permission';
import { Approvematrix } from '../../ApprovalMatrix/Matrix/approvematrix/approvematrix';

@Component({
  selector: 'app-permission',
  imports: [
    CommonModule,
    FormsModule,
    NgSelectModule,
    Menu,
    Submenu,
    AccessPermission,
    Approvematrix,
  ],
  standalone: true,
  templateUrl: './permission.html',
  styleUrls: ['./permission.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Permission implements OnInit, OnDestroy {
  searchText = '';
  selectedId: number;

  paginatedItems: IPermission[] = [];

  EmpList: any[] = []; // dropdown source
  selectedUser: number;

  search$ = new Subject<string>();

  private destroy$ = new Subject<void>();

  currentJustify = 'start';
  currentOrientation = 'horizontal';
  disabled = true; // For disabled tab examples

  constructor(
    private permissionservice: PermissionService,
    private commonservice: CommonService,
    private modalService: NgbModal,
  ) {}
  ngOnInit(): void {
    this.GetEmpInfo();
  }

  activeTab = signal<string>('menu');

  onTabChange(tab: string) {
    this.activeTab.set(tab);
  }

  PermissionModal(content: any) {
    this.modalService.open(content, {
      size: 'lg',
    });
  }

  GetEmpInfo() {
    this.search$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => this.commonservice.GetEmpData(term)),
      )
      .subscribe((data) => {
        this.EmpList = data;
      });
  }

  isActive = signal(false);

  toggle() {
    this.isActive.update((v) => !v);
  }

  trackById(index: number, item: any): number {
    return item.Id;
  }

  //selectedCustomer: number | null = null;

  onSearch(event: any) {
    const term = event.term;

    if (!term || term.length < 2) {
      this.EmpList = [];
      return;
    }

    this.search$.next(term);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
