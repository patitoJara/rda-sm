// src/app/core/services/session.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, Subject, timer } from 'rxjs';
import { TokenService } from '../../services/token.service';
import { TimeService } from './time.service';

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
  private sessionSub?: Subscription;

  // ⏱ 60 minutos
  private readonly SESSION_TIME = 60 * 60 * 1000;

  // 🔔 Notificador de expiración (NO hace logout inmediato)
  sessionExpired$ = new Subject<void>();

  constructor(
    private router: Router,
    private tokenService: TokenService,
    private timeService: TimeService,
  ) {}

  startSession(source: 'login' | 'refresh' | 'reload' = 'login'): void {
    console.log(`⏲ [SessionService] Iniciando sesión desde: ${source}`);

    this.clearSession();

    this.sessionSub = timer(this.SESSION_TIME).subscribe(() => {
      console.warn('🚨 [SessionService] Sesión expirada');
      this.sessionExpired$.next(); // 🔥 SOLO NOTIFICA
    });
  }

  startSessionFromToken(): void {
    this.clearSession();

    //const expiration = this.tokenService.getExpiration();
    const expiration = this.tokenService.getTokenExpiration();
    if (!expiration) return;

    const remaining = expiration - this.timeService.nowMs();

    if (remaining <= 0) {
      this.sessionExpired$.next();
      return;
    }

    this.sessionSub = timer(remaining).subscribe(() => {
      console.warn('🚨 [SessionService] Token realmente expirado');
      this.sessionExpired$.next();
    });
  }

  clearSession(): void {
    if (this.sessionSub) {
      this.sessionSub.unsubscribe();
      this.sessionSub = undefined;
      console.log('🧹 [SessionService] Timer cancelado');
    }
  }

  logout(reason: 'manual' | 'timeout' = 'manual'): void {
    console.log(`🚪 [SessionService] Logout ejecutado (${reason})`);

    this.clearSession();
    this.tokenService.clear();

    this.router.navigate(['/auth/login'], { replaceUrl: true });
  }

  ngOnDestroy(): void {
    this.clearSession();
  }
}
