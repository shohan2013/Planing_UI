import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  TemplateRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  NgbModal,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import {
  Observable,
  finalize,
} from 'rxjs';

import {
  ServerQueryRequest,
  ServerQueryResponse,
} from '../../../core/model/Common/Pagination/ServerQueryRequest';
import {
  IApiResponse,
  IApiResponseWithData,
} from '../../../core/model/Response/ApiResponse';
import {
  ICreateRolePermission,
  IRolePermissionLanding,
  IRolePermissionMatrix,
  IRolePermissionSelection,
  IUpdateRolePermission,
  IViewRolePermission,
} from '../../../core/model/Role/RolePermission';
import { ServerSideFilteredPaginatedComponent } from '../../../core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { RolePermissionService } from 'src/app/core/services/Role/role-permission.service';
import { PaginationComponent } from '../../../shared/pagination/pagination.component';

type FormMode = 'create' | 'edit';

type PermissionField =
  | 'CanView'
  | 'CanInsert'
  | 'CanUpdate'
  | 'CanDelete'
  | 'CanPrint';

@Component({
  selector: 'app-role-permission',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PaginationComponent,
  ],
  templateUrl: './role-permission.html',
  styleUrl: './role-permission.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolePermission extends ServerSideFilteredPaginatedComponent<IRolePermissionLanding> implements OnDestroy
{
  private readonly destroyRef = inject(DestroyRef);

  readonly formMode = signal<FormMode>('create');
  readonly selectedRole = signal<IRolePermissionLanding | null>(null);
  readonly viewRoleDetails = signal<IViewRolePermission | null>(null);

  readonly formPermissions = signal<IRolePermissionMatrix[]>([]);
  readonly originalPermissions = signal<IRolePermissionMatrix[]>([]);

  readonly formMatrixSearch = signal('');
  readonly viewMatrixSearch = signal('');

  readonly formSubmitted = signal(false);
  readonly matrixLoading = signal(false);
  readonly viewLoading = signal(false);
  readonly saving = signal(false);
  readonly deletingRoleId = signal<number | null>(null);

  readonly roleForm = new FormGroup({
    RoleName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly filteredFormPermissions = computed(() => {
    const search = this.formMatrixSearch()
      .trim()
      .toLowerCase();

    if (!search) {
      return this.formPermissions();
    }

    return this.formPermissions().filter(
      (permission) => {
        const menuName =
          permission.MenuName?.toLowerCase() ?? '';

        const subMenuName =
          permission.SubMenuName?.toLowerCase() ?? '';

        return (
          menuName.includes(search) ||
          subMenuName.includes(search)
        );
      },
    );
  });

  readonly filteredViewPermissions = computed(() => {
    const search = this.viewMatrixSearch()
      .trim()
      .toLowerCase();

    const permissions =
      this.viewRoleDetails()?.Permissions ?? [];

    if (!search) {
      return permissions;
    }

    return permissions.filter(
      (permission) => {
        const menuName =
          permission.MenuName?.toLowerCase() ?? '';

        const subMenuName =
          permission.SubMenuName?.toLowerCase() ?? '';

        return (
          menuName.includes(search) ||
          subMenuName.includes(search)
        );
      },
    );
  });

  readonly formTitle = computed(() =>
    this.formMode() === 'create'
      ? 'CREATE ROLE'
      : 'UPDATE ROLE',
  );

  readonly submitButtonText = computed(() =>
    this.formMode() === 'create'
      ? 'Create'
      : 'Update',
  );

  private formModalRef: NgbModalRef | null = null;
  private viewModalRef: NgbModalRef | null = null;

  constructor(
    private readonly rolePermissionService: RolePermissionService,
    private readonly modalService: NgbModal,
    private readonly toastr: ToastrService,
  ) {
    super();
  }


  protected override fetchData(request: ServerQueryRequest,): Observable<ServerQueryResponse<IRolePermissionLanding>> {
    return this.rolePermissionService.getAllData(
      request,
    );
  }




  get formControls(): {
    [key: string]: AbstractControl;
  } {
    return this.roleForm.controls;
  }

  openCreateModal(
    content: TemplateRef<unknown>,
  ): void {
    if (
      this.formModalRef ||
      this.viewModalRef ||
      this.saving()
    ) {
      return;
    }

    this.resetFormModalState();
    this.formMode.set('create');

    this.openFormModal(content);
    this.loadCreateMatrix();
  }

  openEditModal(
    content: TemplateRef<unknown>,
    role: IRolePermissionLanding,
  ): void {
    if (
      this.formModalRef ||
      this.viewModalRef ||
      this.saving()
    ) {
      return;
    }

    this.resetFormModalState();
    this.formMode.set('edit');
    this.selectedRole.set(role);

    this.roleForm.reset({
      RoleName: role.RoleName,
    });

    this.openFormModal(content);
    this.loadEditRole(role.ID);
  }

  openViewModal(
    content: TemplateRef<unknown>,
    role: IRolePermissionLanding,
  ): void {
    if (
      this.formModalRef ||
      this.viewModalRef ||
      this.viewLoading()
    ) {
      return;
    }

    this.viewRoleDetails.set(null);
    this.viewMatrixSearch.set('');
    this.viewLoading.set(true);

    const modalRef = this.modalService.open(
      content,
      {
      fullscreen: true,
      backdrop: 'static',
      keyboard: false,
      windowClass: 'role-permission-modal',
      },
    );

    this.viewModalRef = modalRef;

    const clearReference = (): void => {
      if (this.viewModalRef === modalRef) {
        this.viewModalRef = null;
      }

      this.viewRoleDetails.set(null);
      this.viewMatrixSearch.set('');
      this.viewLoading.set(false);
    };

    modalRef.result.then(
      clearReference,
      clearReference,
    );

    this.rolePermissionService
      .viewData(role.ID)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.viewLoading.set(false);
        }),
      )
      .subscribe({
        next: (details) => {
          if (this.viewModalRef !== modalRef) {
            return;
          }

          this.viewRoleDetails.set({
            ...details,
            Permissions:
              details.Permissions.map(
                (permission) => ({
                  ...permission,
                  MenuName:
                    permission.MenuName || '-',
                }),
              ),
          });
        },

        error: (error) => {
          if (this.viewModalRef !== modalRef) {
            return;
          }

          this.toastr.error(
            this.getErrorMessage(
              error,
              'Unable to load role details.',
            ),
          );
        },
      });
  }

  closeFormModal(): void {
    if (this.saving()) {
      return;
    }

    this.formModalRef?.dismiss(
      'form-modal-closed',
    );
  }

  closeViewModal(): void {
    this.viewModalRef?.dismiss(
      'view-modal-closed',
    );
  }

  onFormMatrixSearch(
    value: string,
  ): void {
    this.formMatrixSearch.set(value ?? '');
  }

  onViewMatrixSearch(
    value: string,
  ): void {
    this.viewMatrixSearch.set(value ?? '');
  }

  onPermissionChange(
    subMenuId: number,
    field: PermissionField,
    value: boolean,
  ): void {
    if (
      this.matrixLoading() ||
      this.saving()
    ) {
      return;
    }

    this.formPermissions.update(
      (permissions) =>
        permissions.map((permission) => {
          if (
            permission.SubMenuID !== subMenuId
          ) {
            return permission;
          }

          const updatedPermission = {
            ...permission,
            [field]: value,
          };

          if (
            field !== 'CanView' &&
            value
          ) {
            updatedPermission.CanView = true;
          }

          return updatedPermission;
        }),
    );
  }

  isPermissionChanged(
    subMenuId: number,
    field: PermissionField,
  ): boolean {
    if (this.formMode() !== 'edit') {
      return false;
    }

    const currentPermission =
      this.formPermissions().find(
        (permission) =>
          permission.SubMenuID === subMenuId,
      );

    const originalPermission =
      this.originalPermissions().find(
        (permission) =>
          permission.SubMenuID === subMenuId,
      );

    if (
      !currentPermission ||
      !originalPermission
    ) {
      return false;
    }

    return (
      currentPermission[field] !==
      originalPermission[field]
    );
  }

  isRoleNameChanged(): boolean {
    if (this.formMode() !== 'edit') {
      return false;
    }

    const role = this.selectedRole();

    if (!role) {
      return false;
    }

    return (
      this.roleForm.controls.RoleName.value.trim() !==
      role.RoleName.trim()
    );
  }

  submitForm(): void {
    this.formSubmitted.set(true);

    if (
      this.roleForm.invalid ||
      this.matrixLoading()
    ) {
      this.roleForm.markAllAsTouched();
      return;
    }

    if (this.saving()) {
      return;
    }

    const enroll = this.getLoggedInEnroll();

    if (!enroll) {
      this.toastr.error(
        'Logged-in employee information was not found.',
      );
      return;
    }

    const roleName =
      this.roleForm.controls.RoleName.value.trim();

    if (!roleName) {
      this.roleForm.controls.RoleName.setErrors({
        required: true,
      });

      return;
    }

    const permissions =
      this.createPermissionPayload();

    this.saving.set(true);

    if (this.formMode() === 'create') {
      const payload: ICreateRolePermission = {
        RoleName: roleName,
        CreatedBy: enroll,
        Permissions: permissions,
      };

      this.rolePermissionService
        .addData(payload)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            this.saving.set(false);
          }),
        )
        .subscribe({
          next: (response) => {
            this.handleSaveResponse(response);
          },

          error: (error) => {
            this.toastr.error(
              this.getErrorMessage(
                error,
                'Unable to create the role.',
              ),
            );
          },
        });

      return;
    }

    const selectedRole = this.selectedRole();

    if (!selectedRole) {
      this.saving.set(false);

      this.toastr.error(
        'Role information was not found.',
      );

      return;
    }

    const payload: IUpdateRolePermission = {
      ID: selectedRole.ID,
      RoleName: roleName,
      UpdatedBy: enroll,
      Permissions: permissions,
    };

    this.rolePermissionService
      .updateData(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.saving.set(false);
        }),
      )
      .subscribe({
        next: (response) => {
          this.handleSaveResponse(response);
        },

        error: (error) => {
          this.toastr.error(
            this.getErrorMessage(
              error,
              'Unable to update the role.',
            ),
          );
        },
      });
  }

  deleteRole(
    role: IRolePermissionLanding,
  ): void {
    if (
      this.deletingRoleId() !== null ||
      this.saving()
    ) {
      return;
    }

    const updatedBy = this.getLoggedInEnroll();

    if (!updatedBy) {
      this.toastr.error(
        'Logged-in employee information was not found.',
      );
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete the role "${role.RoleName}"?`,
    );

    if (!confirmed) {
      return;
    }

    this.deletingRoleId.set(role.ID);

    this.rolePermissionService
      .deleteData({
        ID: role.ID,
        UpdatedBy: updatedBy,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.deletingRoleId.set(null);
        }),
      )
      .subscribe({
        next: (response) => {
          if (!response.Status) {
            this.toastr.error(
              response.Message,
            );

            return;
          }

          this.toastr.success(
            response.Message,
          );

          if (
            this.paginatedItems().length === 1 &&
            this.currentPage() > 1
          ) {
            this.currentPage.update(
              (page) => page - 1,
            );
          } else {
            this.retry();
          }
        },

        error: (error) => {
          this.toastr.error(
            this.getErrorMessage(
              error,
              'Unable to delete the role.',
            ),
          );
        },
      });
  }

  trackByRoleId(
    _index: number,
    role: IRolePermissionLanding,
  ): number {
    return role.ID;
  }

  trackBySubMenuId(
    _index: number,
    permission: IRolePermissionMatrix,
  ): number {
    return permission.SubMenuID;
  }

  private openFormModal(
    content: TemplateRef<unknown>,
  ): void {
    const modalRef = this.modalService.open(
      content,
      {
        fullscreen: true,
        backdrop: 'static',
        keyboard: false,
        windowClass: 'role-permission-modal',
      },
    );

    this.formModalRef = modalRef;

    const clearReference = (): void => {
      if (this.formModalRef === modalRef) {
        this.formModalRef = null;
      }

      this.resetFormModalState();
    };

    modalRef.result.then(
      clearReference,
      clearReference,
    );
  }

  private loadCreateMatrix(): void {
    this.matrixLoading.set(true);

    this.rolePermissionService
      .getPermissionMatrix()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.matrixLoading.set(false);
        }),
      )
      .subscribe({
        next: (permissions) => {
          this.formPermissions.set(
            permissions.map(
              (permission) => ({
                ...permission,
                MenuName:
                  permission.MenuName || '-',
              }),
            ),
          );

          this.originalPermissions.set([]);
        },

        error: (error) => {
          this.formPermissions.set([]);

          this.toastr.error(
            this.getErrorMessage(
              error,
              'Unable to load the permission matrix.',
            ),
          );
        },
      });
  }

  private loadEditRole(
    roleId: number,
  ): void {
    this.matrixLoading.set(true);

    this.rolePermissionService
      .viewData(roleId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.matrixLoading.set(false);
        }),
      )
      .subscribe({
        next: (details) => {
          if (
            this.selectedRole()?.ID !== roleId
          ) {
            return;
          }

          const permissions =
            details.Permissions.map(
              (permission) => ({
                ...permission,
                MenuName:
                  permission.MenuName || '-',
              }),
            );

          this.roleForm.reset({
            RoleName: details.RoleName,
          });

          this.formPermissions.set(
            permissions.map(
              (permission) => ({
                ...permission,
              }),
            ),
          );

          this.originalPermissions.set(
            permissions.map(
              (permission) => ({
                ...permission,
              }),
            ),
          );

          this.selectedRole.update(
            (role) =>
              role
                ? {
                    ...role,
                    RoleName:
                      details.RoleName,
                  }
                : role,
          );
        },

        error: (error) => {
          this.formPermissions.set([]);

          this.toastr.error(
            this.getErrorMessage(
              error,
              'Unable to load role details.',
            ),
          );
        },
      });
  }

  private createPermissionPayload():
    IRolePermissionSelection[] {
    return this.formPermissions().map(
      (permission) => ({
        SubMenuID: permission.SubMenuID,
        CanView: permission.CanView,
        CanInsert: permission.CanInsert,
        CanUpdate: permission.CanUpdate,
        CanDelete: permission.CanDelete,
        CanPrint: permission.CanPrint,
      }),
    );
  }

  private handleSaveResponse(
    response: IApiResponseWithData<
      number | boolean
    >,
  ): void {
    if (!response.Status) {
      this.toastr.error(response.Message);
      return;
    }

    this.toastr.success(response.Message);
    this.formModalRef?.close(
      'role-saved',
    );
    this.retry();
  }

  private resetFormModalState(): void {
    this.roleForm.reset({
      RoleName: '',
    });

    this.formMode.set('create');
    this.selectedRole.set(null);
    this.formPermissions.set([]);
    this.originalPermissions.set([]);
    this.formMatrixSearch.set('');
    this.formSubmitted.set(false);
    this.matrixLoading.set(false);
    this.saving.set(false);
  }

  private getErrorMessage(
    error: unknown,
    fallbackMessage: string,
  ): string {
    const response = (
      error as {
        error?: Partial<IApiResponse>;
      }
    )?.error;

    return response?.Message || fallbackMessage;
  }

  private getLoggedInEnroll(): number | null {
    const enroll = Number(
      localStorage.getItem('Enroll'),
    );

    return Number.isInteger(enroll) &&
      enroll > 0
      ? enroll
      : null;
  }

  ngOnDestroy(): void {
    this.formModalRef?.dismiss(
      'role-permission-destroyed',
    );

    this.viewModalRef?.dismiss(
      'role-permission-destroyed',
    );

    this.formModalRef = null;
    this.viewModalRef = null;
  }
}