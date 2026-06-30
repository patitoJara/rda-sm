// ============================================================
// ✅ AUTH LOGIN SERVICE
// Maneja autenticación, tokens, perfil, roles y refresh
// ============================================================
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { TokenService } from './token.service';
import { map, tap, catchError } from 'rxjs/operators';
import { Observable, of, throwError } from 'rxjs';

// ------------------------------------------------------------
// 🧩 Interfaces exportadas
// ------------------------------------------------------------
export interface AuthProfile {
  username: string;
  email: string;
  id: number;
  fullName: string;
}

export interface AuthResponse {
  authenticated?: boolean;
  result?: string;
  message?: string;
  token: string;
  refreshToken: string;
  tokenType: string;
  expiresIn?: number;
  expiresInMs?: number;
  expiresAt?: string;

  user: {
    id: number;
    firstName?: string | null;
    secondName?: string | null;
    firstLastName?: string | null;
    secondLastName?: string | null;
    fullName?: string | null;
    email: string;
    username: string;
    rut?: string | null;
  };

  roles: Array<{
    id: number;
    name: string;
    code?: string;
    active?: boolean;
    description?: string | null;
    assignedByUserId?: number | null;
  }>;

  programs: Array<{ id: number; name: string }>;

  authorities?: string[];

  claims?: any;
}

// ------------------------------------------------------------
// 🧠 Servicio principal
// ------------------------------------------------------------
@Injectable({ providedIn: 'root' })
export class AuthLoginService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private readonly BASE_URL = environment.BaseUrl;

  private roles: string[] = [];
  private programs: { id: number; name: string }[] = [];
  private profile: AuthProfile | null = null;

  // ==========================================================
  // 🔐 LOGIN
  // ==========================================================
  login(email: string, password: string): Observable<AuthResponse> {
    const url = `${this.BASE_URL}/auth/login`;

    return this.http.post<AuthResponse>(url, { email, password }).pipe(
      tap((res) => {
        if (!res || !res.token) throw new Error('Respuesta de login inválida.');

        console.log('[AuthLoginService] 🧩 Respuesta login completa:', res);

        this.tokenService.setExpirationFromToken(res.token);

        const accessToken = res.token;
        const refreshToken = res.refreshToken;

        if (!refreshToken) {
          console.error('[AuthLoginService] ❌ Login sin refreshToken');
          throw new Error('Login sin refreshToken');
        }

        this.tokenService.setTokens(accessToken, refreshToken);

        // Guarda manualmente por compatibilidad
        //localStorage.setItem('token', accessToken);
        //if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

        // ---------------------------------------------------------
        // 🟦 GUARDAR ROLES, PROGRAMAS Y PERFIL EN SESSIONSTORAGE
        // ---------------------------------------------------------
        this.roles = (res.roles || []).map((r) => r.code ?? r.name);
        this.programs = res.programs || [];

        const user = res.user;

        if (!user) {
          throw new Error('Login sin datos de usuario');
        }

        this.profile = {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName:
            user.fullName ||
            [user.firstName, user.firstLastName].filter(Boolean).join(' ') ||
            user.username,
        };

        const profileForStorage = {
          ...this.profile,
          firstName: user.firstName,
          secondName: user.secondName,
          firstLastName: user.firstLastName,
          secondLastName: user.secondLastName,
          rut: user.rut,
          roles: res.roles ?? [],
          programs: res.programs ?? [],
          authorities: res.authorities ?? [],
        };

        sessionStorage.setItem('roles', JSON.stringify(this.roles));
        sessionStorage.setItem('programs', JSON.stringify(this.programs));
        sessionStorage.setItem(
          'authorities',
          JSON.stringify(res.authorities ?? []),
        );
        sessionStorage.setItem('profile', JSON.stringify(profileForStorage));

        console.log('[AuthLoginService] 💾 Roles/Programas/Profile guardados.');
        console.log('[AuthLoginService] ✅ Tokens almacenados correctamente.');
      }),

      catchError((err) => {
        console.error('[AuthLoginService] ❌ Error de login:', err);
        return throwError(() => err);
      }),
    );
  }

  // ==========================================================
  // 🚪 LOGOUT
  // ==========================================================
  logout(): void {
    try {
      sessionStorage.clear();
      localStorage.clear(); // 🔥 por seguridad ante restos antiguos
      this.tokenService.clear();

      console.log('[AuthLoginService] 🔒 Sesión cerrada');
      this.router.navigateByUrl('/auth/login');
    } catch (e) {
      console.error('[AuthLoginService] ❌ Error haciendo logout:', e);
    }
  }

  // ==========================================================
  // 🧩 DATOS DE SESIÓN
  // ==========================================================
  getToken(): string | null {
    return this.tokenService.getAccessToken();
  }

  getProfile(): AuthProfile | null {
    if (!this.profile && sessionStorage.getItem('profile')) {
      this.profile = JSON.parse(sessionStorage.getItem('profile')!);
    }
    return this.profile;
  }

  getRoles(): string[] {
    if (this.roles.length === 0 && sessionStorage.getItem('roles')) {
      this.roles = JSON.parse(sessionStorage.getItem('roles')!);
    }
    return this.roles;
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role.toUpperCase());
  }

  getPrograms(): { id: number; name: string }[] {
    if (this.programs.length === 0 && sessionStorage.getItem('programs')) {
      this.programs = JSON.parse(sessionStorage.getItem('programs')!);
    }
    return this.programs;
  }

  // ==========================================================
  // ⏰ CONTROL DE EXPIRACIÓN
  // ==========================================================
  getTokenExpiration(): number | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload?.exp;
      if (!exp) return null;

      return exp > 9999999999 ? exp : exp * 1000;
    } catch {
      return null;
    }
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      let exp = payload.exp;

      if (exp > 9999999999) exp = Math.floor(exp / 1000);

      const now = Math.floor(Date.now() / 1000);
      const diff = exp - now;

      return diff <= 0;
    } catch {
      return true;
    }
  }

  // ==========================================================
  // 🔁 REFRESH TOKEN (Observable, compatible con interceptor)
  // ==========================================================
  refresh(): Observable<string> {
    console.log('[AuthLoginService] 🔄 Intentando refrescar token...');

    const refreshToken = this.tokenService.getRefreshToken();

    if (!refreshToken) {
      console.warn(
        '[AuthLoginService] ⚠️ RefreshToken perdido, cerrando sesión',
      );
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }

    const url = `${this.BASE_URL}/auth/refresh`;

    return this.http.post<AuthResponse>(url, { refreshToken }).pipe(
      tap((res) => {
        if (!res?.token) {
          throw new Error('Respuesta inválida al refrescar token');
        }

        // 🔐 IMPORTANTE: si backend no devuelve refreshToken nuevo,
        // mantener el anterior
        const newRefresh = res.refreshToken ?? refreshToken;

        this.tokenService.setTokens(res.token, newRefresh);
        this.tokenService.setExpirationFromToken(res.token);

        console.log('[AuthLoginService] 🔁 Token refrescado correctamente.');
      }),
      map((res) => res.token),
      catchError((err) => {
        console.error('[AuthLoginService] ❌ Refresh falló:', err);

        // 🔥 SOLO AQUÍ logout
        this.logout();

        return throwError(() => err);
      }),
    );
  }
}
