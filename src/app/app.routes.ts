import { Routes } from '@angular/router';
import { AnalyticsComponent } from './DemoPages/Dashboards/analytics/analytics.component';
import { Component } from '@angular/core';
import { BaseLayoutComponent } from './pages/Layout/base-layout/base-layout.component';


export const routes: Routes = [
    {
    path:'',
    component:BaseLayoutComponent,
    children:[
        {path:'',redirectTo:'/dashboards/analytics',pathMatch:'full'},
        {path:'dashboards/analytics',component:AnalyticsComponent,data:{extraParameter: 'dashboardsMenu'}}
    ]
    }
];
