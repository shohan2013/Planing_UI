# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Planning UI: an Angular 21 (zoneless) admin app built on the ArchitectUI template (Bootstrap 5, Chart.js, NgRx). It is fully **standalone-component based** (no NgModules) and talks to a backend API (`API_URL` in `src/environments/environment*.ts`, dev: `https://localhost:7111/api/`). Business features: requisition, planning, merged planning, planning history, sales order, machine dashboard, approval matrix, and menu/sub-menu/permission/access administration.

## Common Commands

```bash
ng serve                    # Dev server at http://localhost:4200
ng build                    # Production build
npm run build:prod          # Build with base-href /architectui-angular-free/
ng test                     # Unit tests via Karma (zoneless)
ng lint                     # ESLint
ng generate component <name> # Standalone component by default (angular.json schematics)
```

## Architecture

### Bootstrap and routing

- `src/main.ts` calls `bootstrapApplication(AppComponent, appConfig)`; there is no `app.module.ts`.
- `src/app/app.config.ts` holds all providers: router, animations, toastr, NgRx store + devtools, `provideHttpClient` (interceptors `authintercepthor`, `errorInterceptor`; XSRF header `X-CSRF-TOKEN`), and `provideCharts`.
- `src/app/app.routes.ts` defines `routes`. The main branch uses `BaseLayoutComponent` with `canActivateChild: [permissionGuard]`; auth pages use `PagesLayoutComponent`. Business pages use `loadComponent` (lazy); `/docs` uses `loadChildren` from `docs/docs.routes.ts`.
- `components.barrel.ts` re-exports the template demo page components imported by the routes.

### Directory layout (`src/app/`)

- `Layout/` - `base-layout`, `pages-layout`, and `Components/` (header, sidebar, footer, page-title).
- `pages/` - Business feature pages (Requisition, Planning, MergedPlanning, PlanningHistory, SalesOrder, Machine, Menu, SubMenu, Permission, Access, ApprovalMatrix, permission-required). Files are named `<name>.ts/.html/.scss` (no `.component` suffix).
- `DemoPages/` - Original ArchitectUI template demos (Charts, Components, Dashboards, Elements, Forms, Tables, UserPages, Widgets). Keep separate from business code.
- `core/` - `services/` (one folder per API domain), `model/` (interfaces per domain), `guards/auth/` (`authinterceptor`, `permission.guard`), `guards/errorInterceptor.ts`, `directives/menu-permission.directive.ts`, `constants/global.constants.ts`, and base classes `base-paginated-table` / `server-side-filtered-paginated`.
- `shared/` - `pagination` and `pipes`.
- `CustomValidators/` - reusable form validators.
- `docs/` - In-app documentation section with its own layout and routes.
- `ThemeOptions/store/` - NgRx theme state.

### State Management

NgRx store (root key `config`) manages theme configuration only: `ThemeOptions/store/config.state.ts` (`headerTheme`, `sidebarTheme`), `config.reducer.ngrx.ts`, `config.actions.ngrx.ts`, and `config.service.ts` (wrapper for components). Business/page state lives in component signals and services, not the store.

### Auth and permissions

Requests go through `authintercepthor` (auth header) and `errorInterceptor`. Route access is enforced by `permissionGuard`; unauthorized users land on `permission-required`. `menu-permission.directive.ts` gates UI elements by permission. Sidebar menus come from the `SideBar` service/model.

### Styling

- SCSS with Bootstrap 5 customizations in `src/assets/components/bootstrap5/`
- Global styles in `src/styles.scss` and `src/assets/base.scss`
- Bootstrap JS is imported in `main.ts` (`import 'bootstrap'`)

## Key Technical Notes

- **Angular 21 zoneless**: no zone.js; `main.ts` does not call `provideZoneChangeDetection`.
- All components are **standalone** and declare their own `imports`. Do not add NgModules.
- Use signals (`signal()`, `computed()`) for state that drives the UI; see `pages/Machine/machine-dashboard/machine-dashboard.ts` for the pattern.
- Use `afterNextRender()` instead of `setTimeout()` for DOM operations.
- Templates use control flow (`@if`, `@for`) instead of `*ngIf`, `*ngFor`.
- Charts use ng2-charts with Chart.js v4; other UI libs: ng-bootstrap, ng-select, ng-multiselect-dropdown, ngx-toastr, FontAwesome.
- Imports may use the `src/app/...` absolute path (e.g. `permissionGuard`) as well as relative paths.
- TypeScript strict mode is disabled (`strict: false`).
- Angular animations are disabled in BaseLayoutComponent to prevent layout jumping.
