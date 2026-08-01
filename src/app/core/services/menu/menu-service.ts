import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { GlobalConstant } from '../../constants/global.constants';
import { IMenu } from '../../model/Menu/Menu';
import { ServerQueryRequest, ServerQueryResponse } from '../../model/Common/Pagination/ServerQueryRequest';
import { IApiResponse } from '../../model/Response/ApiResponse';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root',
})

export class MenuService {
  constructor(private http: HttpClient) {}

  GetMenu(request : ServerQueryRequest) : Observable<ServerQueryResponse<IMenu>> {
      return this.http.get<ServerQueryResponse<IMenu>>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.Menu}?GlobalSearch=${request.globalSearch}&PageIndex=${request.page}&PageSize=${request.pageSize}`);
    }

    getMenuById(id: number): Observable<IMenu> {
    return this.http.get<IMenu>(
      `${environment.production}${GlobalConstant.API_END_POINTS.getMenuById}/${id}`
    );
  }

    addMenu(data: IMenu): Observable<Response> {
    // return this.http.post<Response>(`${environment.production}${GlobalConstant.API_END_POINTS.addMenu}`, data);
    return this.http.post<Response>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.addMenu}`, data);

  }
    
    updateMenu(id:number, data: IMenu): Observable<IApiResponse> {
    return this.http.put<IApiResponse>(`${environment.production}${GlobalConstant.API_END_POINTS.updateMenu}/${id}`, data);
    }

    deleteMenu(id: number): Observable<IApiResponse> {
    return this.http.delete<IApiResponse>(`${environment.production}${GlobalConstant.API_END_POINTS.deleteMenu}/${id}`);
    }

    PermissionByType(typeid: number, id: number, status: boolean): Observable<boolean> {
    const url = `${environment.production}${GlobalConstant.API_END_POINTS.PermissionByType}?typeid=${typeid}&id=${id}&status=${status}`;
    return this.http.get<boolean>(url).pipe(
        catchError(error => {
            console.error('Error:', error);
            return throwError(() => error);
        })
    );
  }
}
