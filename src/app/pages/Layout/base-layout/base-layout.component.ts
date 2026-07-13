import {Component, afterNextRender} from '@angular/core';
import {Observable} from 'rxjs';
import { ConfigService } from '../../ThemeOptions/store/config.service';
import { ConfigState } from '../../ThemeOptions/store/config.state';
import {ThemeOptions} from '../../../theme-options';
import { FooterComponent } from '../Components/footer/footer.component';
import { HeaderComponent } from '../Components/header/header.component';
import { SidebarComponent } from '../Components/sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-base-layout',
  templateUrl: './base-layout.component.html',
  standalone: true,
  imports:[FooterComponent,HeaderComponent,SidebarComponent,RouterOutlet,CommonModule]
})
export class BaseLayoutComponent {

  public config$: Observable<ConfigState>;

  constructor(
    public globals: ThemeOptions,
    private configService: ConfigService
  ) {
    this.config$ = this.configService.config$;

    afterNextRender(() => {
      const bootstrap = typeof window !== 'undefined' ? window.bootstrap : undefined;
      if (bootstrap) {
        const tooltipTriggers = document.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggers.forEach(el => new bootstrap.Tooltip(el));
      }

      document.body.classList.add('animations-ready');
    });
  }

  toggleSidebarMobile() {
    this.globals.toggleSidebarMobile.set(!this.globals.toggleSidebarMobile());
  }
}



