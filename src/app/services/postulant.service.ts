import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Postulant } from '../models/postulant';

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
export class PostulantService {
  private http = inject(HttpClient);

  private readonly resourceUrl = `${environment.apiBaseUrl}/postulants`;
  private readonly demandPersonsUrl = `${environment.apiBaseUrl}/demand/persons`;

  getAll(): Observable<Postulant[]> {
    return this.http.get<Postulant[]>(`${this.resourceUrl}`);
  }

  getAllRaw(): Observable<Postulant[]> {
    return this.http.get<Postulant[]>(`${this.resourceUrl}/all`);
  }

  getDeleted(): Observable<Postulant[]> {
    return this.http.get<Postulant[]>(`${this.resourceUrl}/deleted`);
  }

  getAllPaginated(
    opts: {
      page?: number;
      size?: number;
      name?: string;
      sort?: string;
    } = {},
  ): Observable<Page<Postulant>> {
    const { page = 0, size = 10, name, sort } = opts;

    let params = new HttpParams().set('page', page).set('size', size);

    if (name) params = params.set('name', name);
    if (sort) params = params.set('sort', sort);

    return this.http.get<Page<Postulant>>(
      `${this.resourceUrl}/getAllPaginated`,
      { params },
    );
  }

  getPersonByRut(rut: string): Observable<Postulant> {
    return this.http.get<Postulant>(
      `${this.demandPersonsUrl}/rut/${encodeURIComponent(rut)}`,
    );
  }

  getById(id: number): Observable<Postulant> {
    return this.http.get<Postulant>(`${this.resourceUrl}/${id}`);
  }

  create(data: Partial<Postulant>): Observable<Postulant> {
    return this.http.post<Postulant>(`${this.resourceUrl}`, data);
  }

  update(id: number, data: Partial<Postulant>): Observable<Postulant> {
    return this.http.put<Postulant>(`${this.resourceUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }

  restore(id: number) {
    return this.http.post(`${this.resourceUrl}/${id}/restore`, {});
  }
}