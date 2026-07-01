// src/app/services/state.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Result } from '../models/result';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  // empty?: boolean; // si tu backend lo envía
}

@Injectable({ providedIn: 'root' })
export class ResultService {
  private http = inject(HttpClient);

  // Deriva las URLs desde tu BaseUrl (sin barra final)
  private readonly BASE = environment.BaseUrl.replace(/\/+$/, '');
  private readonly resourceUrl = `${this.BASE}/api/v1/results`;

  /** GET /Result/{id} */
  findById(id: number): Observable<Result> {
    return this.http.get<Result>(`${this.resourceUrl}/${id}`);
  }

  /** PUT /Result/{id} */

  update(id: number, result: Result): Observable<Result> {
    return this.http.put<Result>(`${this.resourceUrl}/${id}`, result);
  }

  /** DELETE /Result/{id} */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }

  /** GET /Result */
  listAll(): Observable<Result[]> {
    return this.http.get<Result[]>(this.resourceUrl);
  }

  /** GET /api/v1/results/all */
  getAll(): Observable<Result[]> {
    return this.http.get<Result[]>(`${this.resourceUrl}/all`);
  }

  /** GET /api/v1/results/deleted */
  getDeleted(): Observable<Result[]> {
    return this.http.get<Result[]>(`${this.resourceUrl}/deleted`);
  }

  /** POST /Result */
  save(result: Result): Observable<Result> {
    return this.http.post<Result>(this.resourceUrl, result);
  }

  /** POST /Result/{id}/restore */
  restore(id: number): Observable<Result> {
    return this.http.post<Result>(`${this.resourceUrl}/${id}/restore`, {});
  }

  /** GET /Result/getAllPaginated?page=&size=&q=&state=&sort= */

  getAllPaginated(
    opts: {
      page?: number;
      size?: number;
      q?: string;
      state?: string;
      sort?: string;
    } = {},
  ): Observable<Page<Result>> {
    const { page = 0, size = 10, q, state, sort } = opts;

    let params = new HttpParams().set('page', page).set('size', size);

    if (q) params = params.set('q', q);
    if (state) params = params.set('state', state);
    if (sort) params = params.set('sort', sort);

    return this.http.get<Page<Result>>(
      `${this.resourceUrl}/getAllPaginated`,
      { params, headers: {} }, // 🔥 IMPORTANTE: limpia headers heredados
    );
  }

  //  ESTE ESUN GRAN ERROR PARA TENER ENCUENTA
  //   return this.http.get<Page<Result>>(`${this.resourceUrl}/all`);

  /** DELETE /sexs/all (si tu API lo soporta) */
  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/all`);
  }
  /*
            GET /api/v1/results/{id}
            PUT /api/v1/results/{id}
            DELETE /api/v1/results/{id}
            GET /api/v1/results
            POST /api/v1/results
            POST /api/v1/results/{id}/restore
            GET /api/v1/results/getAllPaginated
            GET /api/v1/results/deleted
            GET /api/v1/results/all

        */
}
