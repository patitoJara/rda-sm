// src/app/services/result.service.ts

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
}

@Injectable({
  providedIn: 'root',
})
export class ResultService {
  private readonly http = inject(HttpClient);

  private readonly BASE = environment.BaseUrl.replace(/\/+$/, '');
  private readonly resourceUrl = `${this.BASE}/api/v1/results`;

  /** GET /api/v1/results/{id} */
  findById(id: number): Observable<Result> {
    return this.http.get<Result>(`${this.resourceUrl}/${id}`);
  }

  /** POST /api/v1/results */
  save(result: Result): Observable<Result> {
    return this.http.post<Result>(this.resourceUrl, result);
  }

  /** PUT /api/v1/results/{id} */
  update(id: number, result: Result): Observable<Result> {
    return this.http.put<Result>(`${this.resourceUrl}/${id}`, result);
  }

  /** DELETE /api/v1/results/{id} */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }

  /** POST /api/v1/results/{id}/restore */
  restore(id: number): Observable<void> {
    return this.http.post<void>(`${this.resourceUrl}/${id}/restore`, null);
  }

  /** GET /api/v1/results */
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

  /** GET /api/v1/results/getAllPaginated */
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

    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    if (q?.trim()) {
      params = params.set('q', q.trim());
    }

    if (state?.trim()) {
      params = params.set('state', state.trim());
    }

    if (sort?.trim()) {
      params = params.set('sort', sort.trim());
    }

    return this.http.get<Page<Result>>(`${this.resourceUrl}/getAllPaginated`, {
      params,
    });
  }

  /** DELETE /api/v1/results/all, si el backend lo soporta */
  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/all`);
  }
}
