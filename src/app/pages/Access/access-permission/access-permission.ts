import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import {
  debounceTime,
  distinctUntilChanged,
  Observable,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';

import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';

import { IPermission } from 'src/app/core/model/Permission/Permission';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { AccessService } from 'src/app/core/services/Access/access-service';
import { CommonService } from 'src/app/core/services/Common/CommonService';

@Component({
  selector: 'app-access-permission',
  standalone: true,
  templateUrl: './access-permission.html',
  styleUrl: './access-permission.scss',
  imports: [NgSelectModule, FormsModule, CommonModule],
})
export class AccessPermission implements OnInit {
  //searchText = '';
  selectedId: number;
  paginatedItems = signal<IPermission[]>([]);
  EmpList: any[] = []; // dropdown source
  selectedUser: number;
  search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private permissionservice: AccessService,
    private commonservice: CommonService,
    private modalService: NgbModal,
  ) {}

  ngOnInit(): void {
    //this.selectedUser = Number(localStorage.getItem('Enroll'));
    this.GetEmpInfo();
    this.GetPermissionData(localStorage.getItem('Enroll'));
  }

  saveModal(content: any) {
    this.modalService.open(content, {
      size: 'lg',
    });
  }

  trackById(index: number, item: any): number {
    return index;
  }

  //selectedCustomer: number | null = null;

  onSearch(event: any) {
    const term = event.term;

    if (!term || term.length < 2) {
      return;
    }

    this.search$.next(term);
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

  onSelect(selectedId: string | null) {
    if (!selectedId) return null;
    this.GetPermissionData(selectedId);
  }

  GetPermissionData(name: string) {
    this.permissionservice
      .Permission(name)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log(data);
          this.paginatedItems.set(data);
        },
        error: (error) => {
          console.log('Error :', error);
        },
      });
  }

  onToggle(id: number, submenuid: number, type: number, status: boolean) {
    this.permissionservice
      .PermissionByType(type, id, submenuid, this.selectedUser, status)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {},
        error: (error) => {},
      });
  }
}
