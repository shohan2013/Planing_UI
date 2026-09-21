import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

import { GlobalConstant } from '../../constants/global.constants';
import { IMachineDashboardData } from '../../model/MachineDashboard/machine-dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class MachineDashboardService {
  constructor(private readonly http: HttpClient) {}

  GetMachineUtilization(
    unitId: number,
    businessId: number,
    fromDate: string,
    toDate: string,
  ): Observable<IMachineDashboardData> {
    const params = new HttpParams()
      .set('UnitId', unitId)
      .set('BusinessId', businessId)
      .set('FromDate', fromDate)
      .set('ToDate', toDate);

    return this.http.get<IMachineDashboardData>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.MachineUtilization}`,
      { params },
    );
  }
}
