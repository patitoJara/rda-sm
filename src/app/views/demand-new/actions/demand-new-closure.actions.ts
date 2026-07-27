import { formatDateForBackend } from '../utils/demand-new-format.utils';

export interface ClosurePayload {
  closureDate: string;
}

export interface ClosureContextInput {
  raw: any;
  originalRequestDate?: string | null;
  episodeEvents?: any[];
}

export type ClosureContextResult =
  | {
      valid: true;
      payload: ClosurePayload;
    }
  | {
      valid: false;
      errorMessage: string;
    };

export function buildClosureContext(
  input: ClosureContextInput,
): ClosureContextResult {
  const closureDate = formatDateForBackend(input.raw?.closureDate);

  if (!closureDate) {
    return {
      valid: false,
      errorMessage: 'Debe seleccionar una fecha válida de cierre.',
    };
  }

  const registeredDates = [
    formatDateForBackend(input.originalRequestDate),
    ...(input.episodeEvents ?? []).map((event: any) =>
      formatDateForBackend(event?.eventDate),
    ),
  ].filter((date): date is string => !!date);

  const latestRegisteredDate =
    registeredDates.sort((left, right) =>
      right.localeCompare(left),
    )[0] ?? null;

  if (
    latestRegisteredDate &&
    closureDate < latestRegisteredDate
  ) {
    return {
      valid: false,
      errorMessage:
        `La fecha de cierre no puede ser anterior a la última gestión registrada (${formatDateLabel(
          latestRegisteredDate,
        )}).`,
    };
  }

  return {
    valid: true,
    payload: {
      closureDate,
    },
  };
}

function formatDateLabel(value: string): string {
  const [year, month, day] = value.split('-');

  return year && month && day
    ? `${day}/${month}/${year}`
    : value;
}

export function getClosureSuccessMessage(): string {
  return 'Demanda cerrada correctamente.';
}