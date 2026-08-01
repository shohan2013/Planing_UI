import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ServerQueryRequest, ServerQueryResponse } from '../../model/Common/Pagination/ServerQueryRequest';
import { Observable } from 'rxjs';
import { GlobalConstant } from '../../constants/global.constants';
import { ISubMenu, ISubMenuView } from '../../model/SubMenu/SubMenu';
import { IApiResponse } from '../../model/Response/ApiResponse';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})

export class SubMenuService {
  constructor(private http: HttpClient) {}

  GetSubMenu(request : ServerQueryRequest) : Observable<ServerQueryResponse<ISubMenuView>> {
      return this.http.get<ServerQueryResponse<ISubMenuView>>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.SubMenu}?GlobalSearch=${request.globalSearch}&PageIndex=${request.page}&PageSize=${request.pageSize}`);
    }

    getSubMenuById(id: number): Observable<ISubMenuView> {
    return this.http.get<ISubMenuView>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.getSubMenuById}/${id}`
    );
  }

    addSubMenu(data: ISubMenu): Observable<Response> {
    return this.http.post<Response>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.addSubMenu}`, data);
    }
    
    updateSubMenu(id:number, data: ISubMenu): Observable<IApiResponse> {
    return this.http.put<IApiResponse>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.updateSubMenu}/${id}`, data);
    }

    deleteSubMenu(id: number): Observable<IApiResponse> {
    return this.http.delete<IApiResponse>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.deleteSubMenu}/${id}`);
    }
}
