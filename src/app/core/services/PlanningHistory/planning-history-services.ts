import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GlobalConstant } from '../../constants/global.constants';
import {
  ServerQueryRequest,
  ServerQueryResponse,
} from '../../model/Common/Pagination/ServerQueryRequest';
import {
  IPlanningHistory,
  IPlanningHistoryDetails,
  IPlanningHistoryUpdateRequest,
} from '../../model/PlanningHistory/planning-history-model';
import { IApiResponse } from '../../model/Response/ApiResponse';

@Injectable({
  providedIn: 'root',
})
export class PlanningHistoryServices {
  constructor(private http: HttpClient) {}

  GetPlanningHistory(
    request: ServerQueryRequest,
    unitId: Number,
    BusinessesId: Number,
  ): Observable<ServerQueryResponse<IPlanningHistory>> {
    return this.http.get<ServerQueryResponse<IPlanningHistory>>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.PlanningHistory}?GlobalSearch=${request.globalSearch}&PageIndex=${request.page}&PageSize=${request.pageSize}&UnitId=${unitId}&BusinessId=${BusinessesId}`,
    );
  }

  GetPlanningHistoryDetails(headerId: number): Observable<IPlanningHistoryDetails> {
    return this.http.get<IPlanningHistoryDetails>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.PlanningHistoryDetails}/${headerId}`,
    );
  }

  UpdatePlan(
    headerId: number,
    request: IPlanningHistoryUpdateRequest,
  ): Observable<IApiResponse> {
    return this.http.put<IApiResponse>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.UpdatePlan}/${headerId}`,
      request,
    );
  }
}
