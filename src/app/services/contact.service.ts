import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Contact } from '../models/contact';
import { ContactCreateDto } from '../models/contact-create.dto';

@Injectable({
  providedIn: 'root',
})
export class ContactService {
  private readonly http = inject(HttpClient);

  private readonly resourceUrl = `${environment.apiBaseUrl}/contacts`;

  getAll(): Observable<Contact[]> {
    return this.http.get<Contact[]>(this.resourceUrl);
  }

  getAllRaw(): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.resourceUrl}/all`);
  }

  getDeleted(): Observable<Contact[]> {
    return this.http.get<Contact[]>(`${this.resourceUrl}/deleted`);
  }

  getById(id: number): Observable<Contact> {
    return this.http.get<Contact>(`${this.resourceUrl}/${id}`);
  }

  createDto(data: ContactCreateDto): Observable<Contact> {
    return this.http.post<Contact>(this.resourceUrl, data);
  }

  update(id: number, data: ContactCreateDto): Observable<Contact> {
    return this.http.put<Contact>(`${this.resourceUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl}/${id}`);
  }

  restore(id: number): Observable<unknown> {
    return this.http.post(`${this.resourceUrl}/${id}/restore`, {});
  }

  getByPostulant(postulantId: number): Observable<Contact> {
    return this.http.get<Contact>(
      `${this.resourceUrl}/by-postulant/${postulantId}`,
    );
  }

  getAllByPostulant(postulantId: number): Observable<Contact[]> {
    return this.http.get<Contact[]>(
      `${this.resourceUrl}/by-postulant/${postulantId}/all`,
    );
  }
}
