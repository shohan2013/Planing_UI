import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GlobalConstant } from '../../constants/global.constants';
import { HttpClient } from '@angular/common/http';
import { IViewApproveMatrixEntity } from '../../model/ApproveMatrix/ViewApproveMatrix';
import { ApproveMatrixSave } from '../../model/ApproveMatrix/ApproveMatrixSave';
import { IApiResponse } from '../../model/Response/ApiResponse';
import { ApproveMatrixPermissionUpdate } from '../../model/ApproveMatrix/ApproveMatrixPermissionUpdate';

@Injectable({
  providedIn: 'root',
})
export class ApproveMatrixService {
  constructor(private http: HttpClient) {}

  GetApproveMatrix(enroll: string): Observable<IViewApproveMatrixEntity[]> {
    return this.http.get<IViewApproveMatrixEntity[]>(
      `${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.ApproveMatrix}/${enroll}`,
    );
  }

  ProvideApproveMatrix(
    id: number,
    data: ApproveMatrixPermissionUpdate,
  ): Observable<IApiResponse> {
    const url = `${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.ProvideApproveMatrix}/${id}`;
    return this.http.patch<IApiResponse>(url, data);
  }

  addData(data: ApproveMatrixSave): Observable<IApiResponse> {
    return this.http.post<IApiResponse>(
      `${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.ApproveMatrix}`,
      data,
    );
  }
}
