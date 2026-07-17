import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  BehaviorSubject,
  Observable,
  firstValueFrom,
  interval,
  map,
  startWith,
  timeout,
} from 'rxjs';

import { environment } from '../../../environments/environment';

interface ServerTimeResponse {
  epochMillis?: number;
  dateTime?: string;
  timezone?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TimeService {
  /**
   * Diferencia entre la hora real del servidor
   * y la hora configurada en el computador.
   */
  private serverOffsetMs = 0;

  /**
   * Evita lanzar simultáneamente varias peticiones
   * al endpoint de hora.
   */
  private synchronizationPromise?: Promise<boolean>;

  private readonly synchronizedSubject =
    new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {}

  /**
   * Sincroniza la hora del frontend con la hora del servidor.
   *
   * Prioridad:
   * 1. epochMillis
   * 2. dateTime con zona horaria explícita
   */
  loadServerTime(): Promise<boolean> {
    if (this.synchronizedSubject.value) {
      return Promise.resolve(true);
    }

    if (this.synchronizationPromise) {
      return this.synchronizationPromise;
    }

    this.synchronizationPromise = this.synchronize();

    return this.synchronizationPromise.finally(() => {
      this.synchronizationPromise = undefined;
    });
  }

  private async synchronize(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http
          .get<ServerTimeResponse>(
            `${environment.apiBaseUrl}/time/server`,
          )
          .pipe(timeout(10000)),
      );

      const serverTimeMs = this.resolveServerTimeMs(response);

      if (serverTimeMs === null) {
        throw new Error(
          'El servidor no entregó epochMillis ni dateTime válido.',
        );
      }

      this.serverOffsetMs = serverTimeMs - Date.now();
      this.synchronizedSubject.next(true);

      if (environment.enableDebugTools) {
        console.log('[TimeService] Hora sincronizada:', {
          source:
            typeof response.epochMillis === 'number'
              ? 'epochMillis'
              : 'dateTime',
          serverTimeMs,
          serverOffsetMs: this.serverOffsetMs,
          timezone: response.timezone,
        });
      }

      return true;
    } catch (error) {
      /*
       * No bloqueamos indefinidamente la navegación.
       * Si existía una sincronización anterior, conservamos su offset.
       */
      this.synchronizedSubject.next(false);

      if (environment.enableDebugTools) {
        console.warn(
          '[TimeService] No fue posible sincronizar la hora.',
          error,
        );
      }

      return false;
    }
  }

  private resolveServerTimeMs(
    response: ServerTimeResponse,
  ): number | null {
    if (
      typeof response?.epochMillis === 'number' &&
      Number.isFinite(response.epochMillis) &&
      response.epochMillis > 0
    ) {
      return response.epochMillis;
    }

    if (!response?.dateTime) {
      return null;
    }

    const normalizedDateTime = this.normalizeDateTime(
      response.dateTime,
    );

    const parsedTime = new Date(normalizedDateTime).getTime();

    return Number.isNaN(parsedTime) ? null : parsedTime;
  }

  /**
   * Convierte nanosegundos a milisegundos para navegadores
   * que no admiten más de tres decimales.
   */
  private normalizeDateTime(value: string): string {
    return value
      .trim()
      .replace(' ', 'T')
      .replace(
        /(\.\d{3})\d+(?=(Z|[+-]\d{2}:\d{2})$)/,
        '$1',
      );
  }

  nowMs(): number {
    return Date.now() + this.serverOffsetMs;
  }

  getServerTime(): Date {
    return new Date(this.nowMs());
  }

  getServerTime$(): Observable<Date> {
    return interval(1000).pipe(
      startWith(0),
      map(() => this.getServerTime()),
    );
  }

  getSynchronized$(): Observable<boolean> {
    return this.synchronizedSubject.asObservable();
  }

  isSynchronized(): boolean {
    return this.synchronizedSubject.value;
  }
}