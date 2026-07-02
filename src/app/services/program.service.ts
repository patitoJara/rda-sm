// src/app/services/program.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Program } from '../models/program';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class ProgramService {
  private http = inject(HttpClient);

  private readonly resourceUrl = `${environment.apiBaseUrl}/programs`;

  /** GET /programs/{id} */
  findById(id: number): Observable<Program> {
    return this.http.get<Program>(`${this.resourceUrl}/${id}`);
  }

  /** PUT /programs/{id} */
  update(id: number, program: Program): Observable<Program> {
    return this.http.put<Program>(`${this.resourceUrl}/${id}`, program);
  }

  /** DELETE /programs/{id} */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }

  /** GET /programs */
  listAll(): Observable<Program[]> {
    return this.http.get<Program[]>(this.resourceUrl);
  }

  /** GET /programs/all */
  getAll(): Observable<Program[]> {
    return this.http.get<Program[]>(`${this.resourceUrl}/all`);
  }

  /** GET /programs/deleted */
  getDeleted(): Observable<Program[]> {
    return this.http.get<Program[]>(`${this.resourceUrl}/deleted`);
  }

  /** POST /programs */
  save(program: Program): Observable<Program> {
    return this.http.post<Program>(this.resourceUrl, program);
  }

  /** POST /programs/{id}/restore */
  restore(id: number): Observable<Program> {
    return this.http.post<Program>(`${this.resourceUrl}/${id}/restore`, {});
  }

  /** GET /programs/getAllPaginated?page=&size=&q=&state=&sort= */
  getAllPaginated(
    opts: { page?: number; size?: number; q?: string; state?: string; sort?: string } = {},
  ): Observable<Page<Program>> {
    const { page = 0, size = 10, q, state, sort } = opts;

    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (q) {
      params = params.set('q', q);
    }

    if (state) {
      params = params.set('state', state);
    }

    if (sort) {
      params = params.set('sort', sort);
    }

    return this.http.get<Page<Program>>(
      `${this.resourceUrl}/getAllPaginated`,
      { params },
    );
  }

  /** DELETE /programs/all */
  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/all`);
  }
}