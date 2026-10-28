import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { ServerQueryRequest, ServerQueryResponse } from 'src/app/core/model/Common/Pagination/ServerQueryRequest';
import { IViewRequisitionHeader, IViewRequisitionLine } from 'src/app/core/model/Requisition/ViewRequisition';

export interface IRequisitionApprovalResult {
  Status: boolean;
  Message: string;
}

@Injectable({
  providedIn: 'root',
})
export class RequisitionApprovalService {
  GetRequisition(request: ServerQueryRequest, unitId: number, businessId: number): Observable<ServerQueryResponse<IViewRequisitionHeader>> {
    // Connect the approval list API here later.
    return throwError(() => new Error('The requisition approval API has not been connected yet.'));
  }

  GetLinesByReqId(reqId: number): Observable<IViewRequisitionLine[]> {
    // Connect the approval lines API here later.
    return of([]);
  }

  completeData(reqId: number): Observable<IRequisitionApprovalResult> {
    // Connect the approval Complete API here later.
    return of({
      Status: false,
      Message: 'The Complete API has not been connected yet.',
    });
  }
}