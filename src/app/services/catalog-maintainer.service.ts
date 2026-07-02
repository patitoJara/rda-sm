// ============================================================
// ✅ CATALOG MAINTAINER SERVICE
// Servicio genérico para catálogos RDA-SM de Demanda
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

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
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
  private readonly MAINTAINERS_URL = `${this.API}/demand/maintainers`;

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
  // Mantenedores de catálogos de Demanda
  // Base real: /api/v1/demand/maintainers/{catalog}
  // ============================================================

  getAll(resource: string, q?: string, active?: boolean): Observable<CatalogItem[]> {
    let params = new HttpParams();

    if (q) {
      params = params.set('q', q);
    }

    if (active !== undefined) {
      params = params.set('active', String(active));
    }

    return this.http.get<CatalogItem[]>(
      `${this.MAINTAINERS_URL}/${resource}`,
      { params },
    );
  }

  getById(resource: string, id: number): Observable<CatalogItem> {
    return this.http.get<CatalogItem>(
      `${this.MAINTAINERS_URL}/${resource}/${id}`,
    );
  }

  create(resource: string, payload: CatalogItem): Observable<CatalogItem> {
    return this.http.post<CatalogItem>(
      `${this.MAINTAINERS_URL}/${resource}`,
      payload,
    );
  }

  update(
    resource: string,
    id: number,
    payload: CatalogItem,
  ): Observable<CatalogItem> {
    return this.http.put<CatalogItem>(
      `${this.MAINTAINERS_URL}/${resource}/${id}`,
      payload,
    );
  }

  delete(resource: string, id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.MAINTAINERS_URL}/${resource}/${id}`,
    );
  }

  restore(resource: string, id: number): Observable<void> {
    return this.http.post<void>(
      `${this.MAINTAINERS_URL}/${resource}/${id}/restore`,
      {},
    );
  }

  getAllPaginated(
    resource: string,
    opts: {
      page?: number;
      size?: number;
      q?: string;
      active?: boolean;
      sort?: string;
    } = {},
  ): Observable<Page<CatalogItem>> {
    const { page = 0, size = 10, q, active, sort } = opts;

    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (q) {
      params = params.set('q', q);
    }

    if (active !== undefined) {
      params = params.set('active', String(active));
    }

    if (sort) {
      params = params.set('sort', sort);
    }

    return this.http.get<Page<CatalogItem>>(
      `${this.MAINTAINERS_URL}/${resource}/getAllPaginated`,
      { params },
    );
  }
}