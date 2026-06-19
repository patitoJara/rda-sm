// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '../../services/token.service';

export const authGuard: CanActivateFn = () => {
  const tokenService = inject(TokenService);
  const router = inject(Router);

  const token = tokenService.getAccessToken();

  if (!token) {
    router.navigate(['/auth/login']);
    return false;
  }

  const exp = tokenService.getTokenExpiration();
  if (!exp || exp <= Date.now()) {
    tokenService.clear();
    router.navigate(['/auth/login']);
    return false;
  }

  return true;
};
