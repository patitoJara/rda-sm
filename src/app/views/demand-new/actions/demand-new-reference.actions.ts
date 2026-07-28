import { formatDateForBackend } from '../utils/demand-new-format.utils';

export interface ReferencePayload {
  targetProgramId: number;
  referenceDate: string;
  reason: string;
  observation?: string;
}

export type ReferenceContextResult =
  | {
      valid: true;
      payload: ReferencePayload;
    }
  | {
      valid: false;
      errorMessage: string;
    };

export function getAvailableReferencePrograms(
  programs: any[],
  currentProgramId: number | null | undefined,
): any[] {
  const normalizedCurrentProgramId = Number(currentProgramId);

  return [...(programs ?? [])]
    .filter((program: any) => {
      const id = Number(program?.id);

      return (
        id > 0 &&
        id !== normalizedCurrentProgramId &&
        program?.active !== false &&
        !program?.deletedAt
      );
    })
    .sort((left: any, right: any) =>
      String(left?.name ?? '').localeCompare(
        String(right?.name ?? ''),
        'es',
        { sensitivity: 'base' },
      ),
    );
}

export function buildReferenceContext(input: {
  raw: any;
  currentProgramId: number | null | undefined;
  originalRequestDate?: string | null;
  episodeEvents?: any[];
}): ReferenceContextResult {
  const targetProgramId = Number(input.raw?.targetProgramId);
  const currentProgramId = Number(input.currentProgramId);
  const referenceDate = formatDateForBackend(input.raw?.referenceDate);
  const reason = String(input.raw?.reason ?? '').trim();
  const observation =
    String(input.raw?.observation ?? '').trim() || undefined;

  if (!targetProgramId) {
    return {
      valid: false,
      errorMessage: 'Debe seleccionar el programa de destino.',
    };
  }

  if (targetProgramId === currentProgramId) {
    return {
      valid: false,
      errorMessage:
        'El programa de destino debe ser diferente al programa responsable.',
    };
  }

  if (!referenceDate) {
    return {
      valid: false,
      errorMessage: 'Debe seleccionar una fecha válida de referencia.',
    };
  }

  if (!reason) {
    return {
      valid: false,
      errorMessage: 'Debe registrar el motivo de la referencia.',
    };
  }

  const registeredDates = [
    input.originalRequestDate,
    ...(input.episodeEvents ?? []).map(
      (event: any) => event?.eventDate ?? event?.createdAt,
    ),
  ]
    .map((value: any) => String(value ?? '').slice(0, 10))
    .filter((value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    .sort((left: string, right: string) =>
      right.localeCompare(left),
    );

  const latestRegisteredDate = registeredDates[0] ?? null;

  if (
    latestRegisteredDate &&
    referenceDate < latestRegisteredDate
  ) {
    return {
      valid: false,
      errorMessage:
        'La fecha de referencia no puede ser anterior a la última gestión registrada.',
    };
  }

  return {
    valid: true,
    payload: {
      targetProgramId,
      referenceDate,
      reason,
      observation,
    },
  };
}

export function canRegisterReference(episode: any): boolean {
  const resultCode = String(
    episode?.result?.code ??
      episode?.resultCode ??
      episode?.currentResult?.code ??
      episode?.currentResultCode ??
      '',
  )
    .trim()
    .toUpperCase();

  return ['LISTA_ESPERA', 'REFERENCIA'].includes(resultCode);
}
export function getReferenceSuccessMessage(): string {
  return 'Referencia registrada correctamente.';
}
export function getReferenceErrorMessage(error: any): string {
  if (error?.status === 403) {
    return 'No tiene permisos para registrar la referencia.';
  }

  if (error?.status === 409) {
    return (
      error?.error?.message ||
      'La demanda no se encuentra en condiciones de ser derivada.'
    );
  }

  if (error?.status === 400) {
    return (
      error?.error?.message ||
      'Los datos de la referencia no son válidos.'
    );
  }

  return 'No fue posible registrar la referencia. Intente nuevamente.';
}