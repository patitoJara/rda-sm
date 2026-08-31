import { formatDateForBackend } from '../utils/demand-new-format.utils';

export interface ReferencePayload {
  originStageId: number;
  destinationProgramId: number;
  reason: string;
  observation?: string;
  confirmImpact: boolean;
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
  originStageId: number | null | undefined;
  originalRequestDate?: string | null;
  episodeEvents?: any[];
}): ReferenceContextResult {
  const targetProgramId = Number(input.raw?.targetProgramId);
  const currentProgramId = Number(input.currentProgramId);
  const originStageId = Number(input.originStageId);
  const referenceDate = formatDateForBackend(input.raw?.referenceDate);
  const reason = String(input.raw?.reason ?? '').trim();
  const observation =
    String(input.raw?.observation ?? '').trim() || undefined;

  if (!originStageId) {
    return {
      valid: false,
      errorMessage: 'No fue posible identificar la etapa de origen.',
    };
  }

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

  return {
    valid: true,
    payload: {
      originStageId,
      destinationProgramId: targetProgramId,
      reason,
      observation,
      confirmImpact: true,
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