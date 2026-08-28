import {
  formatDateForBackend,
  toStringOrNull,
} from '../utils/demand-new-format.utils';
import { buildEventTime24 } from '../utils/demand-new-event.utils';
export interface CitationSuccessResult {
  successMessage: string;
  resetValue: {
    citationTypeCode: null;
    eventDate: Date | null;
    eventHour: string;
    programProfessionalId: null;
    professionName: string;
    citationComment: string;
  };
}

export interface CitationContextInput {
  raw: any;
  programId: number | string;
  longitudinal: any;
}

export interface CitationPayload {
  stageId: number;
  citationDate: string;
  citationTime: string;
  citationTypeCode: string;
  programId: number;
  programProfessionalId: number | null;
  professionName: string | null;
  citationComment: string | null;
}

export type CitationContextResult =
  | {
      valid: true;
      payload: CitationPayload;
    }
  | {
      valid: false;
      errorMessage: string;
    };



export function buildCitationContext(
  input: CitationContextInput,
): CitationContextResult {
  const { raw, programId, longitudinal } = input;

  const citationTypeCode = toStringOrNull(raw.citationTypeCode);
  const citationDate = formatDateForBackend(raw.eventDate);
  const citationTime = buildEventTime24(raw.eventHour);

  if (!citationTypeCode) {
    return {
      valid: false,
      errorMessage: 'Debe seleccionar el tipo de citación.',
    };
  }

  if (!citationDate) {
    return {
      valid: false,
      errorMessage:
        'Debe seleccionar una fecha válida para la citación.',
    };
  }

  if (!citationTime) {
    return {
      valid: false,
      errorMessage:
        'Debe ingresar una hora válida en formato de 24 horas (HH:mm).',
    };
  }

  const stageId =
    longitudinal?.activeEpisode?.currentStageId ??
    longitudinal?.stages?.find(
      (stage: any) => stage?.current,
    )?.id ??
    null;

  if (!stageId) {
    return {
      valid: false,
      errorMessage:
        'No fue posible identificar la etapa activa del episodio.',
    };
  }

  return {
    valid: true,
    payload: {
      stageId: Number(stageId),
      citationDate,
      citationTime,
      citationTypeCode,
      programId: Number(programId),
      programProfessionalId: raw.programProfessionalId
        ? Number(raw.programProfessionalId)
        : null,
      professionName: toStringOrNull(raw.professionName),
      citationComment: toStringOrNull(raw.citationComment),
    },
  };
}

export function handleCitationSuccess(
  event: any,
): CitationSuccessResult {
  console.log('[DemandNew] Citación registrada:', event);

  return {
    successMessage: 'Citación registrada correctamente.',
    resetValue: {
      citationTypeCode: null,
      eventDate: null,
      eventHour: '',
      programProfessionalId: null,
      professionName: '',
      citationComment: '',
    },
  };
}
