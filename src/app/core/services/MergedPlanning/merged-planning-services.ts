import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from '../../model/Common/Pagination/ServerQueryRequest';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GlobalConstant } from '../../constants/global.constants';
import {
  IMergedPlanning,
  IMergedPlanningDetails,
} from '../../model/MergedPlanning/merged-planning-model';

@Injectable({
  providedIn: 'root',
})
export class MergedPlanningServices {
  constructor(private http: HttpClient) {}

  GetMergedPlanning(
    request: ServerQueryRequest,
    unitId: Number,
    BusinessesId: Number,
  ): Observable<ServerQueryResponse<IMergedPlanning>> {
    return this.http.get<ServerQueryResponse<IMergedPlanning>>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.MergedPlanning}?GlobalSearch=${request.globalSearch}&PageIndex=${request.page}&PageSize=${request.pageSize}&UnitId=${unitId}&BusinessId=${BusinessesId}`,
    );
  }

  // NEW: fetches Header + Lines for a single merged DO, used by merged-planning-view
  GetMergedPlanningDetails(
    headerId: number,
  ): Observable<IMergedPlanningDetails> {
    return this.http.get<IMergedPlanningDetails>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.MergedPlanningDetails}?Id=${headerId}`,
    );
  }
}
