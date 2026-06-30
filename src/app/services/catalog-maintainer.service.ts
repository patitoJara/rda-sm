// ============================================================
// ✅ CATALOG MAINTAINER SERVICE
// Servicio genérico para mantenedores simples y catálogos RDA-SM
// ============================================================

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CatalogItem {
  id?: number | null;
  code?: string | null;
  name: string;
  description?: string | null;
  active?: boolean;
  deletedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type DemandCatalogKey =
  | 'episodeTypes'
  | 'eventTypes'
  | 'attendanceStatuses'
  | 'closureReasons'
  | 'programPopulations'
  | 'programModalities'
  | 'programPlans'
  | 'documentTypes'
  | 'alertTypes'
  | 'priorityLevels'
  | 'alertStatuses'
  | 'regions'
  | 'cities';

@Injectable({ providedIn: 'root' })
export class CatalogMaintainerService {
  private http = inject(HttpClient);

  private readonly BASE = environment.BaseUrl.replace(/\/+$/, '');
  private readonly API = `${this.BASE}/api/v1`;
  private readonly DEMAND_CATALOGS_URL = `${this.API}/demand/catalogs`;

  // ============================================================
  // Catálogos nuevos de Demanda
  // Fuente oficial: GET /api/v1/demand/catalogs
  // ============================================================
  getDemandCatalog(key: DemandCatalogKey): Observable<CatalogItem[]> {
    return this.http
      .get<Record<string, CatalogItem[]>>(this.DEMAND_CATALOGS_URL)
      .pipe(map((res) => res?.[key] ?? []));
  }

  // ============================================================
  // CRUD directo para mantenedores con endpoint propio
  // Ej: roles, programs, communes, users, etc.
  // ============================================================
  getAll(resource: string, includeDeleted = false): Observable<CatalogItem[]> {
    let params = new HttpParams();

    if (includeDeleted) {
      params = params.set('includeDeleted', 'true');
    }

    return this.http.get<CatalogItem[]>(`${this.API}/${resource}`, { params });
  }

  getById(resource: string, id: number): Observable<CatalogItem> {
    return this.http.get<CatalogItem>(`${this.API}/${resource}/${id}`);
  }

  create(resource: string, payload: CatalogItem): Observable<CatalogItem> {
    return this.http.post<CatalogItem>(`${this.API}/${resource}`, payload);
  }

  update(
    resource: string,
    id: number,
    payload: CatalogItem,
  ): Observable<CatalogItem> {
    return this.http.put<CatalogItem>(`${this.API}/${resource}/${id}`, payload);
  }

  delete(resource: string, id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${resource}/${id}`);
  }

  restore(resource: string, id: number): Observable<CatalogItem> {
    return this.http.post<CatalogItem>(
      `${this.API}/${resource}/${id}/restore`,
      {},
    );
  }
}