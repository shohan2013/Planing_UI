import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ServerQueryRequest, ServerQueryResponse } from '../../model/Common/Pagination/ServerQueryRequest';
import { Observable } from 'rxjs';
import { GlobalConstant } from '../../constants/global.constants';
import { ISubMenu, ISubMenuView } from '../../model/SubMenu/SubMenu';
import { IApiResponse } from '../../model/Response/ApiResponse';

@Injectable({
  providedIn: 'root',
})

export class SubMenuService {
  constructor(private http: HttpClient) {}

  GetSubMenu(request : ServerQueryRequest) : Observable<ServerQueryResponse<ISubMenuView>> {
      return this.http.get<ServerQueryResponse<ISubMenuView>>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.SubMenu}?GlobalSearch=${request.globalSearch}&PageIndex=${request.page}&PageSize=${request.pageSize}`);
    }

    getSubMenuById(id: number): Observable<ISubMenuView> {
    return this.http.get<ISubMenuView>(
      `${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.getSubMenuById}/${id}`
    );
  }

    addSubMenu(data: ISubMenu): Observable<Response> {
    return this.http.post<Response>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.addSubMenu}`, data);
    }
    
    updateSubMenu(id:number, data: ISubMenu): Observable<IApiResponse> {
    return this.http.put<IApiResponse>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.updateSubMenu}/${id}`, data);
    }

    deleteSubMenu(id: number): Observable<IApiResponse> {
    return this.http.delete<IApiResponse>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.deleteSubMenu}/${id}`);
    }
}
