import { ChangeDetectionStrategy, Component } from '@angular/core';


import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CodeBlockComponent } from '../code-block/code-block.component';
@Component({
  selector: 'app-docs-home',
  templateUrl: './docs-home.component.html',
  imports: [CommonModule, RouterModule, CodeBlockComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsHomeComponent {
  protected readonly quickStart = `npm install
ng serve        # dev server (Vite) at http://localhost:4200
ng build        # production build`;
}
