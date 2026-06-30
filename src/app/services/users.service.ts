// src/app/services/users.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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
    // Solo crea el usuario base.
    // Las relaciones roles/programas se sincronizan exclusivamente
    // desde UsersRelationsService para evitar doble POST/DELETE.
    console.log('[UsersService] 🆕 Creando usuario nuevo...');
    return this.http.post<User>(this.resourceUrl, user);
  }

  update(id: number, user: User): Observable<User> {
    // Solo actualiza el usuario base.
    // Las relaciones roles/programas se sincronizan exclusivamente
    // desde UsersRelationsService para evitar duplicados.
    return this.http.put<User>(`${this.resourceUrl}/${id}`, user);
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
