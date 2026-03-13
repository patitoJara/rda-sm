// src/app/services/users.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, forkJoin, of } from 'rxjs';
import { map, switchMap, catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { User } from '../models/user';
import { Role } from '../models/role';
import { Program } from '../models/program';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private readonly BASE = environment.BaseUrl.replace(/\/+$/, '');
  private readonly resourceUrl = `${this.BASE}/api/v1/users`;

  /** =========================== CRUD =========================== */

  findById(id: number): Observable<User> {
    return this.http.get<User>(`${this.resourceUrl}/${id}`);
  }

  save(user: User): Observable<User> {
    // Si el usuario no tiene id, se crea
    if (!user.id) {
      console.log('[UsersService] 🆕 Creando usuario nuevo...');
      return this.http
        .post<User>(this.resourceUrl, user)
        .pipe(switchMap((savedUser) => this.syncRelations(savedUser, user)));
    }

    // Si ya existe, solo sincronizamos relaciones
    console.log(
      `[UsersService] 🔁 Usuario existente (id=${user.id}), sincronizando relaciones...`,
    );
    return this.syncRelations(user, user);
  }

  update(id: number, user: User): Observable<User> {
    return this.http
      .put<User>(`${this.resourceUrl}/${id}`, user)
      .pipe(switchMap((savedUser) => this.syncRelations(savedUser, user)));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }

  restore(id: number): Observable<User> {
    return this.http.post<User>(`${this.resourceUrl}/${id}/restore`, {});
  }

  listAll(): Observable<User[]> {
    return this.http.get<User[]>(this.resourceUrl);
  }

  getAllUsersPrograms() {
    return this.http.get<any[]>(`${this.BASE}/api/v1/users_programs`);
  }

  /** ====================== Relaciones ========================== */
  private syncRelations(savedUser: User, original: User): Observable<User> {
    const userId = savedUser.id!;
    const newRoles = original.roles ?? [];
    const newPrograms = original.programs ?? [];

    console.log(
      `[syncRelations] Iniciando sincronización para usuario ${userId}`,
    );

    // === 1️⃣ Sincronizar Roles ===
    const syncRoles$ = this.http
      .get<any[]>(`${this.BASE}/api/v1/users_roles/user/${userId}`)
      .pipe(
        switchMap((existing) => {
          if (existing.length > 0) {
            console.log(
              `[syncRelations] 🗑️ Eliminando ${existing.length} roles previos para usuario ${userId}`,
            );

            // 🔹 Borrar todas las relaciones previas
            return this.http
              .delete(`${this.BASE}/api/v1/users_roles/user/${userId}`)
              .pipe(
                tap(() =>
                  console.log(`[syncRelations] ✅ Roles previos eliminados`),
                ),
                switchMap(() => this.addRoles(userId, newRoles)),
              );
          } else {
            console.log(
              `[syncRelations] 🆕 Sin roles previos, agregando nuevos...`,
            );
            return this.addRoles(userId, newRoles);
          }
        }),
        catchError((err) => {
          console.error(
            `[syncRelations] ❌ Error sincronizando roles:`,
            err.message,
          );
          return of(null);
        }),
      );

    // === 2️⃣ Sincronizar Programas ===
    const syncPrograms$ = this.http
      .get<any[]>(`${this.BASE}/api/v1/users_programs/user/${userId}`)
      .pipe(
        switchMap((existing) => {
          if (existing.length > 0) {
            console.log(
              `[syncRelations] 🗑️ Eliminando ${existing.length} programas previos para usuario ${userId}`,
            );

            // 🔹 Borrar todas las relaciones previas
            return this.http
              .delete(`${this.BASE}/api/v1/users_programs/user/${userId}`)
              .pipe(
                tap(() =>
                  console.log(
                    `[syncRelations] ✅ Programas previos eliminados`,
                  ),
                ),
                switchMap(() => this.addPrograms(userId, newPrograms)),
              );
          } else {
            console.log(
              `[syncRelations] 🆕 Sin programas previos, agregando nuevos...`,
            );
            return this.addPrograms(userId, newPrograms);
          }
        }),
        catchError((err) => {
          console.error(
            `[syncRelations] ❌ Error sincronizando programas:`,
            err.message,
          );
          return of(null);
        }),
      );

    // Ejecutar ambas sincronizaciones en paralelo
    return forkJoin([syncRoles$, syncPrograms$]).pipe(
      tap(() =>
        console.log(
          `[syncRelations] ✅ Sincronización completada para usuario ${userId}`,
        ),
      ),
      map(() => savedUser),
      catchError((err) => {
        console.error(
          `[syncRelations] ❌ Error final en usuario ${userId}:`,
          err.message,
        );
        return of(savedUser);
      }),
    );
  }

  // ====================================
  // 🔹 Métodos auxiliares
  // ====================================
  private addRoles(userId: number, roles: any[]): Observable<any> {
    if (!roles.length) return of(true);

    const requests = roles.map((r) =>
      this.http
        .post(`${this.BASE}/api/v1/users_roles`, {
          user: { id: userId },
          role: { id: r.id },
        })
        .pipe(
          tap(() => console.log(`[syncRelations] ➕ Rol agregado: ${r.id}`)),
          catchError((err) => {
            console.error(
              `[syncRelations] ⚠️ Error agregando rol ${r.id}:`,
              err.message,
            );
            return of(null);
          }),
        ),
    );

    return forkJoin(requests);
  }

  private addPrograms(userId: number, programs: any[]): Observable<any> {
    if (!programs.length) return of(true);

    const requests = programs.map((p) =>
      this.http
        .post(`${this.BASE}/api/v1/users_programs`, {
          user: { id: userId },
          program: { id: p.id },
        })
        .pipe(
          tap(() =>
            console.log(`[syncRelations] ➕ Programa agregado: ${p.id}`),
          ),
          catchError((err) => {
            console.error(
              `[syncRelations] ⚠️ Error agregando programa ${p.id}:`,
              err.message,
            );
            return of(null);
          }),
        ),
    );

    return forkJoin(requests);
  }

  /** ======================= Consultas ========================= */

  getUserRoles(userId: number): Observable<Role[]> {
    return this.http
      .get<any>(`${this.BASE}/api/v1/users_roles/user/${userId}`)
      .pipe(
        map((res) => {
          if (!res) return [];
          if (Array.isArray(res)) return res.map((r) => r.role);
          if (res.role) return [res.role]; // 🔹 único objeto
          return [];
        }),
        catchError((err) => {
          if (err.status === 403) {
            console.warn(
              `[getUserRoles] Usuario ${userId} sin permisos o sin roles asociados.`,
            );
            return of([]);
          }
          console.error('[getUserRoles] Error:', err.message);
          return of([]);
        }),
      );
  }

  getUserPrograms(userId: number): Observable<Program[]> {
    return this.http
      .get<any>(`${this.BASE}/api/v1/users_programs/user/${userId}`)
      .pipe(
        map((res) => {
          if (!res) return [];
          if (Array.isArray(res)) return res.map((p) => p.program);
          if (res.program) return [res.program]; // 🔹 único objeto
          return [];
        }),
        catchError((err) => {
          if (err.status === 403) {
            console.warn(
              `[getUserPrograms] Usuario ${userId} sin permisos o sin programas asociados.`,
            );
            return of([]);
          }
          console.error('[getUserPrograms] Error:', err.message);
          return of([]);
        }),
      );
  }

  /** ======================= Paginación ========================= */

  getAllPaginated(
    opts: {
      page?: number;
      size?: number;
      q?: string;
      state?: string;
      sort?: string;
    } = {},
  ): Observable<Page<User>> {
    const { page = 0, size = 10, q, state, sort } = opts;
    let params = new HttpParams().set('page', page).set('size', size);
    if (q) params = params.set('q', q);
    if (state) params = params.set('state', state);
    if (sort) params = params.set('sort', sort);

    return this.http.get<Page<User>>(`${this.resourceUrl}/all`, { params });
  }
}
