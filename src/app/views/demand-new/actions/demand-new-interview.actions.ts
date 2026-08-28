import {
  formatDateForBackend,
  toStringOrNull,
} from '../utils/demand-new-format.utils';
import { buildEventTime24 } from '../utils/demand-new-event.utils';

export interface FeedbackSuccessResult {
  successMessage: string;
  resetValue: {
    eventDate: Date | null;
    eventHour: string;
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
  const eventTime = buildEventTime24(raw.eventHour);
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
        'Debe ingresar una hora válida en formato HH:mm.',
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

export interface FeedbackConfirmation {
  title: string;
  message: string;
  confirmText: string;
}

export function buildFeedbackConfirmation(
  resultCode: string | null | undefined,
): FeedbackConfirmation {
  const normalizedResult = String(resultCode ?? '')
    .trim()
    .toUpperCase();

  const resultNameMap: Record<string, string> = {
    LISTA_ESPERA: 'Lista de espera',
    REFERENCIA: 'Referencia',
    INGRESO_TRATAMIENTO: 'Ingreso a tratamiento',
    ABANDONO: 'Abandono',
  };

  const effectMap: Record<string, string> = {
    LISTA_ESPERA:
      'La demanda permanecerá abierta en el programa actual y continuará el conteo de días.',
    REFERENCIA:
      'Se cerrará la atención del programa actual. El episodio permanecerá abierto y continuará su gestión en el programa receptor.',
    INGRESO_TRATAMIENTO:
      'Se cerrará la atención del programa actual, se cerrará el episodio y se detendrá el conteo de días.',
    ABANDONO:
      'Se cerrará la atención del programa actual, se cerrará el episodio y se detendrá el conteo de días.',
  };

  const resultName =
    resultNameMap[normalizedResult] ?? 'Resultado no identificado';

  const effect =
    effectMap[normalizedResult] ??
    'Se registrará la retroalimentación seleccionada para esta etapa.';

  return {
    title: 'Confirmar retroalimentación',
    message:
      `Resultado seleccionado: ${resultName}\n\n` +
      `${effect}\n\n` +
      'Al guardar la retroalimentación finalizará la etapa de entrevistas y no podrán registrarse nuevas citaciones en esta atención.\n\n' +
      '¿Desea continuar?',
    confirmText: 'Guardar retroalimentación',
  };
}
export function handleFeedbackSuccess(
  event: any,
): FeedbackSuccessResult {
  console.log('[DemandNew] Retroalimentación registrada:', event);

  return {
    successMessage: 'Retroalimentación registrada correctamente.',
    resetValue: {
      eventDate: null,
      eventHour: '',
      programProfessionalId: null,
      professionName: '',
      biopsychosocialCommitmentCode: null,
      resultCode: null,
    },
  };
}
