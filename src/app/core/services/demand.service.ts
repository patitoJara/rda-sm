import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  PageDTO,
  PrioritizedEpisodeDTO,
  PrioritizedEpisodeQuery,
  SupervisorDashboardDTO,
  SupervisorProgramDashboardDTO,
  SupervisorProgramReferenceDTO,
} from '../models/demand-priority.models';

export interface DemandCatalogItem {
  id: number;
  code: string;
  name: string;
}

export interface DemandCatalogsDTO {
  episodeTypes: DemandCatalogItem[];
  eventTypes: DemandCatalogItem[];
  attendanceStatuses: DemandCatalogItem[];
  citationTypes: DemandCatalogItem[];
  biopsychosocialCommitmentLevels: DemandCatalogItem[];
  closureReasons: DemandCatalogItem[];
  programPopulations: DemandCatalogItem[];
  programModalities: DemandCatalogItem[];
  programPlans: DemandCatalogItem[];
  regions: DemandCatalogItem[];
  cities: DemandCatalogItem[];
}

export interface DemandPersonDTO {
  id?: number;
  rut?: string;
  run?: string;
  dv?: string;
  firstName?: string;
  lastName?: string;
  secondLastName?: string;
  fullName?: string;
  birthDate?: string;
  sexId?: number;
  communeId?: number;
  phone?: string;
  email?: string;
  address?: string;
  [key: string]: any;
}

