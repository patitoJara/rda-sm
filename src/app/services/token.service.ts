//C:\Users\pjara\Documents\DESARROLLO\ANGULAR\rda-sm\src\app\services\token.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly TOKEN_KEY = 'token';
  private readonly REFRESH_KEY = 'refreshToken';
  private readonly ACTIVE_PROGRAM_KEY = 'activeProgram';
  private readonly ACTIVE_ROLE_KEY = 'activeRole';
  private readonly EXPIRES_AT_KEY = 'token_expires_at';
  private readonly ACTIVE_PROGRAM_ID_KEY = 'activeProgramId';

  // BehaviorSubjects
  private activeProgram$ = new BehaviorSubject<string | null>(
    sessionStorage.getItem(this.ACTIVE_PROGRAM_KEY),
  );

  private activeRole$ = new BehaviorSubject<string | null>(
    sessionStorage.getItem(this.ACTIVE_ROLE_KEY),
  );

  // 🔥 CONTEXTO ACTIVO EN MEMORIA
  private activeRoleMemory: string | null = null;
  private activeProgramMemory: string | null = null;
  private activeProgramIdMemory: number | null = null;

  activeProgramChanges = this.activeProgram$.asObservable();
  activeRoleChanges = this.activeRole$.asObservable();

  // =====================================================
  // 🔑 TOKENS SOLO EN sessionStorage
  // =====================================================
  /*
  setTokens(token: string, refreshToken: string): void {
    sessionStorage.setItem(this.TOKEN_KEY, token);
    sessionStorage.setItem(this.REFRESH_KEY, refreshToken);

    console.log('[TokenService] 💾 Tokens guardados en sessionStorage');
  }
  */

  setTokens(token: string, refreshToken: string): void {
    sessionStorage.setItem(this.TOKEN_KEY, token);
    sessionStorage.setItem(this.REFRESH_KEY, refreshToken);

    this.setExpirationFromToken(token); // 🔥 CLAVE ABSOLUTA

    console.log('[TokenService] 💾 Tokens guardados en sessionStorage');
  }

  getUserId(): number | null {
    const profile = this.getUserProfile();
    const id = Number(profile?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  setRefreshToken(token: string): void {
    sessionStorage.setItem(this.REFRESH_KEY, token);
  }
  /*
  getAccessToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }
  */

  // =====================================================
  // 🔑 ACCESS TOKEN
  // =====================================================
  getAccessToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  setAccessToken(token: string): void {
    sessionStorage.setItem(this.TOKEN_KEY, token);
    console.log('[TokenService] 🔄 Access token actualizado');
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(this.REFRESH_KEY);
  }

  clear(): void {
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.REFRESH_KEY);
    sessionStorage.removeItem(this.ACTIVE_PROGRAM_KEY);
    sessionStorage.removeItem(this.ACTIVE_ROLE_KEY);
    sessionStorage.removeItem(this.ACTIVE_PROGRAM_ID_KEY);
  }

  // =====================================================
  // ⏰ EXPIRACIÓN REAL (FRONTEND)
  // =====================================================

  // =====================================================
  // ⏰ EXPIRACIÓN DESDE JWT (FUENTE ÚNICA DE VERDAD)
  // =====================================================
  setExpirationFromToken(token: string): void {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expSeconds = payload.exp;

      if (!expSeconds) {
        console.error('[TokenService] ❌ Token sin exp');
        return;
      }

      const expiresAtMs = expSeconds * 1000;

      sessionStorage.setItem(this.EXPIRES_AT_KEY, expiresAtMs.toString());

      console.log(
        '[TokenService] ⏰ Expiración tomada desde JWT:',
        new Date(expiresAtMs),
      );
    } catch (e) {
      console.error('[TokenService] ❌ Error leyendo exp del token', e);
    }
  }

  getTokenExpiration(): number | null {
    const v = sessionStorage.getItem(this.EXPIRES_AT_KEY);
    return v ? Number(v) : null;
  }

  // =====================================================
  // 👤 PERFIL
  // =====================================================
  getUserProfile(): any | null {
    const p = sessionStorage.getItem('profile');
    return p ? JSON.parse(p) : null;
  }

  getUserRoles(): string[] {
    return JSON.parse(sessionStorage.getItem('roles') || '[]');
  }

  getUserPrograms(): { id: number; name: string }[] {
    return JSON.parse(sessionStorage.getItem('programs') || '[]');
  }

  // =====================================================
  // 🎭 gets
  // =====================================================

  getActiveProgram(): string | null {
    return sessionStorage.getItem(this.ACTIVE_PROGRAM_KEY);
  }

  getActiveRole(): string | null {
    return sessionStorage.getItem(this.ACTIVE_ROLE_KEY);
  }

  getActiveProgramId(): number | null {
    // 🔥 Primero intentar memoria
    if (this.activeProgramIdMemory !== null) {
      return this.activeProgramIdMemory;
    }

    // 🔥 Si no existe en memoria, intentar sessionStorage
    const value = sessionStorage.getItem(this.ACTIVE_PROGRAM_ID_KEY);

    const parsed = value ? Number(value) : null;

    // 🔥 Si viene desde storage, restaurar en memoria
    if (parsed !== null) {
      this.activeProgramIdMemory = parsed;
    }

    return parsed;
  }

  // =====================================================
  // 🎭 Seters
  // =====================================================
  setActiveRole(role: string | null): void {
    this.activeRoleMemory = role;
    if (role) {
      sessionStorage.setItem('activeRole', role);
    } else {
      sessionStorage.removeItem('activeRole');
    }
  }

  setActiveProgram(program: string | null): void {
    this.activeProgramMemory = program;
    if (program) {
      sessionStorage.setItem('activeProgram', program);
    } else {
      sessionStorage.removeItem('activeProgram');
    }
  }

  setActiveProgramId(programId: number | null): void {
    this.activeProgramIdMemory = programId;

    if (programId !== null) {
      sessionStorage.setItem(this.ACTIVE_PROGRAM_ID_KEY, programId.toString());
    } else {
      sessionStorage.removeItem(this.ACTIVE_PROGRAM_ID_KEY);
    }

    console.log('💾 activeProgramId guardado en memoria:', programId);
  }
}
