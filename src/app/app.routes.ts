import { Routes } from '@angular/router';
import { AnalyticsComponent } from './DemoPages/Dashboards/analytics/analytics.component';
import { Component } from '@angular/core';
import { BaseLayoutComponent } from './pages/Layout/base-layout/base-layout.component';
import { Requisition } from './pages/Requisition/requisition';


export const routes: Routes = [
    {
    path:'',
    component:BaseLayoutComponent,
    children:[
        {path:'',redirectTo:'requisition',pathMatch:'full'},
        {path:'requisition',component:Requisition,data:{extraParameter: 'dashboardsMenu'}}
    ]
    }
];


