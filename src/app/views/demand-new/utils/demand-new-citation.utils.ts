import { todayDateOnly } from './demand-new-date.utils';
import {
  normalizeEventTime,
  normalizeText,
} from './demand-new-event.utils';

export function isExpiredCitation(item: any): boolean {
  const eventDate = String(item?.eventDate ?? '');

  return !!eventDate && eventDate < todayDateOnly();
}

export function isTodayCitation(item: any): boolean {
  const eventDate = String(item?.eventDate ?? '');

  return !!eventDate && eventDate === todayDateOnly();
}

export function isFutureCitation(item: any): boolean {
  const eventDate = String(item?.eventDate ?? '');

  return !!eventDate && eventDate > todayDateOnly();
}

export function getCitationNumber(
  item: any,
  citationEvents: any[],
): number {
  const ordered = [...(citationEvents ?? [])].sort((a: any, b: any) => {
    const dateA = `${a?.eventDate ?? ''}T${a?.eventTime ?? '00:00:00'}`;
    const dateB = `${b?.eventDate ?? ''}T${b?.eventTime ?? '00:00:00'}`;

    return dateA.localeCompare(dateB);
  });

  const index = ordered.findIndex(
    (event: any) => Number(event?.id) === Number(item?.id),
  );

  return index >= 0 ? index + 1 : 0;
}

export function getCitationTemporalLabel(item: any): string {
  if (isExpiredCitation(item)) {
    return 'Vencida pendiente';
  }

  if (isTodayCitation(item)) {
    return 'Citación de hoy';
  }

  if (isFutureCitation(item)) {
    return 'Próxima citación';
  }

  return 'Sin fecha';
}
export function getAttendanceForCitation(
  citation: any,
  episodeEvents: any[],
): any | null {
  const citationId = Number(citation?.id);

  if (!citationId) {
    return null;
  }

  const citationDate = String(citation?.eventDate ?? '').trim();
  const citationTime = normalizeEventTime(citation?.eventTime);
  const citationProfession = normalizeText(
    citation?.professionName ?? citation?.profession?.name,
  );

  const attendanceEvents = (episodeEvents ?? [])
    .filter((event: any) => {
      const code = normalizeText(
        event?.eventType?.code ??
          event?.eventTypeCode ??
          event?.typeCode ??
          event?.code,
      );

      return code === 'ASISTENCIA';
    })
    .sort((a: any, b: any) => {
      const dateA = String(a?.createdAt ?? '');
      const dateB = String(b?.createdAt ?? '');

      return dateB.localeCompare(dateA);
    });

  return (
    attendanceEvents.find((event: any) => {
      const relatedEventId = Number(
        event?.relatedEventId ??
          event?.relatedEvent?.id ??
          event?.citationEventId ??
          event?.citation?.id ??
          event?.parentEventId,
      );

      return relatedEventId === citationId;
    }) ??
    attendanceEvents.find((event: any) => {
      const eventDate = String(event?.eventDate ?? '').trim();
      const eventTime = normalizeEventTime(event?.eventTime);
      const eventProfession = normalizeText(
        event?.professionName ?? event?.profession?.name,
      );

      return (
        eventDate === citationDate &&
        eventTime === citationTime &&
        (!citationProfession || eventProfession === citationProfession)
      );
    }) ??
    null
  );
}

export function getCitationAttendanceLabel(
  citation: any,
  episodeEvents: any[],
): string {
  const attendance = getAttendanceForCitation(citation, episodeEvents);

  const statusFromAttendance =
    attendance?.attendanceStatus?.name ??
    attendance?.attendanceStatusName ??
    attendance?.attendanceStatus?.code ??
    attendance?.attendanceStatusCode ??
    null;

  const statusFromCitation =
    citation?.attendanceStatus?.name ??
    citation?.attendanceStatusName ??
    citation?.attendanceStatus?.code ??
    citation?.attendanceStatusCode ??
    null;

  return statusFromAttendance || statusFromCitation || 'Pendiente';
}
