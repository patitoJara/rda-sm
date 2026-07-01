// src/app/services/contact.type.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ContactType } from '../models/contact.type';

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  // empty?: boolean; // si tu backend lo envía
}

@Injectable({ providedIn: 'root' })
export class ContactTypeService {
  private http = inject(HttpClient);

  // Deriva las URLs desde tu BaseUrl (sin barra final)
  private readonly resourceUrl = `${environment.apiBaseUrl}/contacts_types`;

  /** GET /contacts_Types/{id} */
  findById(id: number): Observable<ContactType> {
    return this.http.get<ContactType>(`${this.resourceUrl}/${id}`);
  }

  /** PUT /contacts_Types/{id} */
  update(id: number, data: ContactType): Observable<ContactType> {
    return this.http.put<ContactType>(`${this.resourceUrl}/${id}`, data);
  }

  /** DELETE /contacts_Types/{id} */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }

  /** GET /contacts_Types */
  listAll(): Observable<ContactType[]> {
    return this.http.get<ContactType[]>(this.resourceUrl);
  }

  /** GET /contact-types/all */
  getAll(): Observable<ContactType[]> {
    return this.http.get<ContactType[]>(`${this.resourceUrl}/all`);
  }

  /** GET /contact-types/deleted */
  getDeleted(): Observable<ContactType[]> {
    return this.http.get<ContactType[]>(`${this.resourceUrl}/deleted`);
  }

  /** POST /contacts_Types */
  save(data: ContactType): Observable<ContactType> {
    return this.http.post<ContactType>(this.resourceUrl, data);
  }

  /** POST /contacts_Types/{id}/restore */
  restore(id: number): Observable<ContactType> {
    return this.http.post<ContactType>(`${this.resourceUrl}/${id}/restore`, {});
  }

  /** GET /contacts_Types/getAllPaginated?page=&size=&q=&state=&sort= */
  listPaginated(
    opts: {
      page?: number;
      size?: number;
      q?: string;
      state?: string;
      sort?: string;
    } = {},
  ): Observable<Page<ContactType>> {
    const { page = 0, size = 10, q, state, sort } = opts;

    let params = new HttpParams().set('page', page).set('size', size);

    if (q) params = params.set('q', q);
    if (state) params = params.set('state', state);
    if (sort) params = params.set('sort', sort);

    return this.http.get<Page<ContactType>>(
      `${this.resourceUrl}/getAllPaginated`,
      { params },
    );
  }

  /** DELETE /contacts_Types/all (si tu API lo soporta) */
  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/all`);
  }
}
