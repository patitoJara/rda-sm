import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { State } from '../models/state';

@Injectable({
  providedIn: 'root',
})
export class StateService {
  private readonly baseUrl = `${environment.apiBaseUrl}/states`;

  constructor(
    private http: HttpClient,
  ) {}

  /**
   * Lista los estados activos.
   */
  listAll(): Observable<State[]> {
    return this.http.get<State[]>(
      this.baseUrl,
    );
  }

  /**
   * Lista todos los estados, incluidos los eliminados.
   */
  getAll(): Observable<State[]> {
    return this.http.get<State[]>(
      `${this.baseUrl}/all`,
    );
  }

  /**
   * Lista solamente los estados eliminados.
   */
  getDeleted(): Observable<State[]> {
    return this.http.get<State[]>(
      `${this.baseUrl}/deleted`,
    );
  }

  /**
   * Obtiene un estado por ID.
   */
  getById(id: number): Observable<State> {
    return this.http.get<State>(
      `${this.baseUrl}/${id}`,
    );
  }

  /**
   * Crea un nuevo estado.
   */
  save(payload: State): Observable<State> {
    return this.http.post<State>(
      this.baseUrl,
      payload,
    );
  }

  /**
   * Actualiza un estado existente.
   */
  update(
    id: number,
    payload: State,
  ): Observable<State> {
    return this.http.put<State>(
      `${this.baseUrl}/${id}`,
      payload,
    );
  }

  /**
   * Elimina lógicamente un estado.
   */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${id}`,
    );
  }

  /**
   * Restaura un estado eliminado.
   */
  restore(id: number): Observable<void> {
    return this.http.put<void>(
      `${this.baseUrl}/restore/${id}`,
      {},
    );
  }
}