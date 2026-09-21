import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import 'bootstrap';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

// Angular 21 is zoneless by default - no provideZoneChangeDetection() needed
bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
