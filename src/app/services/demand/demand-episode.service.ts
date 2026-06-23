import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class DemandEpisodeService {
  private readonly http = inject(HttpClient);
  private readonly resourceUrl = `${environment.apiBaseUrl}/demand`;

  getPersonByRut(rut: string): Observable<any> {
    return this.http.get<any>(`${this.resourceUrl}/persons/rut/${rut}`);
  }

  getActiveEpisodeByRut(rut: string): Observable<any> {
    return this.http.get<any>(
      `${this.resourceUrl}/episodes/active/by-rut/${rut}`,
    );
  }

  getLongitudinalByRut(rut: string): Observable<any> {
    return this.http.get<any>(
      `${this.resourceUrl}/episodes/by-rut/${rut}/longitudinal`,
    );
  }

  getLongitudinalByEpisodeId(id: number): Observable<any> {
    return this.http.get<any>(
      `${this.resourceUrl}/episodes/${id}/longitudinal`,
    );
  }

  getDemandCatalogs(): Observable<any> {
    return this.http.get<any>(`${this.resourceUrl}/catalogs`);
  }
}