export interface HandleAttendanceSuccessParams {
  event: any;
  episodeEvents: any[];
  resetForm: () => void;
  closePanel: () => void;
  reloadLongitudinal: () => void;
}

export interface AttendanceSuccessResult {
  episodeEvents: any[];
  successMessage: string;
}

export function handleAttendanceSuccess({
  event,
  episodeEvents,
  resetForm,
  closePanel,
  reloadLongitudinal,
}: HandleAttendanceSuccessParams): AttendanceSuccessResult {
  const updatedEpisodeEvents = event?.id
    ? [
        ...(episodeEvents ?? []).filter(
          (item: any) => Number(item.id) !== Number(event.id),
        ),
        event,
      ]
    : (episodeEvents ?? []);

  resetForm();
  closePanel();
  reloadLongitudinal();

  return {
    episodeEvents: updatedEpisodeEvents,
    successMessage: 'Asistencia registrada correctamente.',
  };
}
export function getAttendanceErrorMessage(error: any): string {
  if (error?.status === 403) {
    return 'No tiene permisos para registrar asistencia en el episodio.';
  }

  if (error?.status === 400) {
    return (
      error?.error?.message ||
      'No fue posible registrar la asistencia. Revise los datos ingresados.'
    );
  }

  return 'No fue posible registrar la asistencia. Intente nuevamente.';
}
export interface ValidateAttendanceContextParams {
  episodeId: number | null;
  programId: number | null;
  selectedCitation: any;
}

export type AttendanceContextValidationResult =
  | {
      valid: false;
      errorMessage: string;
    }
  | {
      valid: true;
      errorMessage: null;
      episodeId: number;
      programId: number;
      selectedCitation: any;
    };

export function validateAttendanceContext({
  episodeId,
  programId,
  selectedCitation,
}: ValidateAttendanceContextParams): AttendanceContextValidationResult {
  if (!episodeId) {
    return {
      valid: false,
      errorMessage:
        'No fue posible identificar el episodio para registrar asistencia.',
    };
  }

  if (!programId) {
    return {
      valid: false,
      errorMessage:
        'No fue posible identificar el programa activo para registrar asistencia.',
    };
  }

  if (!selectedCitation) {
    return {
      valid: false,
      errorMessage:
        'Debe seleccionar una citación válida para registrar asistencia.',
    };
  }

  return {
    valid: true,
    errorMessage: null,
    episodeId,
    programId,
    selectedCitation,
  };
}
