import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  provideRouter,
  withInMemoryScrolling,
} from '@angular/router';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { provideToastr } from 'ngx-toastr';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { NgMultiSelectDropDownModule } from 'ng-multiselect-dropdown';

import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { configReducer } from './ThemeOptions/store/config.reducer.ngrx';
import { authintercepthor } from './core/guards/auth/authinterceptor';
import { errorInterceptor } from './core/guards/errorInterceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideAnimations(),
    provideToastr(),
    provideStore({ config: configReducer }),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: environment.production,
    }),
    importProvidersFrom(NgMultiSelectDropDownModule.forRoot()),
    provideHttpClient(
      withInterceptors([authintercepthor, errorInterceptor]),
      withXsrfConfiguration({
        cookieName: 'X-CSRF-TOKEN',
        headerName: 'X-CSRF-TOKEN',
      }),
    ),
    provideCharts(withDefaultRegisterables()),
  ],
};
