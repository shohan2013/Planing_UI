import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { IViewApprovalGroup } from '../../model/ApproveMatrixGroup/ViewApproveMatrixGroup';
import { Observable } from 'rxjs';
import { GlobalConstant } from '../../constants/global.constants';
import { ApproveMatrixGroupSave } from '../../model/ApproveMatrixGroup/ApproveMatrixGroupSave';
import { IApiResponse } from '../../model/Response/ApiResponse';

@Injectable({
  providedIn: 'root',
})
export class ApprovematrixGroupservice {
  constructor(private http:HttpClient){}

   GetApproveMatrixGroup(unitid: number,submenuid : number) : Observable<IViewApprovalGroup[]> {
        return this.http.get<IViewApprovalGroup[]>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.ApproveMatrixGroup}/${unitid}/${submenuid}`);
   }

    addData(data: ApproveMatrixGroupSave): Observable<IApiResponse> {
      return this.http.post<IApiResponse>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.ApproveMatrixGroup}`, data);
     }
}
