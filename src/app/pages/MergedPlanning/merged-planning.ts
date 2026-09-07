import {
  Component,
  OnDestroy,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, takeUntil, tap } from 'rxjs';
import { IBusiness } from 'src/app/core/model/Common/BusinessType/BusinessType';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { IUnit } from 'src/app/core/model/Common/Unit/Unit';
import { IMergedPlanning } from 'src/app/core/model/MergedPlanning/merged-planning-model';
import { ServerSideFilteredPaginatedComponent } from 'src/app/core/server-side-filtered-paginated/server-side-filtered-paginated.component';
import { CommonService } from 'src/app/core/services/Common/CommonService';
import { MergedPlanningServices } from 'src/app/core/services/MergedPlanning/merged-planning-services';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { DateTimePipe } from 'src/app/shared/pipes/date-time-pipe';
import { MergedPlanningView } from './merged-planning-view/merged-planning-view';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-merged-planning',
  standalone: true,
  imports: [FormsModule, DateTimePipe, PaginationComponent, MergedPlanningView],
  templateUrl: './merged-planning.html',
  styleUrl: './merged-planning.scss',
})
export class MergedPlanning
  extends ServerSideFilteredPaginatedComponent<IMergedPlanning>
  implements OnInit, OnDestroy
{
  private destroy$ = new Subject<void>();
  units: IUnit[];
  businesses: IBusiness[];
  selectedUnitId: Number = 0;
  selectedBusinessId: Number = 0;

  // NEW: template ref for the merged-planning-view modal, opened via NgbModal
  @ViewChild('mergedPlanningViewModal')
  mergedPlanningViewModal!: TemplateRef<any>;
  selectedHeaderId = signal<number | null>(null);

  constructor(
    private mergedPlanningService: MergedPlanningServices,
    private commonService: CommonService,
    private toaster: ToastrService,
    private modalService: NgbModal, // NEW
  ) {
    super();
  }

  ngOnInit(): void {
    this.GetUnitList();
    this.GetBusinessList();
    //this.retry();
  }

  protected override fetchData(
    request: ServerQueryRequest,
  ): Observable<ServerQueryResponse<IMergedPlanning>> {
    return this.mergedPlanningService
      .GetMergedPlanning(request, this.selectedUnitId, this.selectedBusinessId)
      .pipe(
        tap((response) => console.log('Merged Planning Response', response)),
      );
  }

  onUnitFilterChange(): void {
    //console.log(this.selectedUnitId);
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
        //console.log(data);
        this.businesses = data;
      });
  }

  GetUnitList(): void {
    this.commonService
      .GetUnitList()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        //console.log(data);
        this.units = data;
      });
  }

  openPlanning(item: IMergedPlanning): void {
    this.selectedHeaderId.set(item.Id);
    this.modalService.open(this.mergedPlanningViewModal, {
      scrollable: true,
      fullscreen: true,
      windowClass: 'fullscreen-modal',
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
