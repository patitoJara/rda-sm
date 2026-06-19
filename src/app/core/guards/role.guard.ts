import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../../services/token.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  const userRoles = tokenService.getUserRoles(); // ['ADMIN', 'OPERADOR', ...]
  const activeRole = (tokenService.getActiveRole() || '').toUpperCase();
  const allowedRoles = (route.data?.['roles'] as string[] | undefined)?.map(
    (r) => r.toUpperCase(),
  );

  // 🔹 Permitir siempre la vista "about"
  if (state.url.includes('/about')) return true;

  // 🔹 Si no hay rol activo → volver a elegir rol
  if (!activeRole) {
    console.warn(
      '[roleGuard] ❌ No hay rol activo. Redirigiendo al inicio para seleccionar rol/programa.',
    );

    router.navigate(['/inicio']);
    return false;
  }

  // 🔹 Si la ruta no define roles → acceso libre
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  // 🔹 Validar si el rol activo está permitido en la ruta
  if (allowedRoles.includes(activeRole)) {
    return true;
  }

  // 🔹 Si NO tiene acceso
  console.warn(
    `[roleGuard] ❌ Acceso denegado. Rol activo "${activeRole}" no está en ${JSON.stringify(allowedRoles)}`,
  );
  router.navigate(['/inicio']);
  return false;
};
