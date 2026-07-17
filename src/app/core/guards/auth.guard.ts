import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TokenService } from '../../services/token.service';
import { TimeService } from '../services/time.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const tokenService = inject(TokenService);
  const timeService = inject(TimeService);
  const router = inject(Router);

  const token = tokenService.getAccessToken();

  if (!token) {
    await router.navigate(['/auth/login'], {
      queryParams: {
        returnUrl: state.url,
      },
      replaceUrl: true,
    });

    return false;
  }

  const expiration = tokenService.getTokenExpiration();

  if (!expiration) {
    tokenService.clear();

    await router.navigate(['/auth/login'], {
      queryParams: {
        returnUrl: state.url,
      },
      replaceUrl: true,
    });

    return false;
  }

  const synchronized = await timeService.loadServerTime();

  /**
   * Solo rechazamos el token por fecha cuando contamos
   * con una hora confiable obtenida desde el servidor.
   *
   * Si el backend está temporalmente caído, no usamos
   * la hora posiblemente incorrecta del computador.
   */
  if (synchronized && expiration <= timeService.nowMs()) {
    tokenService.clear();

    await router.navigate(['/auth/login'], {
      queryParams: {
        returnUrl: state.url,
      },
      replaceUrl: true,
    });

    return false;
  }

  return true;
};