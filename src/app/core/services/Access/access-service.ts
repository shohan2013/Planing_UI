import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { GlobalConstant } from '../../constants/global.constants';
import { IPermission } from '../../model/Permission/Permission';

@Injectable({
  providedIn: 'root',
})
export class AccessService {
  constructor(private http: HttpClient) {}

  Permission(enroll: string) : Observable<IPermission[]> {
      return this.http.get<any>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.PermissionByEnroll}/${enroll}`);
    }

  PermissionByType(typeid: number, id: number,submenuid:number,enroll:number, status: boolean): Observable<boolean> {
  const url = `${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.PermissionByType}?typeid=${typeid}&id=${id}&submenuid=${submenuid}&enroll=${enroll}&createdby=${localStorage.getItem('Enroll')}&status=${status}`;
  return this.http.get<boolean>(url).pipe(
      catchError(error => {
          return throwError(() => error);
      })
  );
}
}
