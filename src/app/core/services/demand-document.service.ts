import { Injectable, inject } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  DemandDocumentAssociation,
  DemandDocumentTypeDTO,
  DocumentDisposition,
  EpisodeDocumentDTO,
  UpdateEpisodeDocumentRequest,
} from '../models/demand-document.models';

@Injectable({
  providedIn: 'root',
})
export class DemandDocumentService {
  private readonly http = inject(HttpClient);

  private readonly demandUrl = `${environment.apiBaseUrl}/demand`;

  getDocumentTypes(): Observable<DemandDocumentTypeDTO[]> {
    return this.http.get<DemandDocumentTypeDTO[]>(
      `${this.demandUrl}/document-types`,
    );
  }

  listDocuments(
    episodeId: number,
  ): Observable<EpisodeDocumentDTO[]> {
    return this.http.get<EpisodeDocumentDTO[]>(
      `${this.demandUrl}/episodes/${episodeId}/documents`,
    );
  }

  uploadDocument(
    episodeId: number,
    file: File,
    documentTypeCode: string,
    association: DemandDocumentAssociation = {},
  ): Observable<EpisodeDocumentDTO> {
    const formData = new FormData();

    formData.append('file', file, file.name);

    let params = new HttpParams().set(
      'documentTypeCode',
      documentTypeCode,
    );

    params = this.addAssociationParams(
      params,
      association,
    );

    return this.http.post<EpisodeDocumentDTO>(
      `${this.demandUrl}/episodes/${episodeId}/documents`,
      formData,
      { params },
    );
  }

  updateDocument(
    documentId: number,
    payload: UpdateEpisodeDocumentRequest,
  ): Observable<EpisodeDocumentDTO> {
    return this.http.put<EpisodeDocumentDTO>(
      `${this.demandUrl}/documents/${documentId}`,
      payload,
    );
  }

  replaceDocument(
    documentId: number,
    file: File,
    documentTypeCode?: string | null,
    association: DemandDocumentAssociation = {},
  ): Observable<EpisodeDocumentDTO> {
    const formData = new FormData();

    formData.append('file', file, file.name);

    let params = new HttpParams();

    if (documentTypeCode) {
      params = params.set(
        'documentTypeCode',
        documentTypeCode,
      );
    }

    params = this.addAssociationParams(
      params,
      association,
    );

    return this.http.put<EpisodeDocumentDTO>(
      `${this.demandUrl}/documents/${documentId}/replace`,
      formData,
      { params },
    );
  }

  downloadDocument(
    documentId: number,
    disposition: DocumentDisposition = 'inline',
  ): Observable<HttpResponse<Blob>> {
    const params = new HttpParams().set(
      'disposition',
      disposition,
    );

    return this.http.get(
      `${this.demandUrl}/documents/${documentId}/download`,
      {
        params,
        observe: 'response',
        responseType: 'blob',
      },
    );
  }

  deleteDocument(documentId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.demandUrl}/documents/${documentId}`,
    );
  }

  private addAssociationParams(
    currentParams: HttpParams,
    association: DemandDocumentAssociation,
  ): HttpParams {
    let params = currentParams;

    if (association.stageId != null) {
      params = params.set(
        'stageId',
        String(association.stageId),
      );
    }

    if (association.eventId != null) {
      params = params.set(
        'eventId',
        String(association.eventId),
      );
    }

    if (association.referenceId != null) {
      params = params.set(
        'referenceId',
        String(association.referenceId),
      );
    }

    return params;
  }
}
