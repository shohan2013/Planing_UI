import { CommonModule } from '@angular/common';
import { Component,OnInit,signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import {
debounceTime,
distinctUntilChanged,of,Subject,
switchMap,
takeUntil
} from 'rxjs';


import { IPermission } from 'src/app/core/model/Permission/Permission';
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
  EmpList = signal<any[]>([]); // dropdown source
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

  // search$ is bound to ng-select [typeahead], which disables ng-select's local
  // filtering by bindLabel (Name) so enroll-number results are not hidden
  // terms shorter than 2 chars clear the list instead of calling the API
  GetEmpInfo() {
    this.search$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((term) =>
          term && term.length >= 2 ? this.commonservice.GetEmpData(term) : of([]),
        ),
        takeUntil(this.destroy$),
      )
      .subscribe((data) => {
        this.EmpList.set(data);
      });
  }

  onSelect(selectedId: string | null) {
    if (!selectedId) {
      this.clearEmpList();
      return;
    }
    this.GetPermissionData(selectedId);
  }

  // dropdown closed without a selection: drop the stale suggestions
  onClose() {
    if (!this.selectedUser) this.clearEmpList();
  }

  // pushing '' through search$ also resets distinctUntilChanged,
  // so retyping the same term fetches again
  clearEmpList() {
    this.EmpList.set([]);
    this.search$.next('');
  }

  GetPermissionData(name: string) {
    this.permissionservice
      .Permission(name)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          //console.log(data);
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
