import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GlobalConstant } from '../../constants/global.constants';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})

export class LoginService {
  http=inject(HttpClient);

  Login(user: any) : Observable<any> {
    return this.http.post<any>(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.LOGIN}`,user);
  }

  Logout() : Observable<any> {
    return this.http.post(`${GlobalConstant.URL.API_URL}${GlobalConstant.API_END_POINTS.LOGOUT}`,{});
  }


}

