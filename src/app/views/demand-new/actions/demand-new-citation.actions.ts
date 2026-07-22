import {
  formatDateForBackend,
  toStringOrNull,
} from '../utils/demand-new-format.utils';
import {
  buildEventTime,
} from '../utils/demand-new-event.utils';

export interface CitationSuccessResult {
  successMessage: string;
  resetValue: {
    eventDate: Date;
    eventHour: string;
    eventPeriod: string;
    programProfessionalId: null;
    professionName: string;
    comment: string;
    citationComment: string;
  };
}

export interface CitationContextInput {
  raw: any;
  programId: number | string;
  longitudinal: any;
}

export interface CitationPayload {
  eventTypeCode: 'CITACION';
  eventDate: string;
  eventTime: string;
  stageId: number;
  programId: number;
  programProfessionalId: number | null;
  professionName: string | null;
  comment: string | null;
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

  const eventDate = formatDateForBackend(raw.eventDate);
  const eventTime = buildEventTime(
    raw.eventHour,
    raw.eventPeriod,
  );

  if (!eventDate) {
    return {
      valid: false,
      errorMessage:
        'Debe seleccionar una fecha válida para la citación.',
    };
  }

  if (!eventTime) {
    return {
      valid: false,
      errorMessage:
        'Debe ingresar una hora válida y seleccionar AM o PM.',
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
      eventTypeCode: 'CITACION',
      eventDate,
      eventTime,
      stageId: Number(stageId),
      programId: Number(programId),
      programProfessionalId: raw.programProfessionalId
        ? Number(raw.programProfessionalId)
        : null,
      professionName: toStringOrNull(raw.professionName),
      comment: toStringOrNull(raw.comment),
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
      eventDate: new Date(),
      eventHour: '',
      eventPeriod: 'AM',
      programProfessionalId: null,
      professionName: '',
      comment: '',
      citationComment: '',
    },
  };
}