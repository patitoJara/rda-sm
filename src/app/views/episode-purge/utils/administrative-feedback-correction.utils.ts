function resolveEventTypeCode(event: any): string {
  return String(
    event?.eventType?.code ??
      event?.eventTypeCode ??
      '',
  )
    .trim()
    .toUpperCase();
}

function comparableAdministrativeFeedback(
  event: any,
): string {
  if (!event) {
    return '';
  }

  const {
    action: _action,
    ...comparable
  } = event;

  return JSON.stringify(comparable);
}

export function buildAdministrativeFeedbackCorrections(
  currentEvents: any[],
  originalEvents: any[],
  serializeEvent: (event: any) => any,
): any[] {
  const originalsById = new Map<number, any>();

  (Array.isArray(originalEvents) ? originalEvents : [])
    .filter(
      (event: any) =>
        resolveEventTypeCode(event) ===
        'RETROALIMENTACION',
    )
    .forEach((event: any) => {
      const id = Number(event?.id);

      if (Number.isInteger(id) && id > 0) {
        originalsById.set(id, event);
      }
    });

  const corrections: any[] = [];

  (Array.isArray(currentEvents) ? currentEvents : [])
    .filter(
      (event: any) =>
        resolveEventTypeCode(event) ===
        'RETROALIMENTACION',
    )
    .forEach((event: any) => {
      const id = Number(event?.id);

      const isCreate =
        event?.temporary === true ||
        id < 0;

      const isDelete =
        event?.markedForDeletion === true;

      const serializedCurrent =
        serializeEvent(event);

      if (isCreate || isDelete) {
        corrections.push(serializedCurrent);
        return;
      }

      const original =
        originalsById.get(id);

      if (!original) {
        corrections.push(serializedCurrent);
        return;
      }

      const serializedOriginal =
        serializeEvent(original);

      const changed =
        comparableAdministrativeFeedback(
          serializedCurrent,
        ) !==
        comparableAdministrativeFeedback(
          serializedOriginal,
        );

      if (changed) {
        corrections.push(serializedCurrent);
      }
    });

  return corrections;
}