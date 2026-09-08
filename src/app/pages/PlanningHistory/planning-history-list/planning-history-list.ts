import {
  Component,
  OnDestroy,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, Subject, takeUntil, tap } from 'rxjs';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IPlanningHistory } from 'src/app/core/model/PlanningHistory/planning-history-model';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { PlanningHistoryServices } from 'src/app/core/services/PlanningHistory/planning-history-services';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { DateTimePipe } from 'src/app/shared/pipes/date-time-pipe';
import { PlanningEditView } from '../planning-edit-view/planning-edit-view';

@Component({
  selector: 'app-planning-history-list',
  standalone: true,
  imports: [FormsModule, DateTimePipe, PaginationComponent, PlanningEditView],
  templateUrl: './planning-history-list.html',
  styleUrl: './planning-history-list.scss',
})
export class PlanningHistoryList
  extends ServerSideFilteredPaginatedComponent<IPlanningHistory>
  implements OnInit, OnDestroy
{
  private destroy$ = new Subject<void>();
  units: IUnit[];
  businesses: IBusiness[];
  selectedUnitId: Number = 0;
  selectedBusinessId: Number = 0;

  @ViewChild('planningEditModal')
  planningEditModal!: TemplateRef<any>;
  selectedHeaderId = signal<number | null>(null);

  constructor(
    private planningHistoryService: PlanningHistoryServices,
    private commonService: CommonService,
    private modalService: NgbModal,
  ) {
    super();
  }

  ngOnInit(): void {
    this.GetUnitList();
    this.GetBusinessList();
  }

  protected override fetchData(
    request: ServerQueryRequest,
  ): Observable<ServerQueryResponse<IPlanningHistory>> {
    return this.planningHistoryService
      .GetPlanningHistory(request, this.selectedUnitId, this.selectedBusinessId)
      .pipe(
        tap((response) => console.log('Planning History Response', response)),
      );
  }

  onUnitFilterChange(): void {
    this.selectedBusinessId = 0;
    this.GetBusinessList();
    this.currentPage.set(1);
    this.retry();
  }

  onBusinessFilterChange(): void {
    this.currentPage.set(1);
    this.retry();
  }

  GetBusinessList(): void {
    this.commonService
      .GetBusinessList(this.selectedUnitId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.businesses = data;
      });
  }

  GetUnitList(): void {
    this.commonService
      .GetUnitList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.units = data;
      });
  }

  openPlan(item: IPlanningHistory): void {
    this.selectedHeaderId.set(item.Id);
    this.modalService.open(this.planningEditModal, {
      scrollable: true,
      fullscreen: true,
      windowClass: 'fullscreen-modal',
    });
  }

  onPlanUpdated(): void {
    this.retry();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
