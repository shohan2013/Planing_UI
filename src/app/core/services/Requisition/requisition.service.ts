import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { GlobalConstant } from 'src/app/core/constants/global.constants';
import { IRequisition } from 'src/app/core/model/Requisition/Requisition';

import { ServerQueryRequest, ServerQueryResponse } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';

@Injectable({
  providedIn: 'root'
})
export class RequisitionService {

  constructor(private http: HttpClient) {}

GetRequisition(request:ServerQueryRequest,unitId:number = 0): Observable<ServerQueryResponse<IRequisition>> {
  return this.http.get<ServerQueryResponse<IRequisition>>(
    `${environment.API_URL}${GlobalConstant.API_END_POINTS.getRequisition}?GlobalSearch=${request.globalSearch}&UnitId=${unitId}&PageIndex=${request.page}&PageSize=${request.pageSize}`
  );
}

  addData(model: IRequisition): Observable<any> {
    return this.http.post(
      environment.API_URL + GlobalConstant.API_END_POINTS.addRequisition,
      model
    );
  }

  updateData(model: IRequisition): Observable<any> {
    console.log("REQ CREATE",model);
    return this.http.put(environment.API_URL + GlobalConstant.API_END_POINTS.updateRequisition,model);
  
  }

  deleteData(reqId: number): Observable<any> {
    return this.http.delete(
      environment.API_URL + GlobalConstant.API_END_POINTS.deleteRequisition + reqId
    );
  }



}