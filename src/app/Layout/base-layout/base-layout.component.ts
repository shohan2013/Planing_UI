import {Component, afterNextRender} from '@angular/core';
import {Observable} from 'rxjs';
import { ConfigService } from '../../ThemeOptions/store/config.service';
import { ConfigState } from '../../ThemeOptions/store/config.state';
import {ThemeOptions} from '../../theme-options';


import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { HeaderComponent } from '../Components/header/header.component';
import { SidebarComponent } from '../Components/sidebar/sidebar.component';
import { FooterComponent } from '../Components/footer/footer.component';
@Component({
  selector: 'app-base-layout',
  templateUrl: './base-layout.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgbModule, FontAwesomeModule, HeaderComponent, SidebarComponent, FooterComponent]
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



