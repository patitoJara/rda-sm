export interface AdministrativeCitationAttendanceCorrections {
  citations: any[];
  attendances: any[];
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

function normalizeComparableValue(value: any): any {
  if (value === undefined) {
    return null;
  }

  if (
    value !== null &&
    typeof value === 'object'
  ) {
    return JSON.stringify(value);
  }

  return value;
}

function buildAdministrativeUpdate(
  current: any,
  original: any,
): any | null {
  const id = Number(
    current?.id ??
      current?.eventId ??
      original?.id ??
      original?.eventId,
  );

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  const update: any = {
    action: 'UPDATE',
    id,
    eventId: id,
  };

  const ignoredFields = new Set([
    'action',
    'id',
    'eventId',
  ]);

  const keys = new Set([
    ...Object.keys(original ?? {}),
    ...Object.keys(current ?? {}),
  ]);

  keys.forEach((key) => {
    if (ignoredFields.has(key)) {
      return;
    }

    const currentValue =
      normalizeComparableValue(current?.[key]);

    const originalValue =
      normalizeComparableValue(original?.[key]);

    if (currentValue !== originalValue) {
      update[key] =
        current?.[key] === undefined
          ? null
          : current?.[key];
    }
  });

  return Object.keys(update).length > 3
    ? update
    : null;
}

export function buildAdministrativeCitationAttendanceCorrections(
  currentEvents: any[],
  originalEvents: any[],
  serializeEvent: (event: any) => any,
): AdministrativeCitationAttendanceCorrections {
  const originalsById = new Map<number, any>();

  (Array.isArray(originalEvents) ? originalEvents : []).forEach(
    (event: any) => {
      const id = Number(event?.id);

      if (Number.isInteger(id) && id > 0) {
        originalsById.set(id, event);
      }
    },
  );

  const citations: any[] = [];
  const attendances: any[] = [];

  (Array.isArray(currentEvents) ? currentEvents : []).forEach(
    (event: any) => {
      const typeCode = resolveEventTypeCode(event);

      if (
        typeCode !== 'CITACION' &&
        typeCode !== 'ASISTENCIA'
      ) {
        return;
      }

      const id = Number(event?.id);

      const isCreate =
        event?.temporary === true ||
        id < 0;

      const isDelete =
        event?.markedForDeletion === true;

      let correction: any | null = null;

      if (isCreate) {
        correction = {
          ...serializeEvent(event),
          action: 'CREATE',
          id: null,
          eventId: null,
        };
      }
      else if (isDelete) {
        if (Number.isInteger(id) && id > 0) {
          correction = {
            action: 'DELETE',
            id,
            eventId: id,
          };
        }
      }
      else {
        const original =
          originalsById.get(id);

        if (!original) {
          correction = serializeEvent(event);
        }
        else {
          const serializedCurrent =
            serializeEvent(event);

          const serializedOriginal =
            serializeEvent(original);

          correction =
            buildAdministrativeUpdate(
              serializedCurrent,
              serializedOriginal,
            );
        }
      }

      if (!correction) {
        return;
      }

      if (typeCode === 'CITACION') {
        citations.push(correction);
      }
      else {
        attendances.push(correction);
      }
    },
  );

  return {
    citations,
    attendances,
  };
}