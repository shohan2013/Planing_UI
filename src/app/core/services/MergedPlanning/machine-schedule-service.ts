import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalConstant } from '../../constants/global.constants';
import {
  IMachineJob,
  IMachineJobsRequest,
  IMachineScheduleRequest,
} from '../../model/MergedPlanning/machine-schedule-model';

/** Jobs already allocated to a machine, used to warn before double-booking it. */
@Injectable({
  providedIn: 'root',
})
export class MachineScheduleService {
  constructor(private readonly http: HttpClient) {}

  /**
   * GET MergedPlanning/GetMachineJobs?businessFlowConfigureId=&machineId=&startDate=&endDate=
   * Jobs on the machine (for that planning step) that overlap [startDate, endDate].
   * An empty list means the machine is free in that slot.
   */
  GetMachineJobs(request: IMachineJobsRequest): Observable<IMachineJob[]> {
    let params = new HttpParams()
      .set('businessFlowConfigureId', request.BusinessFlowConfigureId)
      .set('machineId', request.MachineId)
      .set('startDate', request.StartDate)
      .set('endDate', request.EndDate);
    if (request.ExcludeJobId) params = params.set('excludeJobId', request.ExcludeJobId);
    return this.http
      .get<IMachineJob[] | null>(
        `${environment.API_URL}${GlobalConstant.API_END_POINTS.MachineJobs}`,
        { params },
      )
      .pipe(map((jobs) => jobs ?? []));
  }

  /**
   * GET MergedPlanning/GetMachineSchedule?businessFlowConfigureId=&machineId=&fromDate=
   * Every job on the machine (for that planning step) that ends after `fromDate`
   * (now), up to its last planned job. Used by the "View schedule" dialog.
   */
  GetMachineSchedule(request: IMachineScheduleRequest): Observable<IMachineJob[]> {
    let params = new HttpParams()
      .set('businessFlowConfigureId', request.BusinessFlowConfigureId)
      .set('machineId', request.MachineId)
      .set('fromDate', request.FromDate);
    if (request.ExcludeJobId) params = params.set('excludeJobId', request.ExcludeJobId);
    return this.http
      .get<IMachineJob[] | null>(
        `${environment.API_URL}${GlobalConstant.API_END_POINTS.MachineSchedule}`,
        { params },
      )
      .pipe(map((jobs) => jobs ?? []));
  }
}
