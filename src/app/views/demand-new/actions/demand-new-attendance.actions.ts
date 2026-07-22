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
    : episodeEvents ?? [];

  resetForm();
  closePanel();
  reloadLongitudinal();

  return {
    episodeEvents: updatedEpisodeEvents,
    successMessage: 'Asistencia registrada correctamente.',
  };
}