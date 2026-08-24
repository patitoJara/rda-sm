export function normalizeEventTime(value: unknown): string {
  return String(value ?? '')
    .trim()
    .slice(0, 5);
}

export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function buildEventTime(
  hourValue: string | null | undefined,
  periodValue: string | null | undefined,
): string | null {
  const hourText = String(hourValue ?? '').trim();
  const period = String(periodValue ?? '')
    .trim()
    .toUpperCase();

  if (!hourText || !period) {
    return null;
  }

  const parts = hourText.split(':');

  if (parts.length !== 2) {
    return null;
  }

  let hour = Number(parts[0]);
  const minutes = Number(parts[1]);

  if (
    !Number.isFinite(hour) ||
    !Number.isFinite(minutes) ||
    hour < 1 ||
    hour > 12 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  if (period === 'PM' && hour < 12) {
    hour += 12;
  }

  if (period === 'AM' && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0',
  )}:00`;
}

export function buildEventTime24(
  hourValue: string | null | undefined,
): string | null {
  const hourText = String(hourValue ?? '').trim();

  const match = hourText.match(/^([01]\d|2[0-3]):([0-5]\d)$/);

  if (!match) {
    return null;
  }

  return `${match[1]}:${match[2]}:00`;
}

export function normalizeSemaphoreColor(
  value: string | null | undefined,
): string {
  return normalizeText(value);
}
export function resolveEventStageId(
  event: any,
): number | null {
  const stageId = Number(
    event?.stage?.id ??
      event?.stageId,
  );

  return Number.isFinite(stageId) && stageId > 0
    ? stageId
    : null;
}

export function resolveEventTypeCode(
  event: any,
): string {
  return normalizeText(
    event?.eventType?.code ??
      event?.eventTypeCode ??
      event?.type?.code ??
      event?.typeCode ??
      '',
  );
}

export function filterEventsByStageId(
  events: any[] | null | undefined,
  stageId: number | string | null | undefined,
): any[] {
  const normalizedStageId = Number(stageId);

  if (
    !Array.isArray(events) ||
    !Number.isFinite(normalizedStageId) ||
    normalizedStageId <= 0
  ) {
    return [];
  }

  return events.filter(
    (event: any) =>
      resolveEventStageId(event) === normalizedStageId,
  );
}

export function hasStageEventType(
  events: any[] | null | undefined,
  stageId: number | string | null | undefined,
  eventTypeCode: string,
): boolean {
  const normalizedType = normalizeText(eventTypeCode);

  if (!normalizedType) {
    return false;
  }

  return filterEventsByStageId(
    events,
    stageId,
  ).some(
    (event: any) =>
      resolveEventTypeCode(event) === normalizedType,
  );
}

export function hasStageReference(
  events: any[] | null | undefined,
  stageId: number | string | null | undefined,
): boolean {
  return hasStageEventType(
    events,
    stageId,
    'REFERENCIA',
  );
}

export function hasStageFormalClosure(
  events: any[] | null | undefined,
  stageId: number | string | null | undefined,
): boolean {
  return hasStageEventType(
    events,
    stageId,
    'CIERRE',
  );
}

export function filterStageCitationEvents(
  events: any[] | null | undefined,
  stageId: number | string | null | undefined,
): any[] {
  return filterEventsByStageId(
    events,
    stageId,
  ).filter((event: any) => {
    const code = resolveEventTypeCode(event);

    return (
      code === 'CITACION' ||
      code === 'NUEVA_CITACION'
    );
  });
}