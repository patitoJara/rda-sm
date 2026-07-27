function normalizeCode(value: any): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getEventTimestamp(event: any): string {
  return String(
    event?.createdAt ??
      `${event?.eventDate ?? ''}T${event?.eventTime ?? '00:00:00'}`,
  );
}

function getRelatedEventId(event: any): number | null {
  const value =
    event?.relatedEventId ??
    event?.relatedEvent?.id ??
    event?.citationEventId ??
    null;

  return value ? Number(value) : null;
}

function getAttendanceStatusCode(event: any): string {
  return normalizeCode(
    event?.attendanceStatus?.code ??
      event?.attendanceStatusCode ??
      event?.attendanceStatus?.name ??
      '',
  );
}

export function filterPresentedCitations(
  citationEvents: any[],
  episodeEvents: any[],
): any[] {
  return citationEvents.filter((citation: any) => {
    const attendanceEvents = episodeEvents
      .filter(
        (event: any) =>
          getRelatedEventId(event) === Number(citation?.id) &&
          !!getAttendanceStatusCode(event),
      )
      .sort((left: any, right: any) =>
        getEventTimestamp(right).localeCompare(
          getEventTimestamp(left),
        ),
      );

    const attendance =
      attendanceEvents[0] ??
      citation;

    return getAttendanceStatusCode(attendance) === 'SE_PRESENTO';
  });
}

export function filterFeedbackEvents(
  episodeEvents: any[],
): any[] {
  return episodeEvents
    .filter((event: any) => {
      const code = normalizeCode(
        event?.eventType?.code ??
          event?.eventTypeCode,
      );

      return code === 'RETROALIMENTACION';
    })
    .sort((left: any, right: any) => {
      const leftDate =
        `${left?.eventDate ?? ''}T${left?.eventTime ?? '00:00:00'}`;
      const rightDate =
        `${right?.eventDate ?? ''}T${right?.eventTime ?? '00:00:00'}`;

      return leftDate.localeCompare(rightDate);
    });
}

export function getCommitmentLevelLabel(
  event: any,
): string {
  return String(
    event?.biopsychosocialCommitmentLevel?.name ??
      event?.biopsychosocialCommitmentLevel?.code ??
      event?.biopsychosocialCommitmentCode ??
      'Sin compromiso informado',
  );
}