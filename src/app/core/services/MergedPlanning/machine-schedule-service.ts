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
   * POST MergedPlanning/GetMachineJobs
   * Body: { BusinessFlowConfigureId, MachineIds: number[], StartDate, EndDate, ExcludeJobId }
   * Jobs on any of the machines (for that planning step) that overlap [StartDate, EndDate].
   * An empty list means every machine is free in that slot.
   */
  GetMachineJobs(request: IMachineJobsRequest): Observable<IMachineJob[]> {
    const body: IMachineJobsRequest = {
      BusinessFlowConfigureId: request.BusinessFlowConfigureId,
      MachineIds: [...request.MachineIds],
      StartDate: request.StartDate,
      EndDate: request.EndDate,
      ExcludeJobId: request.ExcludeJobId || null,
    };
    return this.http
      .post<IMachineJob[] | null>(
        `${environment.API_URL}${GlobalConstant.API_END_POINTS.MachineJobs}`,
        body,
      )
      .pipe(map((jobs) => jobs ?? []));
  }

  /**
   * GET MergedPlanning/GetMachineSchedule?businessFlowConfigureId=&machineIds=1&machineIds=2&fromDate=
   * Every job on any of the machines (for that planning step) that ends after `fromDate`
   * (now), up to each machine's last planned job. Used by the "View schedule" dialog.
   */
  GetMachineSchedule(request: IMachineScheduleRequest): Observable<IMachineJob[]> {
    let params = new HttpParams()
      .set('businessFlowConfigureId', request.BusinessFlowConfigureId)
      .set('fromDate', request.FromDate);
    for (const machineId of request.MachineIds) {
      params = params.append('machineIds', machineId);
    }
    if (request.ExcludeJobId) params = params.set('excludeJobId', request.ExcludeJobId);
    return this.http
      .get<IMachineJob[] | null>(
        `${environment.API_URL}${GlobalConstant.API_END_POINTS.MachineSchedule}`,
        { params },
      )
      .pipe(map((jobs) => jobs ?? []));
  }
}
