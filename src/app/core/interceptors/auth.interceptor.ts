// src/app/core/interceptors/auth.interceptor.ts

import {
  HttpErrorResponse,
  HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import {
  ReplaySubject,
  catchError,
  finalize,
  switchMap,
  take,
  throwError,
} from 'rxjs';

import { TokenService } from '../../services/token.service';
import { AuthLoginService } from '../../services/auth.login.service';
import { SessionService } from '../services/session.service';

let isRefreshing = false;

/**
 * Las solicitudes que reciben 401 mientras otra petición está renovando
 * esperan aquí el nuevo access token.
 */
let refreshSubject = new ReplaySubject<string>(1);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthLoginService);
  const sessionService = inject(SessionService);

  const isAuthRequest =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/time/server');

  /**
   * Estas solicitudes pasan directamente:
   * - no agregan access token;
   * - no intentan renovar ante un 401.
   */
  if (isAuthRequest) {
    return next(req);
  }

  const accessToken = tokenService.getAccessToken();

  const authenticatedRequest = accessToken
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    : req;

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      /**
       * Solo un 401 inicia el proceso de renovación.
       *
       * Los errores 0, 502, 503 y 504 continúan hacia el
       * BackendStatusInterceptor sin borrar la sesión.
       */
      if (error.status !== 401) {
        return throwError(() => error);
      }

      const refreshToken = tokenService.getRefreshToken();

      /**
       * Sin refresh token no existe una sesión renovable.
       */
      if (!refreshToken) {
        console.warn(
          '[AuthInterceptor] No hay refresh token disponible.',
        );

        sessionService.invalidateSession();

        return throwError(() => error);
      }

      /**
       * Si ya hay una renovación en curso, esperamos su resultado
       * y repetimos la solicitud con el token nuevo.
       */
      if (isRefreshing) {
        return refreshSubject.pipe(
          take(1),
          switchMap((newAccessToken) => {
            const retryRequest = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newAccessToken}`,
              },
            });

            return next(retryRequest);
          }),
        );
      }

      isRefreshing = true;

      /**
       * Creamos un canal nuevo para esta renovación.
       * Si falla, las solicitudes en espera recibirán el error
       * y no quedarán esperando indefinidamente.
       */
      refreshSubject = new ReplaySubject<string>(1);

      return authService.refresh().pipe(
        switchMap((newAccessToken: string) => {
          if (!newAccessToken) {
            const invalidResponseError = new Error(
              'La renovación no entregó un access token válido.',
            );

            refreshSubject.error(invalidResponseError);
            sessionService.invalidateSession();

            return throwError(() => invalidResponseError);
          }

          /**
           * AuthLoginService.refresh() ya guardó:
           * - access token;
           * - refresh token;
           * - expiración real del JWT.
           *
           * El interceptor solo coordina las solicitudes pendientes.
           */
          refreshSubject.next(newAccessToken);
          refreshSubject.complete();

          const retryRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newAccessToken}`,
            },
          });

          return next(retryRequest);
        }),

        catchError((refreshError: HttpErrorResponse) => {
          /**
           * Liberamos también las solicitudes que estaban esperando.
           */
          refreshSubject.error(refreshError);

          /**
           * Una interrupción temporal del backend o de la red
           * no invalida automáticamente la sesión almacenada.
           */
          if (isBackendUnavailable(refreshError.status)) {
            return throwError(() => refreshError);
          }

          /**
           * El backend rechazó realmente la renovación.
           * En estos casos sí corresponde eliminar los tokens.
           */
          if (
            refreshError.status === 400 ||
            refreshError.status === 401 ||
            refreshError.status === 403
          ) {
            sessionService.invalidateSession();
          }

          return throwError(() => refreshError);
        }),

        finalize(() => {
          isRefreshing = false;
        }),
      );
    }),
  );
};

function isBackendUnavailable(status: number): boolean {
  return [0, 502, 503, 504].includes(status);
}