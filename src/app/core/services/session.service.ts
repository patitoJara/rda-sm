// src/app/core/services/session.service.ts

import { Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Subject,
  Subscription,
  interval,
  startWith,
} from 'rxjs';

import { TokenService } from '../../services/token.service';
import { TimeService } from './time.service';

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
  private timerSub?: Subscription;

  /**
   * Tiempo restante de la sesión expresado en minutos completos.
   * La fuente de verdad siempre es el exp del JWT.
   */
  private readonly remainingMinutesSubject =
    new BehaviorSubject<number>(0);

  readonly remainingMinutes$ =
    this.remainingMinutesSubject.asObservable();

  /**
   * Indica si corresponde mostrar la opción de extender sesión.
   */
  private readonly canExtendSubject =
    new BehaviorSubject<boolean>(false);

  readonly canExtend$ = this.canExtendSubject.asObservable();

  /**
   * Notifica que el JWT llegó realmente a su expiración.
   */
  readonly sessionExpired$ = new Subject<void>();

  private expirationNotified = false;

  constructor(
    private router: Router,
    private tokenService: TokenService,
    private timeService: TimeService,
  ) {}

  // ============================================================
  // INICIO / REINICIO DESDE JWT
  // ============================================================

  startSessionFromToken(): void {
    this.clearTimer();
    this.expirationNotified = false;

    const expiration = this.tokenService.getTokenExpiration();

    if (!expiration) {
      console.warn(
        '[SessionService] No existe expiración válida para la sesión.',
      );

      this.updateSessionState(0);
      return;
    }

    /**
     * Actualizamos inmediatamente y luego cada segundo.
     *
     * Aunque la UI muestre minutos, calcular cada segundo evita
     * depender del instante exacto en que comenzó un interval de 60 s.
     */
    this.timerSub = interval(1000)
      .pipe(startWith(0))
      .subscribe(() => {
        this.updateFromExpiration(expiration);
      });

    console.log(
      '[SessionService] Sesión sincronizada con exp del JWT:',
      new Date(expiration),
    );
  }

  /**
   * Alias semántico para login, refresh o reload.
   * Todos terminan usando exactamente la misma fuente de verdad.
   */
  restartFromCurrentToken(): void {
    this.startSessionFromToken();
  }

  // ============================================================
  // CÁLCULO CENTRAL
  // ============================================================

  private updateFromExpiration(expiration: number): void {
    const remainingMs =
      expiration - this.timeService.nowMs();

    if (remainingMs <= 0) {
      this.updateSessionState(0);
      this.clearTimer();

      if (!this.expirationNotified) {
        this.expirationNotified = true;

        console.warn(
          '[SessionService] Token realmente expirado.',
        );

        this.sessionExpired$.next();
      }

      return;
    }

    /**
     * ceil evita mostrar 59 minutos inmediatamente después
     * de recibir un JWT válido por 60 minutos.
     */
    const remainingMinutes = Math.ceil(
      remainingMs / 60000,
    );

    this.updateSessionState(remainingMinutes);
  }

  private updateSessionState(
    remainingMinutes: number,
  ): void {
    this.remainingMinutesSubject.next(
      Math.max(0, remainingMinutes),
    );

    this.canExtendSubject.next(
      remainingMinutes > 0 &&
      remainingMinutes <= 5,
    );
  }

  // ============================================================
  // CONSULTAS SINCRÓNICAS
  // ============================================================

  getRemainingMinutes(): number {
    return this.remainingMinutesSubject.value;
  }

  canExtend(): boolean {
    return this.canExtendSubject.value;
  }

  // ============================================================
  // LIMPIEZA / LOGOUT
  // ============================================================

  clearSession(): void {
    this.clearTimer();
    this.expirationNotified = false;
    this.updateSessionState(0);
  }

  private clearTimer(): void {
    if (this.timerSub) {
      this.timerSub.unsubscribe();
      this.timerSub = undefined;

      console.log(
        '[SessionService] Timer de sesión cancelado.',
      );
    }
  }

  logout(
    reason: 'manual' | 'timeout' | 'invalid' = 'manual',
  ): void {
    console.log(
      `[SessionService] Logout ejecutado (${reason})`,
    );

    this.clearSession();
    this.tokenService.clear();

    this.router.navigate(
      ['/auth/login'],
      { replaceUrl: true },
    );
  }

  /**
   * Invalida una sesión que ya no puede continuar.
   * Se utiliza desde guards/interceptores para evitar
   * que esas capas manipulen directamente el almacenamiento.
   */
  invalidateSession(returnUrl?: string): void {
    console.warn('[SessionService] Sesión inválida.');

    this.clearSession();
    this.tokenService.clear();

    this.router.navigate(['/auth/login'], {
      queryParams: returnUrl
        ? { returnUrl }
        : undefined,
      replaceUrl: true,
    });
  }
  ngOnDestroy(): void {
    this.clearTimer();
  }
}
