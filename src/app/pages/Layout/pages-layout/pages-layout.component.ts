import { Component } from '@angular/core';
import { SHARED_COMPONENTS } from '../../../shared/SharedComponent/SharedComponent';

@Component({
  selector: 'app-pages-layout',
  templateUrl: './pages-layout.component.html',
  standalone: true,
  imports:[SHARED_COMPONENTS]
})
export class PagesLayoutComponent {}
