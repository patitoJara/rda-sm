import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';

import { provideCharts, withDefaultRegisterables } from 'ng2-charts';

import { routes } from './app.routes';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { backendStatusInterceptor } from './core/interceptors/backend-status.interceptor';
import { loaderInterceptor } from './core/interceptors/loader.interceptor';

import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import { MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { getSpanishPaginatorIntl } from './core/material/paginator-intl';

export const MY_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),

    provideAnimations(),

    provideHttpClient(
      withInterceptors([
        authInterceptor,
        backendStatusInterceptor,
        loaderInterceptor,
      ]),
    ),

    provideMomentDateAdapter(),

    {
      provide: MAT_DATE_LOCALE,
      useValue: 'es-CL',
    },

    
{
      provide: MAT_DATE_FORMATS,
      useValue: MY_FORMATS,
    },

    {
      provide: MatPaginatorIntl,
      useFactory: getSpanishPaginatorIntl,
    },

    provideCharts(withDefaultRegisterables()),
  ],
};