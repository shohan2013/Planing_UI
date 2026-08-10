import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { GlobalConstant } from 'src/app/core/constants/global.constants';
import { IRequisition } from 'src/app/core/model/Requisition/Requisition';

import { ServerQueryRequest, ServerQueryResponse } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';

import { IViewRequisitionHeader, IViewRequisitionLine } from 'src/app/core/model/Requisition/ViewRequisition';

@Injectable({
  providedIn: 'root'
})
export class RequisitionService {

  constructor(private http: HttpClient) {}

// GetRequisition(request:ServerQueryRequest,unitId:number = 0): Observable<ServerQueryResponse<IRequisition>> {
//   return this.http.get<ServerQueryResponse<IRequisition>>(
//     `${environment.API_URL}${GlobalConstant.API_END_POINTS.getRequisition}?GlobalSearch=${request.globalSearch}&UnitId=${unitId}&PageIndex=${request.page}&PageSize=${request.pageSize}`
//   );
// }


GetRequisition(request: ServerQueryRequest, unitId: number = 0, businessId: number = 0): Observable<ServerQueryResponse<IViewRequisitionHeader>> {
return this.http.get<ServerQueryResponse<IViewRequisitionHeader>>(
`${environment.API_URL}${GlobalConstant.API_END_POINTS.getRequisition}?GlobalSearch=${request.globalSearch}&UnitId=${unitId}&BusinessId=${businessId}&PageIndex=${request.page}&PageSize=${request.pageSize}`
);
}

GetLinesByReqId(reqId: number): Observable<IViewRequisitionLine[]> {
return this.http.get<IViewRequisitionLine[]>(
`${environment.API_URL}${GlobalConstant.API_END_POINTS.getRequisitionLines}?ReqID=${reqId}`
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
    const enroll = Number(localStorage.getItem('Enroll'));

    const requestBody = {
      reqId,
      enroll,
    };

    //return this.http.put(`${environment.API_URL}${GlobalConstant.API_END_POINTS.deleteRequisition}`, requestBody);
  
      return this.http.put(
        environment.API_URL+GlobalConstant.API_END_POINTS.deleteRequisition,
         requestBody
        );

  }


}