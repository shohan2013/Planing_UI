import { ChangeDetectionStrategy, Component } from '@angular/core';


import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CodeBlockComponent } from '../code-block/code-block.component';
@Component({
  selector: 'app-docs-layout-system',
  templateUrl: './layout-system.component.html',
  imports: [CommonModule, RouterModule, CodeBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutSystemComponent {
  protected readonly routing = `const routes: Routes = [
  {
    path: '',
    component: BaseLayoutComponent,   // dashboard shell
    children: [
      { path: 'dashboards/analytics', component: AnalyticsComponent },
      // …more dashboard pages
    ],
  },
  {
    path: '',
    component: PagesLayoutComponent,  // minimal auth shell
    children: [
      { path: 'pages/login-boxed', component: LoginBoxedComponent },
    ],
  },
];`;

  protected readonly signals = `// theme-options.ts — shared UI state as signals
@Injectable({ providedIn: 'root' })
export class ThemeOptions {
  sidebarHover = signal(false);
  toggleSidebar = signal(false);
  toggleSidebarMobile = signal(false);
  toggleHeaderMobile = signal(false);
  toggleFixedFooter = signal(false);
}

// Read with x(), write with x.set(...)
this.globals.toggleSidebar.set(!this.globals.toggleSidebar());`;
}
