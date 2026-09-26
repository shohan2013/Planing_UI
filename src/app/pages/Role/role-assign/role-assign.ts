import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { ToastrService } from 'ngx-toastr';
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';

import { IEmpViewInfo } from '../../../core/model/Common/EmpInfo/ViewEmpInfo';
import { IApiResponse } from '../../../core/model/Response/ApiResponse';
import { IActiveRole, IRoleAssignment, ITerminateRole } from '../../../core/model/Role/Role';
import { CommonService } from '../../../core/services/Common/CommonService';
import { RoleService } from 'src/app/core/services/Role/role.service';

type RoleAction = 'assign' | 'terminate-view' | 'terminate';

@Component({
  selector: 'app-role-assign',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule],
  templateUrl: './role-assign.html',
  styleUrl: './role-assign.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleAssign implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly employeeSearch$ = new Subject<string>();

  readonly activeRoles = signal<IActiveRole[]>([]);
  readonly selectedRoleId = signal<number | null>(null);
  readonly rolesLoading = signal(false);

  readonly employeeResults = signal<IEmpViewInfo[]>([]);
  readonly selectedEmployeeId = signal<number | null>(null);
  readonly selectedEmployees = signal<IEmpViewInfo[]>([]);
  readonly employeeSearchLoading = signal(false);

  readonly processingAction = signal<RoleAction | null>(null);

  readonly canAssign = computed(() => {
    return this.selectedRoleId() !== null && this.selectedEmployees().length > 0 && this.processingAction() === null;
  });

  readonly canTerminate = computed(() => {
    return this.selectedEmployees().length > 0 && this.processingAction() === null;
  });

  /*
  * Employee filtering is already performed by the API.
  * Returning true prevents ng-select from filtering the
  * returned employees again using only bindLabel="Name".
  */
  readonly employeeSearchFilter = (_term: string, _employee: IEmpViewInfo): boolean => true;

  constructor(
    private readonly commonService: CommonService,
    private readonly roleService: RoleService,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.initializeEmployeeSearch();
    this.loadActiveRoles();
  }

  onRoleChange(roleId: number | string | null): void {
    if (roleId === null || roleId === undefined || roleId === '') {
      this.selectedRoleId.set(null);
      return;
    }

    const parsedRoleId = Number(roleId);
    this.selectedRoleId.set(Number.isInteger(parsedRoleId) && parsedRoleId > 0 ? parsedRoleId : null);
  }

  onEmployeeSearch(event: { term?: string }): void {
    const term = event?.term?.trim() ?? '';

    if (term.length < 2) {
      this.employeeResults.set([]);
    }

    this.employeeSearch$.next(term);
  }

  onEmployeeSelect(selectedId: number | string | null): void {
    if (selectedId === null || selectedId === undefined || selectedId === '') {
      return;
    }

    const enroll = Number(selectedId);
    const employee = this.employeeResults().find(item => Number(item.Id) === enroll);

    this.clearEmployeeSelector();

    if (!employee) {
      return;
    }

    const alreadySelected = this.selectedEmployees().some(item => Number(item.Id) === enroll);

    if (alreadySelected) {
      this.toastr.info('This employee is already in the list.');
      return;
    }

    this.selectedEmployees.update(employees => [...employees, employee]);
  }

  removeEmployee(enroll: number): void {
    if (this.processingAction() !== null) {
      return;
    }

    this.selectedEmployees.update(employees => employees.filter(employee => Number(employee.Id) !== enroll));
  }

  clearSelections(): void {
    if (this.processingAction() !== null) {
      return;
    }

    this.selectedRoleId.set(null);
    this.selectedEmployees.set([]);
    this.clearEmployeeSelector();
  }

  assignRole(): void {
    if (!this.canAssign()) {
      return;
    }

    const roleId = this.selectedRoleId();
    const createdBy = this.getLoggedInEnroll();

    if (!roleId) {
      this.toastr.error('Please select a Role.');
      return;
    }

    if (!createdBy) {
      this.toastr.error('Logged-in employee information was not found.');
      return;
    }

    const payload: IRoleAssignment = {
      RoleID: roleId,
      CreatedBy: createdBy,
      Enrolls: this.getSelectedEnrolls(),
    };

    this.processingAction.set('assign');

    this.roleService
      .assignRole(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processingAction.set(null)),
      )
      .subscribe({
        next: response => {
          if (!response.Status) {
            this.toastr.error(response.Message);
            return;
          }

          this.toastr.success(response.Message);

          // Keep the employees for possible further operations,
          // but clear the Role as required.
          this.selectedRoleId.set(null);
        },
        error: error => {
          this.toastr.error(this.getErrorMessage(error, 'Unable to assign the Role.'));
        },
      });
  }

  terminateView(): void {
    if (!this.canTerminate()) {
      return;
    }

    const confirmed = confirm(
      `Terminate View permission from every submenu for ${this.selectedEmployees().length} selected employee(s)? Other permission values will remain unchanged.`,
    );

    if (!confirmed) {
      return;
    }

    const updatedBy = this.getLoggedInEnroll();

    if (!updatedBy) {
      this.toastr.error('Logged-in employee information was not found.');
      return;
    }

    const payload: ITerminateRole = {
      UpdatedBy: updatedBy,
      Enrolls: this.getSelectedEnrolls(),
    };

    this.processingAction.set('terminate-view');

    this.roleService
      .terminateView(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processingAction.set(null)),
      )
      .subscribe({
        next: response => {
          if (!response.Status) {
            this.toastr.error(response.Message);
            return;
          }

          this.toastr.success(response.Message);
        },
        error: error => {
          this.toastr.error(this.getErrorMessage(error, 'Unable to terminate View permission.'));
        },
      });
  }

  terminate(): void {
    if (!this.canTerminate()) {
      return;
    }

    const confirmed = confirm(
      `Terminate all permissions for ${this.selectedEmployees().length} selected employee(s)? This will turn off View, Insert, Update, Delete and Print.`,
    );

    if (!confirmed) {
      return;
    }

    const updatedBy = this.getLoggedInEnroll();

    if (!updatedBy) {
      this.toastr.error('Logged-in employee information was not found.');
      return;
    }

    const payload: ITerminateRole = {
      UpdatedBy: updatedBy,
      Enrolls: this.getSelectedEnrolls(),
    };

    this.processingAction.set('terminate');

    this.roleService
      .terminate(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.processingAction.set(null)),
      )
      .subscribe({
        next: response => {
          if (!response.Status) {
            this.toastr.error(response.Message);
            return;
          }

          this.toastr.success(response.Message);
        },
        error: error => {
          this.toastr.error(this.getErrorMessage(error, 'Unable to terminate permissions.'));
        },
      });
  }

  isProcessing(action: RoleAction): boolean {
    return this.processingAction() === action;
  }

  trackEmployee(_index: number, employee: IEmpViewInfo): number {
    return Number(employee.Id);
  }

  private loadActiveRoles(): void {
    this.rolesLoading.set(true);

    this.commonService
      .getActiveRoles()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.rolesLoading.set(false)),
      )
      .subscribe({
        next: roles => {
          this.activeRoles.set(roles ?? []);
        },
        error: () => {
          this.activeRoles.set([]);
          this.toastr.error('Unable to load active Roles.');
        },
      });
  }

  private initializeEmployeeSearch(): void {
    this.employeeSearch$
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap(term => {
          if (term.length < 2) {
            this.employeeSearchLoading.set(false);
            return of([]);
          }

          this.employeeSearchLoading.set(true);

          return this.commonService.GetEmpData(term).pipe(
            catchError(() => {
              this.toastr.error('Unable to search employees.');
              return of([]);
            }),
            finalize(() => this.employeeSearchLoading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(employees => {
        this.employeeResults.set(employees ?? []);
      });
  }

  private clearEmployeeSelector(): void {
    this.selectedEmployeeId.set(null);
    this.employeeResults.set([]);
    this.employeeSearch$.next('');
  }

  private getSelectedEnrolls(): number[] {
    return this.selectedEmployees().map(employee => Number(employee.Id));
  }

  private getLoggedInEnroll(): number | null {
    const enroll = Number(localStorage.getItem('Enroll'));
    return Number.isInteger(enroll) && enroll > 0 ? enroll : null;
  }

  private getErrorMessage(error: unknown, fallbackMessage: string): string {
    const response = (error as { error?: Partial<IApiResponse> })?.error;
    return response?.Message || fallbackMessage;
  }
}