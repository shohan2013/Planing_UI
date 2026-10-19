import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalConstant } from '../../../constants/global.constants';
import { ProductionBOMHeader } from '../../../model/MasterConfiguration/BOM/BOM';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class BomService {constructor(private readonly http: HttpClient) {}

  getHeaders(fgItemId: number, unitId: number, businessId: number): Observable<ProductionBOMHeader[]> {
    const params = new HttpParams()
      .set('FGItemId', fgItemId)
      .set('UnitId', unitId)
      .set('BusinessId', businessId);

    return this.http.get<ProductionBOMHeader[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.getBoMHeaders}`, { params }
    );
  }
}