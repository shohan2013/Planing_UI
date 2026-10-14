import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import {
  Observable,
  Subject,
  catchError,
  defaultIfEmpty,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';

import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import { IMasterConfigurationFG } from 'src/app/core/model/MasterConfiguration/MasterConfigurationFG';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { MasterConfigurationService } from 'src/app/core/services/MasterConfiguration/master-configuration.service';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { FGExpandedComponent } from './components/fg-expanded.component';

@Component({
  selector: 'master-configuration',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, FGExpandedComponent],
  templateUrl: './master-configuration.html',
  styleUrl: './master-configuration.scss',
})
export class MasterConfiguration
  extends ServerSideFilteredPaginatedComponent<IMasterConfigurationFG>
  implements OnInit, OnDestroy
{
  selectedUnitId = 0;
  selectedBusinessId = 0;

  readonly units = signal<IUnit[]>([]);
  readonly businesses = signal<IBusiness[]>([]);
  readonly unitsLoading = signal(false);
  readonly businessesLoading = signal(false);
  readonly expandedItemId = signal<number | null>(null);

  private expansionTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly businessRequests$ = new Subject<number>();
  private readonly invalidateFGRequest$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly commonService: CommonService,
    private readonly masterConfigurationService: MasterConfigurationService,
    private readonly toaster: ToastrService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.listenForBusinessChanges();
    this.loadUnits();
  }

  protected override fetchData(
    request: ServerQueryRequest,
  ): Observable<ServerQueryResponse<IMasterConfigurationFG>> {
    const emptyResponse = this.emptyResponse(request);

    if (this.selectedUnitId <= 0 || this.selectedBusinessId <= 0) {
      return of(emptyResponse);
    }

    return this.masterConfigurationService
      .GetFGs(request, this.selectedUnitId, this.selectedBusinessId)
      .pipe(
        takeUntil(this.invalidateFGRequest$),
        defaultIfEmpty(emptyResponse),
      );
  }

  onUnitChange(value: number): void {
    this.selectedUnitId = Number(value);
    this.selectedBusinessId = 0;
    this.businesses.set([]);
    this.businessesLoading.set(this.selectedUnitId > 0);
    this.globalSearch.set('');
    this.currentPage.set(1);

    this.resetTable();
    this.error.set(null);
    this.businessRequests$.next(this.selectedUnitId);
    this.retry();
  }

  onBusinessChange(value: number): void {
    this.selectedBusinessId = Number(value);
    this.globalSearch.set('');
    this.currentPage.set(1);

    this.resetTable();
    this.error.set(null);
    this.retry();
  }

  override updateSearch(term: string): void {
    this.invalidateFGRequest$.next();
    this.collapseDetails();
    this.error.set(null);
    super.updateSearch(term);
  }

  changePage(page: number): void {
    this.invalidateFGRequest$.next();
    this.collapseDetails();
    this.onPageChange(page);
  }

  changePageSize(size: number): void {
    this.invalidateFGRequest$.next();
    this.collapseDetails();
    this.onPageSizeChange(size);
  }

  toggleDetails(itemId: number): void {
    if (this.expandedItemId() === itemId) {
      this.collapseDetails();
      return;
    }

    this.clearExpansionTimer();
    this.expansionTimer = setTimeout(() => {
      this.expandedItemId.set(itemId);
      this.expansionTimer = null;
    }, 300);
  }

  collapseDetails(): void {
    this.clearExpansionTimer();
    this.expandedItemId.set(null);
  }

  private loadUnits(): void {
    this.unitsLoading.set(true);

    this.commonService
      .GetUnitList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (units) => {
          this.units.set(units);
          this.unitsLoading.set(false);
        },
        error: () => {
          this.units.set([]);
          this.unitsLoading.set(false);
          this.toaster.error('Unable to load Units.');
        },
      });
  }

  private listenForBusinessChanges(): void {
    this.businessRequests$
      .pipe(
        switchMap((unitId) => {
          if (unitId <= 0) {
            return of<IBusiness[]>([]);
          }

          return this.commonService.GetBusinessList(unitId).pipe(
            catchError(() => {
              this.toaster.error('Unable to load Businesses.');
              return of<IBusiness[]>([]);
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((businesses) => {
        this.businesses.set(businesses);
        this.businessesLoading.set(false);

        if (this.selectedUnitId > 0 && businesses.length === 1) {
          this.onBusinessChange(businesses[0].Id);
        }
      });
  }

  private resetTable(): void {
    this.invalidateFGRequest$.next();
    this.items.set([]);
    this.serverTotalItems.set(0);
    this.isLoading.set(false);
    this.collapseDetails();
  }

  private clearExpansionTimer(): void {
    if (this.expansionTimer !== null) {
      clearTimeout(this.expansionTimer);
      this.expansionTimer = null;
    }
  }

  private emptyResponse(
    request: ServerQueryRequest,
  ): ServerQueryResponse<IMasterConfigurationFG> {
    return {
      Data: [],
      Total: 0,
      Page: request.page,
      PageSize: request.pageSize,
      TotalPages: 0,
    };
  }

  ngOnDestroy(): void {
    this.clearExpansionTimer();
    this.invalidateFGRequest$.next();
    this.destroy$.next();
    this.destroy$.complete();
    this.businessRequests$.complete();
    this.invalidateFGRequest$.complete();
  }
}