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

  const selectedCitationDate = String(
    selectedCitation?.eventDate ?? '',
  ).trim();

  if (!selectedCitationDate) {
    return {
      valid: false,
      errorMessage:
        'La citación seleccionada no tiene una fecha válida para registrar asistencia.',
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
export function logAttendanceResponse(event: any): void {
  console.log('[DemandNew] Respuesta asistencia registrada:', event);

  console.table([
    {
      id: event?.id,

      eventTypeCode:
        event?.eventType?.code ??
        event?.eventTypeCode ??
        event?.typeCode ??
        event?.code ??
        '',

      relatedEventId:
        event?.relatedEventId ??
        event?.relatedEvent?.id ??
        event?.citationEventId ??
        event?.citation?.id ??
        '',

      attendanceStatusId:
        event?.attendanceStatus?.id ??
        event?.attendanceStatusId ??
        '',

      attendanceStatusName:
        event?.attendanceStatus?.name ??
        event?.attendanceStatusName ??
        '',

      comment: event?.comment,
    },
  ]);
}
