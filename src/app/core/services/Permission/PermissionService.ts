import { HttpClient, HttpParams } from '@angular/common/http';
import { DestroyRef, inject, Injectable, OnInit } from '@angular/core';
import { catchError, Observable, of, shareReplay, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GlobalConstant } from '../../constants/global.constants';
import { IPermission } from '../../model/Permission/Permission';


@Injectable({
  providedIn: 'root',
})

export class PermissionService{

  

}

