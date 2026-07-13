import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

import {
  ProgramProfessional,
  ProgramProfessionalPage,
  ProgramProfessionalPayload,
} from '../models/program-professional.model';

@Injectable({
  providedIn: 'root',
})
export class ProgramProfessionalService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = `${environment.apiBaseUrl}/program_professionals`;

  getActive(): Observable<ProgramProfessional[]> {
    return this.http.get<ProgramProfessional[]>(this.baseUrl);
  }

  getAll(): Observable<ProgramProfessional[]> {
    return this.http.get<ProgramProfessional[]>(`${this.baseUrl}/all`);
  }

  getDeleted(): Observable<ProgramProfessional[]> {
    return this.http.get<ProgramProfessional[]>(`${this.baseUrl}/deleted`);
  }

  getById(id: number): Observable<ProgramProfessional> {
    return this.http.get<ProgramProfessional>(`${this.baseUrl}/${id}`);
  }

  findById(id: number): Observable<ProgramProfessional> {
    return this.http.get<ProgramProfessional>(`${this.baseUrl}/findById/${id}`);
  }

  getByProgram(programId: number): Observable<ProgramProfessional[]> {
    return this.http.get<ProgramProfessional[]>(
      `${this.baseUrl}/program/${programId}`,
    );
  }

  getPaginated(filters?: {
    q?: string | null;
    professionId?: number | null;
    programId?: number | null;
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<ProgramProfessionalPage> {
    let params = new HttpParams();

    if (filters?.q) {
      params = params.set('q', filters.q);
    }

    if (filters?.professionId) {
      params = params.set('professionId', String(filters.professionId));
    }

    if (filters?.programId) {
      params = params.set('programId', String(filters.programId));
    }

    params = params.set('page', String(filters?.page ?? 0));
    params = params.set('size', String(filters?.size ?? 20));

    if (filters?.sort) {
      params = params.set('sort', filters.sort);
    }

    return this.http.get<ProgramProfessionalPage>(
      `${this.baseUrl}/getAllPaginated`,
      { params },
    );
  }

  create(payload: ProgramProfessionalPayload): Observable<ProgramProfessional> {
    return this.http.post<ProgramProfessional>(this.baseUrl, payload);
  }

  update(
    id: number,
    payload: ProgramProfessionalPayload,
  ): Observable<ProgramProfessional> {
    return this.http.put<ProgramProfessional>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  restore(id: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/restore/${id}`, {});
  }

  getDeletedProgramRelations(professionalId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/${professionalId}/program-relations/deleted`,
    );
  }
}
