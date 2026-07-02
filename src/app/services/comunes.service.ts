// src/app/services/commune.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Commune } from '../models/commune';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  // empty?: boolean; // si tu backend lo envÃa
}

@Injectable({ providedIn: 'root' })
export class CommuneService {
  private http = inject(HttpClient);

  // Deriva las URLs desde tu BaseUrl (sin barra final)
  private readonly resourceUrl = `${environment.apiBaseUrl}/communes`;

  /** GET /communes/{id} */
  findById(id: number): Observable<Commune> {
    return this.http.get<Commune>(`${this.resourceUrl}/${id}`);
  }

  /** PUT /communes/{id} */
  update(id: number, commune: Commune): Observable<Commune> {
    return this.http.put<Commune>(`${this.resourceUrl}/${id}`, commune);
  }

  /** DELETE /communes/{id} */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }

  /** GET /communes */
  listAll(): Observable<Commune[]> {
    return this.http.get<Commune[]>(this.resourceUrl);
  }

  /** POST /communes */
  save(commune: Commune): Observable<Commune> {
    console.log('[commune service]', commune);
    return this.http.post<Commune>(this.resourceUrl, commune);
  }

  /** POST /communes/{id}/restore */
  restore(id: number): Observable<Commune> {
    return this.http.post<Commune>(`${this.resourceUrl}/${id}/restore`, {});
  }

  /** GET /communes/getAllPaginated?page=&size=&q=&state=&sort= */
  getAllPaginated(
    opts: {
      page?: number;
      size?: number;
      q?: string;
      state?: string;
      sort?: string;
    } = {},
  ): Observable<Page<Commune>> {
    const { page = 0, size = 10, q, state, sort } = opts;

    let params = new HttpParams().set('page', page).set('size', size);

    if (q) params = params.set('q', q);
    if (state) params = params.set('state', state);
    if (sort) params = params.set('sort', sort);

    //return this.http.get<Page<Program>>(`${this.resourceUrl}/getAllPaginated`, { params });
    return this.http.get<Page<Commune>>(`${this.resourceUrl}/all`);
  }

  listPaginated(
    opts: {
      page?: number;
      size?: number;
      q?: string;
      state?: string;
      sort?: string;
    } = {},
  ): Observable<Page<Commune>> {
    const { page = 0, size = 10, q, state, sort } = opts;

    let params = new HttpParams().set('page', page).set('size', size);

    if (q) params = params.set('q', q);
    if (state) params = params.set('state', state);
    if (sort) params = params.set('sort', sort);

    return this.http.get<Page<Commune>>(`${this.resourceUrl}/getAllPaginated`, {
      params,
    });
  }

  /** DELETE /communes/all (si tu API lo soporta) */
  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/all`);
  }

  /** GET /communes/all */
  getAll(): Observable<Commune[]> {
    return this.http.get<Commune[]>(`${this.resourceUrl}/all`);
  }

  /** GET /communes/deleted */
  getDeleted(): Observable<Commune[]> {
    return this.http.get<Commune[]>(`${this.resourceUrl}/deleted`);
  }
}
