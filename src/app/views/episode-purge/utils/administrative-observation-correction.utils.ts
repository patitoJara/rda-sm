export interface AdministrativeObservationCorrection {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  eventId?: number | null;
  stageId?: number | null;
  eventTypeCode?: string;
  eventDate?: string | null;
  eventTime?: string | null;
  comment?: string | null;
  observation?: string | null;
}

function normalizeText(value: unknown): string | null {
  const text = String(value ?? '').trim();

  return text || null;
}

function normalizeDate(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  const raw = String(value).trim();

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const displayMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);

  if (displayMatch) {
    return `${displayMatch[3]}-${displayMatch[2]}-${displayMatch[1]}`;
  }

  return null;
}

function normalizeTime(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (
    typeof value === 'object' &&
    value !== null
  ) {
    const hour = Number((value as any)?.hour);
    const minute = Number((value as any)?.minute);

    if (
      Number.isInteger(hour) &&
      Number.isInteger(minute) &&
      hour >= 0 &&
      hour <= 23 &&
      minute >= 0 &&
      minute <= 59
    ) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }

  const raw = String(value).trim();
  const match = /^(\d{1,2}):(\d{2})/.exec(raw);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
function resolveEventTypeCode(event: any): string {
  return String(
    event?.eventType?.code ??
    event?.eventTypeCode ??
    '',
  )
    .trim()
    .toUpperCase();
}

function resolveEventId(event: any): number | null {
  const id = Number(
    event?.eventId ??
    event?.id ??
    0,
  );

  return Number.isInteger(id) && id > 0 ? id : null;
}

function resolveStageId(
  event: any,
  fallbackStageId: number,
): number | null {
  const id = Number(
    event?.stageId ??
    event?.stage?.id ??
    fallbackStageId ??
    0,
  );

  return Number.isInteger(id) && id > 0 ? id : null;
}

export function syncAdministrativeObservationDrafts(
  correctionEvents: any[],
  observationDrafts: any[],
): void {
  const events = Array.isArray(correctionEvents)
    ? correctionEvents
    : [];

  const drafts = Array.isArray(observationDrafts)
    ? observationDrafts
    : [];

  drafts.forEach((draft: any) => {
    const draftId = Number(
      draft?.id ??
      draft?.eventId ??
      0,
    );

    if (!Number.isFinite(draftId) || draftId === 0) {
      return;
    }

    const event = events.find(
      (item: any) =>
        Number(
          item?.id ??
          item?.eventId ??
          0,
        ) === draftId,
    );

    if (!event || event?.markedForDeletion === true) {
      return;
    }

    event.eventDate = draft?.eventDate ?? event?.eventDate ?? null;
    event.eventTime = draft?.eventTime ?? event?.eventTime ?? null;
    event.comment = draft?.comment ?? null;
    event.observation = draft?.observation ?? null;
  });
}

export function buildAdministrativeObservationCorrections(
  currentEvents: any[],
  originalEvents: any[],
  fallbackStageId: number,
): AdministrativeObservationCorrection[] {
  const currentObservations = (currentEvents ?? []).filter(
    (event: any) =>
      resolveEventTypeCode(event) === 'OBSERVACION',
  );

  const originalObservations = (originalEvents ?? []).filter(
    (event: any) =>
      resolveEventTypeCode(event) === 'OBSERVACION',
  );

  const originalById = new Map<number, any>();

  originalObservations.forEach((event: any) => {
    const eventId = resolveEventId(event);

    if (eventId) {
      originalById.set(eventId, event);
    }
  });

  const corrections: AdministrativeObservationCorrection[] = [];

  currentObservations.forEach((event: any) => {
    const rawId = Number(event?.id ?? event?.eventId ?? 0);

    const isTemporary =
      event?.temporary === true ||
      rawId < 0;

    const eventId = resolveEventId(event);

    if (event?.markedForDeletion === true) {
      if (eventId) {
        corrections.push({
          action: 'DELETE',
          eventId,
        });
      }

      return;
    }

    const stageId = resolveStageId(
      event,
      fallbackStageId,
    );

    const eventDate = normalizeDate(event?.eventDate);
    const eventTime = normalizeTime(event?.eventTime);
    const comment = normalizeText(event?.comment);
    const observation = normalizeText(event?.observation);

    if (isTemporary) {
      corrections.push({
        action: 'CREATE',
        stageId,
        eventTypeCode: 'OBSERVACION',
        eventDate,
        eventTime,
        comment,
        observation,
      });

      return;
    }

    if (!eventId) {
      return;
    }

    const original = originalById.get(eventId);

    if (!original) {
      return;
    }

    const originalEventDate =
      normalizeDate(original?.eventDate);

    
    const originalEventTime =
      normalizeTime(original?.eventTime);
const originalComment =
      normalizeText(original?.comment);

    const originalObservation =
      normalizeText(original?.observation);

    const update: AdministrativeObservationCorrection = {
      action: 'UPDATE',
      eventId,
    };

    let changed = false;

    if (eventDate !== originalEventDate) {
      update.eventDate = eventDate;
      changed = true;
    }

    if (eventTime !== originalEventTime) {
      update.eventTime = eventTime;
      changed = true;
    }

    if (comment !== originalComment) {
      update.comment = comment;
      changed = true;
    }

    if (observation !== originalObservation) {
      update.observation = observation;
      changed = true;
    }

    if (changed) {
      corrections.push(update);
    }
  });

  return corrections;
}