export interface EpisodeDTO {
  id: number;
  personId?: number;
  rut?: string;
  episodeTypeId?: number;
  originalRequestDate?: string;
  currentProgramId?: number;
  initialProgramId?: number;
  currentStageId?: number;
  status?: string;
  state?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface CreateEpisodeRequest {
  personId?: number;
  rut?: string;
  episodeTypeId?: number;
  originalRequestDate?: string;
  initialProgramId?: number;
  currentProgramId?: number;
  contactTypeId?: number;
  senderId?: number;
  diverterId?: number;
  observation?: string;
  initialObservation?: string;
  [key: string]: any;
}

export interface CreateEventRequest {
  eventTypeId: number;
  eventDate?: string;
  description?: string;
  observation?: string;
  professionalId?: number;
  [key: string]: any;
}

export interface CreateSubstanceRequest {
  substanceId: number;
  isPrimary?: boolean;
  order?: number;
  [key: string]: any;
}

export interface TreatmentEntryRequest {
  entryDate?: string;
  treatmentProgramId?: number;
  observation?: string;
  [key: string]: any;
}

export interface CloseEpisodeRequest {
  closureReasonId: number;
  closureDate?: string;
  observation?: string;
  [key: string]: any;
}

export interface EgressEpisodeRequest {
  egressDate?: string;
  closureReasonId?: number;
  observation?: string;
  [key: string]: any;
}

export interface ReferenceEpisodeRequest {
  targetProgramId: number;
  referenceDate?: string;
  reason?: string;
  observation?: string;
  [key: string]: any;
}

export interface PurgeEpisodeResponse {
  episodeId: number;
  episodeCode: string;
  postulantId: number;
  databasePurged: boolean;
  deletedRows: Record<string, number>;
  deletedFiles: number;
  failedFiles: number;
  failedFilePaths: string[];
  skippedUnsafeFilePaths: string[];
}

export interface CreateCitationRequest {
  citationDate: string;
  professionalId?: number;
  observation?: string;
  [key: string]: any;
}

export interface RegisterAttendanceRequest {
  citationId?: number;
  attendanceStatusId: number;
  attendanceDate?: string;
  observation?: string;
  [key: string]: any;
}

export interface CreateAlertRequest {
  alertType?: string;
  alertDate?: string;
  description?: string;
  [key: string]: any;
}

export interface ReverseEpisodeRequest {
  reason: string;
  observation?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class DemandService {
  private readonly http = inject(HttpClient);

  private readonly demandUrl = `${environment.apiBaseUrl}/demand`;


  getCatalogs(): Observable<DemandCatalogsDTO> {
    return this.http.get<DemandCatalogsDTO>(`${this.demandUrl}/catalogs`);
  }

  findPersonByRut(rut: string): Observable<DemandPersonDTO> {
    const cleanRut = this.normalizeRut(rut);
    return this.http.get<DemandPersonDTO>(
      `${this.demandUrl}/persons/rut/${encodeURIComponent(cleanRut)}`
    );
  }

  findActiveEpisodeByRut(rut: string): Observable<EpisodeDTO> {
    const cleanRut = this.normalizeRut(rut);
    return this.http.get<EpisodeDTO>(
      `${this.demandUrl}/episodes/active/by-rut/${encodeURIComponent(cleanRut)}`
    );
  }

  getEpisode(id: number): Observable<EpisodeDTO> {
    return this.http.get<EpisodeDTO>(`${this.demandUrl}/episodes/${id}`);
  }

  getEpisodeLongitudinal(id: number): Observable<any> {
    return this.http.get<any>(`${this.demandUrl}/episodes/${id}/longitudinal`);
  }

  getLongitudinalByRut(rut: string): Observable<any> {
    const cleanRut = this.normalizeRut(rut);
    return this.http.get<any>(
      `${this.demandUrl}/episodes/by-rut/${encodeURIComponent(
        cleanRut
      )}/longitudinal`
    );
  }

  getPrioritizedEpisodes(
    query: PrioritizedEpisodeQuery = {},
  ): Observable<PageDTO<PrioritizedEpisodeDTO>> {
    let params = new HttpParams()
      .set('page', String(query.page ?? 0))
      .set('size', String(query.size ?? 20));

    if (
      query.programId !== null &&
      query.programId !== undefined
    ) {
      params = params.set(
        'programId',
        String(query.programId),
      );
    }

    if (query.stateCode) {
      params = params.set('stateCode', query.stateCode);
    }

    if (query.resultCode) {
      params = params.set('resultCode', query.resultCode);
    }

    if (query.sort) {
      params = params.set('sort', query.sort);
    }
    return this.http.get<PageDTO<PrioritizedEpisodeDTO>>(
      `${this.demandUrl}/episodes/prioritized`,
      { params },
    );
  }

  getSupervisorDashboard(): Observable<SupervisorDashboardDTO> {
    return this.http.get<SupervisorDashboardDTO>(
      `${this.demandUrl}/dashboard/supervisor`,
    );
  }

  getSupervisorProgramsDashboard(): Observable<
    SupervisorProgramDashboardDTO[]
  > {
    return this.http.get<SupervisorProgramDashboardDTO[]>(
      `${this.demandUrl}/dashboard/supervisor/programs`,
    );
  }
  getSupervisorProgramsReferences(
    from?: string,
    to?: string,
  ): Observable<SupervisorProgramReferenceDTO[]> {
    let params = new HttpParams();

    if (from) {
      params = params.set('from', from);
    }

    if (to) {
      params = params.set('to', to);
    }

    return this.http.get<SupervisorProgramReferenceDTO[]>(
      `${this.demandUrl}/dashboard/supervisor/programs/references`,
      { params },
    );
  }

  createEpisode(payload: CreateEpisodeRequest): Observable<EpisodeDTO> {
    return this.http.post<EpisodeDTO>(`${this.demandUrl}/episodes`, payload);
  }

  registerTreatmentEntry(
    episodeId: number,
    payload: TreatmentEntryRequest
  ): Observable<EpisodeDTO> {
    return this.http.post<EpisodeDTO>(
      `${this.demandUrl}/episodes/${episodeId}/treatment-entry`,
      payload
    );
  }

  saveSubstances(
    episodeId: number,
    payload: CreateSubstanceRequest[]
  ): Observable<any> {
    return this.http.post<any>(
      `${this.demandUrl}/episodes/${episodeId}/substances`,
      payload
    );
  }

  reverseEpisode(
    episodeId: number,
    payload: ReverseEpisodeRequest
  ): Observable<EpisodeDTO> {
    return this.http.post<EpisodeDTO>(
      `${this.demandUrl}/episodes/${episodeId}/reverse`,
      payload
    );
  }

  createReference(
    episodeId: number,
    payload: ReferenceEpisodeRequest
  ): Observable<any> {
    return this.http.post<any>(
      `${this.demandUrl}/episodes/${episodeId}/references`,
      payload
    );
  }

  createEvent(episodeId: number, payload: CreateEventRequest): Observable<any> {
    return this.http.post<any>(
      `${this.demandUrl}/episodes/${episodeId}/events`,
      payload
    );
  }

  egressEpisode(
    episodeId: number,
    payload: EgressEpisodeRequest
  ): Observable<EpisodeDTO> {
    return this.http.post<EpisodeDTO>(
      `${this.demandUrl}/episodes/${episodeId}/egress`,
      payload
    );
  }

  closeEpisode(
    episodeId: number,
    payload: CloseEpisodeRequest
  ): Observable<EpisodeDTO> {
    return this.http.post<EpisodeDTO>(
      `${this.demandUrl}/episodes/${episodeId}/close`,
      payload
    );
  }

  purgeEpisode(episodeId: number): Observable<PurgeEpisodeResponse> {
    return this.http.delete<PurgeEpisodeResponse>(
      `${this.demandUrl}/episodes/${episodeId}/purge`
    );
  }

  createCitation(
    episodeId: number,
    payload: CreateCitationRequest
  ): Observable<any> {
    return this.http.post<any>(
      `${this.demandUrl}/episodes/${episodeId}/citations`,
      payload
    );
  }

  registerAttendance(
    episodeId: number,
    payload: RegisterAttendanceRequest
  ): Observable<any> {
    return this.http.post<any>(
      `${this.demandUrl}/episodes/${episodeId}/attendance`,
      payload
    );
  }

  createAlert(episodeId: number, payload: CreateAlertRequest): Observable<any> {
    return this.http.post<any>(
      `${this.demandUrl}/episodes/${episodeId}/alerts`,
      payload
    );
  }

  private normalizeRut(rut: string): string {
    return String(rut || '')
      .replace(/\./g, '')
      .replace(/\s/g, '')
      .toUpperCase()
      .trim();
  }
}
