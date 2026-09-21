import { ChangeDetectionStrategy, Component } from '@angular/core';


import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CodeBlockComponent } from '../code-block/code-block.component';
@Component({
  selector: 'app-docs-getting-started',
  templateUrl: './getting-started.component.html',
  imports: [CommonModule, RouterModule, CodeBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GettingStartedComponent {
  protected readonly install = `npm install`;
  protected readonly serve = `ng serve`;
  protected readonly build = `# Production build (production is the default configuration)
ng build

# Production build for subdirectory deployment (sets base-href)
npm run build:prod`;
  protected readonly quality = `ng test     # unit tests via Karma (zoneless)
ng lint     # ESLint flat config`;
  protected readonly generate = `ng generate component DemoPages/Dashboards/my-dashboard`;
}
