import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { BackendStatusService } from '../services/backend-status.service';

export const backendStatusInterceptor: HttpInterceptorFn = (req, next) => {
  const backendStatusService = inject(BackendStatusService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const status = Number(error?.status ?? -1);

      const backendUnavailable = [0, 502, 503, 504].includes(status);

      if (backendUnavailable) {
        backendStatusService.showBackendUnavailable();
      }

      /*
       * El interceptor solamente informa la caída.
       * El error debe continuar hacia el componente o servicio
       * que realizó la petición.
       */
      return throwError(() => error);
    }),
  );
};