import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AppCacheService {
  private readonly appVersion = environment.frontendVersion;
  private readonly versionKey = 'rdaSmFrontendVersion';
  private readonly cleanedAtKey = 'rdaSmCacheLastCleanedAt';
  

  /**
   * Claves de sesión que sí se deben limpiar cuando cambia la versión.
   * No borra last_email.
   */
  private readonly sessionKeysToRemove = [
    'token',
    'refreshToken',
    'token_expires_at',

    'profile',
    'roles',
    'programs',

    'activeRole',
    'activeProgram',
    'activeProgramId',

    'last_route',

    'dashboard_filters',
    'dashboard_period',
    'dashboard_program',

    'demand_draft',
    'demand_current_step',
    'demand_form_cache',
    'demand_filters',

    'rda_current_episode',
    'rda_current_stage',
  ];

  /**
   * Claves locales antiguas o de navegación que se pueden limpiar.
   * No incluye last_email.
   */
  private readonly localKeysToRemove = [
    'last_route',
    'dashboard_filters',
    'dashboard_period',
    'dashboard_program',
    'demand_filters',
  ];

  async clearBeforeLoginIfNeeded(): Promise<void> {
    const currentVersion = localStorage.getItem(this.versionKey);

    if (currentVersion === this.appVersion) {
      return;
    }

    console.warn(
      `[AppCacheService] Nueva versión frontend detectada: ${currentVersion ?? 'sin versión'} → ${this.appVersion}`,
    );

    this.clearControlledStorage();
    await this.clearBrowserCaches();
    this.clearKnownCookies();

    localStorage.setItem(this.versionKey, this.appVersion);
    localStorage.setItem(this.cleanedAtKey, new Date().toISOString());

    console.log('[AppCacheService] Caché controlada limpiada correctamente.');
  }

  /**
   * Limpieza para logout manual o token vencido.
   * Mantiene last_email y versión frontend.
   */
  clearSessionData(): void {
    this.sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));
  }

  private clearControlledStorage(): void {
    this.sessionKeysToRemove.forEach((key) => sessionStorage.removeItem(key));
    this.localKeysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  private async clearBrowserCaches(): Promise<void> {
    try {
      if (!('caches' in window)) return;

      const cacheNames = await caches.keys();

      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      console.log('[AppCacheService] CacheStorage limpiado:', cacheNames);
    } catch (error) {
      console.warn('[AppCacheService] No fue posible limpiar CacheStorage:', error);
    }
  }

  /**
   * Solo limpia cookies accesibles por JavaScript.
   * Las cookies HttpOnly no se pueden borrar desde Angular.
   */
  private clearKnownCookies(): void {
    try {
      const cookies = document.cookie ? document.cookie.split(';') : [];

      cookies.forEach((cookie) => {
        const name = cookie.split('=')[0]?.trim();

        if (!name) return;

        document.cookie = `${name}=; Max-Age=0; path=/`;
      });
    } catch (error) {
      console.warn('[AppCacheService] No fue posible limpiar cookies:', error);
    }
  }
}