import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalConstant } from '../../../constants/global.constants';
import { ProductionBOMHeader } from '../../../model/MasterConfiguration/BOM/BOM-model';
import { environment } from 'src/environments/environment';
import { ProductionBOMLinesResponse } from 'src/app/core/model/MasterConfiguration/BOM/BOM-lines-model';
import { BoMItem } from 'src/app/core/model/MasterConfiguration/BOM/BOM-item-model';
import { ProductionMaterialUoM } from 'src/app/core/model/MasterConfiguration/BOM/ProductionMaterial-UoM-model';

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





  getLines(boMId: number): Observable<ProductionBOMLinesResponse> {
    const params = new HttpParams().set('BoMId', boMId);

    return this.http.get<ProductionBOMLinesResponse>(
        `${environment.API_URL}${GlobalConstant.API_END_POINTS.getBoMLines}`,
        { params }
    );
    }

  deleteData(boMId: number): Observable<unknown> {
      const enroll = Number(localStorage.getItem('Enroll'));

      if (!Number.isInteger(enroll) || enroll <= 0) {
          throw new Error('Valid employee Enroll not found in localStorage.');
      }

      return this.http.put<unknown>(`${environment.API_URL}${GlobalConstant.API_END_POINTS.deleteBoM}`, {BoMId: boMId,Enroll: enroll,});
  }


  getItems(unitId: number, warehouseId: number, search: string): Observable<BoMItem[]> {
    const params = new HttpParams()
      .set('UnitId', unitId)
      .set('WarehouseID', warehouseId)
      .set('GlobalSearch', search);

    return this.http.get<BoMItem[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.getBoMItems}`,
      { params }
    );
  }

  getProductionMaterialUoM(itemId: number, warehouseId: number, unitId: number): Observable<ProductionMaterialUoM[]> {
    const params = new HttpParams()
      .set('ItemID', itemId)
      .set('WarehouseID', warehouseId)
      .set('UnitID', unitId);

    return this.http.get<ProductionMaterialUoM[]>(
      `${environment.API_URL}${GlobalConstant.API_END_POINTS.getProductionMaterialUoM}`,
      { params }
    );
  }



}