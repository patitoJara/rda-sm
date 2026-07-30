// ✅ src/main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

import { registerLocaleData } from '@angular/common';
import localeEsCL from '@angular/common/locales/es-CL';

// Locale Angular
registerLocaleData(localeEsCL);

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    const splash = document.querySelector('app-splash');
    if (splash) {
      setTimeout(() => splash.classList.add('hide'), 1800);
      setTimeout(() => splash.remove(), 2500);
    }
  })
  .catch((err) => console.error(err));