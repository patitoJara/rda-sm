// src/app/services/substance.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Substance } from '../models/substance';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  // empty?: boolean; // si tu backend lo envía
}

@Injectable({ providedIn: 'root' })
export class SubstanceService {
  private http = inject(HttpClient);

  // Deriva las URLs desde tu BaseUrl (sin barra final)
  private readonly resourceUrl = `${environment.apiBaseUrl}/substances`;

  /** GET /substances/{id} */
  findById(id: number): Observable<Substance> {
    return this.http.get<Substance>(`${this.resourceUrl}/${id}`);
  }

  /** PUT /substances/{id} */

  update(id: number, substance: Substance): Observable<Substance> {
    return this.http.put<Substance>(`${this.resourceUrl}/${id}`, substance);
  }

  /** DELETE /substances/{id} */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }

  /** GET /substances */
  listAll(): Observable<Substance[]> {
    return this.http.get<Substance[]>(this.resourceUrl);
  }

  /** GET /substances/all */
  getAll(): Observable<Substance[]> {
    return this.http.get<Substance[]>(`${this.resourceUrl}/all`);
  }

  /** GET /substances/deleted */
  getDeleted(): Observable<Substance[]> {
    return this.http.get<Substance[]>(`${this.resourceUrl}/deleted`);
  }

  /** POST /substances */
  save(substance: Substance): Observable<Substance> {
    return this.http.post<Substance>(this.resourceUrl, substance);
  }

  /** POST /substances/{id}/restore */
  restore(id: number): Observable<Substance> {
    return this.http.post<Substance>(`${this.resourceUrl}/${id}/restore`, {});
  }

  /** GET /substances/getAllPaginated?page=&size=&q=&state=&sort= */
  /** GET /substances/getAllPaginated?page=&size=&q=&state=&sort= */
  getAllPaginated(
    opts: {
      page?: number;
      size?: number;
      q?: string;
      state?: string;
      sort?: string;
    } = {},
  ): Observable<Page<Substance>> {
    const { page = 0, size = 10, q, state, sort } = opts;

    let params = new HttpParams().set('page', page).set('size', size);

    if (q) {
      params = params.set('q', q);
    }

    if (state) {
      params = params.set('state', state);
    }

    if (sort) {
      params = params.set('sort', sort);
    }

    return this.http.get<Page<Substance>>(
      `${this.resourceUrl}/getAllPaginated`,
      { params },
    );
  }

  /** DELETE /substances/all (si tu API lo soporta) */
  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/all`);
  }
  /*
            GET /api/v1/substances/{id}
            PUT /api/v1/substances/{id}
            DELETE /api/v1/substances/{id}
            GET /api/v1/substances
            POST /api/v1/substances
            POST /api/v1/substances/{id}/restore
            GET /api/v1/substances/getAllPaginated
            GET /api/v1/substances/deleted
            GET /api/v1/substances/all
        */
}
