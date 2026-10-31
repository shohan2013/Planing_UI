import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GlobalConstant } from '../../constants/global.constants';
import { ServerQueryRequest, ServerQueryResponse, } from '../../model/Common/Pagination/ServerQueryRequest';

import { environment } from 'src/environments/environment';
import { IRequisitionApprovalDetails, IRequisitionApprovalHeader } from '../../model/RequisitionApproval/requisition-approval.model';

@Injectable({
  providedIn: 'root',
})
export class RequisitionApprovalService {constructor(private http: HttpClient) {}

  GetData(request: ServerQueryRequest, enroll: number, statusCode: string, unitId: number | null, businessId: number,): Observable<ServerQueryResponse<IRequisitionApprovalHeader>> {
    const params = {
      enroll,
      statusCode,
      unitId,
      businessId,
      globalSearch: request.globalSearch ?? '',
      pageIndex: request.page,
      pageSize: request.pageSize,
    };

    return this.http.post<ServerQueryResponse<IRequisitionApprovalHeader>>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.RequisitionApproval}`, params,);
  }

  GetDetails(reqId: number, docStatus: string,): Observable<IRequisitionApprovalDetails> {
    const params = {
      reqID: reqId,
      docStatus,
    };

    return this.http.post<IRequisitionApprovalDetails>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.RequisitionApprovalDetails}`, params,);
  }
}