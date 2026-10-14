import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { IMasterConfigurationFG } from 'src/app/core/model/MasterConfiguration/MasterConfigurationFG';
import { ServerQueryRequest, ServerQueryResponse } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { GlobalConstant } from '../../constants/global.constants';
import { environment } from 'src/environments/environment';
// Copy the environment and GlobalConstant imports from requisition.service.ts.

@Injectable({
  providedIn: 'root',
})
export class MasterConfigurationService {
  constructor(private readonly http: HttpClient) {}

  GetFGs( request: ServerQueryRequest, unitId: number, businessId: number,): Observable<ServerQueryResponse<IMasterConfigurationFG>> {
    const params = new HttpParams()
      .set('UnitId', unitId)
      .set('BusinessId', businessId)
      .set('GlobalSearch', request.globalSearch ?? '')
      .set('PageIndex', request.page)
      .set('PageSize', request.pageSize);

    console.log('GetFGs request params:', params.toString()); 

    return this.http.get<ServerQueryResponse<IMasterConfigurationFG>>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.MasterConfigurationFGs}`,{ params },);
  }
}