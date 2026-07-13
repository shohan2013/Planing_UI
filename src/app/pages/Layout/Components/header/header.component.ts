import {Component, HostBinding} from '@angular/core';
import {Observable} from 'rxjs';
import { ConfigService } from '../../../ThemeOptions/store/config.service';
import { ConfigState } from '../../../ThemeOptions/store/config.state';
import { faEllipsisV } from '@fortawesome/free-solid-svg-icons';
import {ThemeOptions} from '../../../../theme-options';
import { CommonModule } from '@angular/common';
import { SearchBoxComponent } from './elements/search-box/search-box.component';
import { UserBoxComponent } from './elements/user-box/user-box.component';
import { SHARED_COMPONENTS } from '../../../../shared/SharedComponent/SharedComponent';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.scss',
  standalone: true,
  imports:[...SHARED_COMPONENTS]})

export class HeaderComponent {

  faEllipsisV = faEllipsisV;

  public config$: Observable<ConfigState>;

  constructor(
    public globals: ThemeOptions,
    private configService: ConfigService
  ) {
    this.config$ = this.configService.config$;
  }

  @HostBinding('class.isActive')
  get isActiveAsGetter() {
    return this.isActive;
  }

  isActive = false;


  toggleSidebar() {
    this.globals.toggleSidebar.set(!this.globals.toggleSidebar());
    if (this.globals.toggleSidebar()) {
      this.globals.sidebarHover.set(false);
    }
  }

  toggleSidebarMobile() {
    this.globals.toggleSidebarMobile.set(!this.globals.toggleSidebarMobile());
  }

  toggleHeaderMobile() {
    this.globals.toggleHeaderMobile.set(!this.globals.toggleHeaderMobile());
  }

}
