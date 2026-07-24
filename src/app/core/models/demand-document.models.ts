export interface DemandDocumentTypeDTO {
  id: number;
  code: string;
  name: string;
}

export interface DemandDocumentUserDTO {
  id: number;
  name: string;
  email?: string | null;
}

export interface EpisodeDocumentDTO {
  id: number;
  episodeId: number;

  stageId: number | null;
  eventId: number | null;
  referenceId: number | null;

  documentTypeCode: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;

  uploadedByUser: DemandDocumentUserDTO | null;
  uploadedAt: string;
}

export interface DemandDocumentAssociation {
  stageId?: number | null;
  eventId?: number | null;
  referenceId?: number | null;
}

export interface UpdateEpisodeDocumentRequest {
  stageId?: number | null;
  eventId?: number | null;
  referenceId?: number | null;
  documentTypeCode?: string | null;
  originalFilename?: string | null;
}

export type DocumentDisposition = 'inline' | 'attachment';