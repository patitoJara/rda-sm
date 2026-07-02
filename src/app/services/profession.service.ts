// src/app/services/profession.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Profession } from '../models/profession';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

@Injectable({ providedIn: 'root' })
export class ProfessionService {
  private http = inject(HttpClient);

  private readonly resourceUrl = `${environment.apiBaseUrl}/professions`;

  /** GET /professions/{id} */
  findById(id: number): Observable<Profession> {
    return this.http.get<Profession>(`${this.resourceUrl}/${id}`);
  }

  /** PUT /professions/{id} */
  update(id: number, profession: Profession): Observable<Profession> {
    return this.http.put<Profession>(`${this.resourceUrl}/${id}`, profession);
  }

  /** DELETE /professions/{id} */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }

  /** GET /professions */
  listAll(): Observable<Profession[]> {
    return this.http.get<Profession[]>(this.resourceUrl);
  }

  /** GET /professions/all */
  getAll(): Observable<Profession[]> {
    return this.http.get<Profession[]>(`${this.resourceUrl}/all`);
  }

  /** GET /professions/deleted */
  getDeleted(): Observable<Profession[]> {
    return this.http.get<Profession[]>(`${this.resourceUrl}/deleted`);
  }

  /** POST /professions */
  save(profession: Profession): Observable<Profession> {
    return this.http.post<Profession>(this.resourceUrl, profession);
  }

  /** POST /professions/{id}/restore */
  restore(id: number): Observable<Profession> {
    return this.http.post<Profession>(`${this.resourceUrl}/${id}/restore`, {});
  }

  /** GET /professions/getAllPaginated?page=&size=&name=&sort= */
  getAllPaginated(
    opts: { page?: number; size?: number; q?: string; sort?: string } = {},
  ): Observable<Page<Profession>> {
    const { page = 0, size = 10, q, sort } = opts;

    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (q) {
      params = params.set('name', q);
    }

    if (sort) {
      params = params.set('sort', sort);
    }

    return this.http.get<Page<Profession>>(
      `${this.resourceUrl}/getAllPaginated`,
      { params },
    );
  }

  /** DELETE /professions/all (si tu API lo soporta) */
  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/all`);
  }
}

