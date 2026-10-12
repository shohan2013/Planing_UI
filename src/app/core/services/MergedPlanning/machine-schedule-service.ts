import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalConstant } from '../../constants/global.constants';
import {
  IMachineJob,
  IMachineJobsRequest,
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
    const params = new HttpParams()
      .set('businessFlowConfigureId', request.BusinessFlowConfigureId)
      .set('machineId', request.MachineId)
      .set('startDate', request.StartDate)
      .set('endDate', request.EndDate);
    return this.http
      .get<IMachineJob[] | null>(
        `${environment.API_URL}${GlobalConstant.API_END_POINTS.MachineJobs}`,
        { params },
      )
      .pipe(map((jobs) => jobs ?? []));
  }
}
