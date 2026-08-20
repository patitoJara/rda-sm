import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';

import { TokenService } from '../../services/token.service';
import { SessionService } from '../services/session.service';
import { TimeService } from '../services/time.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const tokenService = inject(TokenService);
  const sessionService = inject(SessionService);
  const timeService = inject(TimeService);

  const token = tokenService.getAccessToken();

  /**
   * Sin access token no existe una sesión autenticada.
   *
   * La limpieza y navegación quedan centralizadas
   * en SessionService.
   */
  if (!token) {
    sessionService.invalidateSession(state.url);
    return false;
  }

  const expiration = tokenService.getTokenExpiration();

  /**
   * Un token sin expiración asociada se considera
   * un contexto de autenticación inconsistente.
   */
  if (!expiration) {
    sessionService.invalidateSession(state.url);
    return false;
  }

  const synchronized = await timeService.loadServerTime();

  /**
   * Solo rechazamos el token por fecha cuando contamos
   * con una hora confiable obtenida desde el servidor.
   *
   * Si el backend está temporalmente caído, no usamos
   * la hora posiblemente incorrecta del computador para
   * destruir una sesión que podría seguir siendo válida.
   */
  if (synchronized && expiration <= timeService.nowMs()) {
    sessionService.invalidateSession(state.url);
    return false;
  }

  return true;
};