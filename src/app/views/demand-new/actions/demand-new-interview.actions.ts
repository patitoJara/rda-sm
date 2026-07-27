import {
  formatDateForBackend,
  toStringOrNull,
} from '../utils/demand-new-format.utils';
import { buildEventTime } from '../utils/demand-new-event.utils';

export interface FeedbackSuccessResult {
  successMessage: string;
  resetValue: {
    eventDate: Date;
    eventHour: string;
    eventPeriod: string;
    programProfessionalId: null;
    professionName: string;
    biopsychosocialCommitmentCode: null;
    resultCode: null;
  };
}

export interface FeedbackContextInput {
  raw: any;
  programId: number | string;
  longitudinal: any;
}

export interface FeedbackPayload {
  eventTypeCode: 'RETROALIMENTACION';
  eventDate: string;
  eventTime: string;
  stageId: number;
  programId: number;
  programProfessionalId: number;
  professionName: string | null;
  biopsychosocialCommitmentCode: string;
  resultCode: string;
}

export type FeedbackContextResult =
  | {
      valid: true;
      payload: FeedbackPayload;
    }
  | {
      valid: false;
      errorMessage: string;
    };

const allowedResultCodes = new Set([
  'LISTA_ESPERA',
  'INGRESO_TRATAMIENTO',
  'REFERENCIA',
  'ABANDONO',
]);

export function buildFeedbackContext(
  input: FeedbackContextInput,
): FeedbackContextResult {
  const { raw, programId, longitudinal } = input;

  const eventDate = formatDateForBackend(raw.eventDate);
  const eventTime = buildEventTime(raw.eventHour, raw.eventPeriod);
  const commitmentCode = toStringOrNull(
    raw.biopsychosocialCommitmentCode,
  );
  const resultCode = toStringOrNull(raw.resultCode)?.toUpperCase() ?? null;
  const programProfessionalId = Number(raw.programProfessionalId);

  if (!eventDate) {
    return {
      valid: false,
      errorMessage:
        'Debe seleccionar una fecha válida para la retroalimentación.',
    };
  }

  if (!eventTime) {
    return {
      valid: false,
      errorMessage:
        'Debe ingresar una hora válida y seleccionar AM o PM.',
    };
  }

  if (!programProfessionalId) {
    return {
      valid: false,
      errorMessage: 'Debe seleccionar el profesional responsable.',
    };
  }

  if (!commitmentCode) {
    return {
      valid: false,
      errorMessage:
        'Debe seleccionar el compromiso biopsicosocial.',
    };
  }

  if (!resultCode || !allowedResultCodes.has(resultCode)) {
    return {
      valid: false,
      errorMessage:
        'Debe seleccionar un resultado válido para la retroalimentación.',
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
      eventTypeCode: 'RETROALIMENTACION',
      eventDate,
      eventTime,
      stageId: Number(stageId),
      programId: Number(programId),
      programProfessionalId,
      professionName: toStringOrNull(raw.professionName),
      biopsychosocialCommitmentCode: commitmentCode,
      resultCode,
    },
  };
}

export function handleFeedbackSuccess(
  event: any,
): FeedbackSuccessResult {
  console.log('[DemandNew] Retroalimentación registrada:', event);

  return {
    successMessage: 'Retroalimentación registrada correctamente.',
    resetValue: {
      eventDate: new Date(),
      eventHour: '',
      eventPeriod: 'AM',
      programProfessionalId: null,
      professionName: '',
      biopsychosocialCommitmentCode: null,
      resultCode: null,
    },
  };
}