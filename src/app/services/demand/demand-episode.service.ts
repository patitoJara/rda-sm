import { HttpClient, HttpParams } from '@angular/common/http';
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
    return this.http.get<any>(
      `${this.resourceUrl}/persons/rut/${encodeURIComponent(rut)}`,
    );
  }

  getActiveEpisodeByRut(rut: string): Observable<any> {
    return this.http.get<any>(
      `${this.resourceUrl}/episodes/active/by-rut/${encodeURIComponent(rut)}`,
    );
  }

  getLongitudinalByRut(rut: string): Observable<any> {
    return this.http.get<any>(
      `${this.resourceUrl}/episodes/by-rut/${encodeURIComponent(rut)}/longitudinal`,
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

  getPrioritizedEpisodes(
    opts: {
      page?: number;
      size?: number;
      programId?: number | null;
      stateCode?: string | null;
      biopsychosocialCommitmentCode?: string | null;
      resultCode?: string | null;
      sort?: string | null;
    } = {},
  ): Observable<any> {
    const {
      page = 0,
      size = 10,
      programId,
      stateCode,
      resultCode,
      sort,
    } = opts;

    let params = new HttpParams().set('page', page).set('size', size);

    if (programId) params = params.set('programId', programId);
    if (stateCode) params = params.set('stateCode', stateCode);
    if (resultCode) params = params.set('resultCode', resultCode);
    if (sort) params = params.set('sort', sort);

    return this.http.get<any>(`${this.resourceUrl}/episodes/prioritized`, {
      params,
    });
  }

  createEpisode(payload: {
    postulantId: number;
    initialProgramId: number;
    episodeTypeId?: number | null;
    episodeTypeCode?: string | null;
    originalRequestDate?: string | null;
    responsibleUserId?: number | null;
    contactTypeId?: number | null;
    senderId?: number | null;
    diverterId?: number | null;
    contactId?: number | null;
    initialObservation?: string | null;
  }): Observable<any> {
    return this.http.post<any>(`${this.resourceUrl}/episodes`, payload);
  }

  createCitation(
    episodeId: number,
    payload: {
      stageId?: number | null;
      citationDate: string;
      citationTime: string;
      citationTypeCode: string;
      professionalUserId?: number | null;
      programProfessionalId?: number | null;
      professionName?: string | null;
      programId?: number | null;
      citationComment?: string | null;
      nextAction?: string | null;
      nextActionDate?: string | null;
    },
  ): Observable<any> {
    return this.http.post<any>(
      `${this.resourceUrl}/episodes/${episodeId}/citations`,
      payload,
    );
  }
  closeEpisode(
    episodeId: number,
    payload: {
      closureDate: string;
    },
  ): Observable<any> {
    return this.http.post<any>(
      `${this.resourceUrl}/episodes/${episodeId}/close`,
      payload,
    );
  }
  createEvent(
    episodeId: number,
    payload: {
      eventTypeCode: string;
      eventDate?: string | null;
      eventTime?: string | null;

      stageId?: number | null;
      programId?: number | null;

      programProfessionalId?: number | null;
      professionalUserId?: number | null;
      professionName?: string | null;

      relatedEventId?: number | null;

      attendanceStatusId?: number | null;
      attendanceStatusCode?: string | null;

      comment?: string | null;
      citationComment?: string | null;
      observation?: string | null;

      nextAction?: string | null;
      nextActionDate?: string | null;

      biopsychosocialCommitmentCode?: string | null;
      resultCode?: string | null;
      stateCode?: string | null;
    },
  ): Observable<any> {
    return this.http.post<any>(
      `${this.resourceUrl}/episodes/${episodeId}/events`,
      payload,
    );
  }
}
