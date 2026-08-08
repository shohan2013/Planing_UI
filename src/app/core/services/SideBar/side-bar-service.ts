import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalConstant } from 'src/app/core/constants/global.constants';
import { ISideBarMenu } from 'src/app/core/model/SideBar/SideBar';
import { environment } from 'src/environments/environment';


@Injectable({
  providedIn: 'root'
})
export class SideBarService {

  constructor(private http: HttpClient) { }

  GetSideBarData(enroll: number): Observable<ISideBarMenu[]> {
    return this.http.get<ISideBarMenu[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.SideBar}/${enroll}`
    );
  }
}

