import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { BaseLayoutComponent } from './Layout/base-layout/base-layout.component';
import { PagesLayoutComponent } from './Layout/pages-layout/pages-layout.component';

// Import all components from barrel file
import {
  // Dashboard components
  AnalyticsComponent,

  // Elements components
  StandardComponent,
  DropdownsComponent,
  CardsComponent,
  ListGroupsComponent,
  TimelineComponent,
  IconsComponent,

  // Components
  AccordionsComponent,
  TabsComponent,
  CarouselComponent,
  ModalsComponent,
  ProgressBarComponent,
  TooltipsPopoversComponent,

  // Form components
  ControlsComponent,
  LayoutComponent,

  // Table components
  RegularComponent,
  TablesMainComponent,

  // Widget components
  ChartBoxes3Component,

  // User pages components
  ForgotPasswordBoxedComponent,
  LoginBoxedComponent,
  RegisterBoxedComponent,

  // Chart components
  ChartjsComponent,
} from './components.barrel';
import { authGuard } from './core/guards/auth/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: BaseLayoutComponent,
    children: [
      // Dashboards
      //{path: 'pages/login-boxed', component: LoginBoxedComponent, data: {extraParameter: ''}},
      { path: '', redirectTo: '/pages/login-boxed', pathMatch: 'full' },
      {
        path: 'dashboards/analytics',
        component: AnalyticsComponent,
        data: { extraParameter: 'dashboardsMenu' },
      },
      {
        path: '',
        component: AnalyticsComponent,
        data: { extraParameter: 'dashboardsMenu' },
      },

      {
        path: 'permission',
        loadComponent: () =>
          import('./pages/Permission/permission/permission').then(
            (m) => m.Permission,
          ),
      },
      {
        path: 'groupassign',
        loadComponent: () =>
          import('./pages/ApprovalMatrix/CreateGroupAssign/group-assign/group-assign').then(
            (m) => m.GroupAssign,
          ),
      },

      {
        path: 'requisition',
        loadComponent: () =>
          import('./pages/Requisition/requisition').then((m) => m.Requisition),
      },

      // Elements
      {
        path: 'elements/buttons-standard',
        component: StandardComponent,
        data: { extraParameter: 'elementsMenu' },
      },
      {
        path: 'elements/dropdowns',
        component: DropdownsComponent,
        data: { extraParameter: 'elementsMenu' },
      },
      {
        path: 'elements/icons',
        component: IconsComponent,
        data: { extraParameter: 'elementsMenu' },
      },
      {
        path: 'elements/cards',
        component: CardsComponent,
        data: { extraParameter: 'elementsMenu' },
      },
      {
        path: 'elements/list-group',
        component: ListGroupsComponent,
        data: { extraParameter: 'elementsMenu' },
      },
      {
        path: 'elements/timeline',
        component: TimelineComponent,
        data: { extraParameter: 'elementsMenu' },
      },

      // Components
      {
        path: 'components/tabs',
        component: TabsComponent,
        data: { extraParameter: 'componentsMenu' },
      },
      {
        path: 'components/accordions',
        component: AccordionsComponent,
        data: { extraParameter: 'componentsMenu' },
      },
      {
        path: 'components/carousel',
        component: CarouselComponent,
        data: { extraParameter: 'componentsMenu' },
      },
      {
        path: 'components/modals',
        component: ModalsComponent,
        data: { extraParameter: 'componentsMenu' },
      },
      {
        path: 'components/progress-bar',
        component: ProgressBarComponent,
        data: { extraParameter: 'componentsMenu' },
      },
      {
        path: 'components/tooltips-popovers',
        component: TooltipsPopoversComponent,
        data: { extraParameter: 'componentsMenu' },
      },

      // Charts
      {
        path: 'charts/chartjs',
        component: ChartjsComponent,
        data: { extraParameter: 'chartsMenu' },
      },

      // Forms
      {
        path: 'forms/controls',
        component: ControlsComponent,
        data: { extraParameter: 'formsMenu' },
      },
      {
        path: 'forms/layouts',
        component: LayoutComponent,
        data: { extraParameter: 'formsMenu' },
      },

      // Tables
      {
        path: 'tables/regular',
        component: RegularComponent,
        data: { extraParameter: 'tablesMenu' },
      },
      {
        path: 'tables/bootstrap',
        component: TablesMainComponent,
        data: { extraParameter: 'tablesMenu' },
      },

      // Widgets
      {
        path: 'widgets/chart-boxes-3',
        component: ChartBoxes3Component,
        data: { extraParameter: 'widgetsMenu' },
      },
    ],
  },
  {
    path: '',
    component: PagesLayoutComponent,
    children: [
      // User Pages
      {
        path: 'pages/login-boxed',
        component: LoginBoxedComponent,
        data: { extraParameter: '' },
      },
      {
        path: 'pages/register-boxed',
        component: RegisterBoxedComponent,
        data: { extraParameter: '' },
      },
      {
        path: 'pages/forgot-password-boxed',
        component: ForgotPasswordBoxedComponent,
        data: { extraParameter: '' },
      },
    ],
  },
  {
    // Documentation section — lazy-loaded so it stays out of the initial bundle
    path: 'docs',
    loadChildren: () => import('./docs/docs.module').then((m) => m.DocsModule),
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      scrollPositionRestoration: 'enabled',
      anchorScrolling: 'enabled',
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
