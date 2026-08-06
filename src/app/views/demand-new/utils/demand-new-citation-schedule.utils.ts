import {
  getAttendanceForCitation,
} from './demand-new-citation.utils';
export interface CitationScheduleValidationInput {
  citationTypeCode: string;
  citationDate: string;
  citationTime: string;
  citationEvents: any[];

  episodeEvents: any[];
  citationTypes: any[];
}

export interface CitationScheduleValidationResult {
  valid: boolean;
  errorMessage?: string;
}

function normalizeTime(value: any): string {
  if (Array.isArray(value)) {
    const [hour = 0, minute = 0, second = 0] = value;

    return [hour, minute, second]
      .map((part) => String(part).padStart(2, '0'))
      .join(':');
  }

  const text = String(value ?? '').trim();

  return text.length === 5 ? `${text}:00` : text.slice(0, 8);
}

function getExplicitCitationCode(event: any): string {
  return String(
    event?.citationType?.code ??
      event?.citationTypeCode ??
      '',
  ).trim();
}

function getCitationDateTime(event: any): string | null {
  const date = String(
    event?.eventDate ??
      event?.citationDate ??
      '',
  ).trim();

  const time = normalizeTime(
    event?.eventTime ??
      event?.citationTime,
  );

  return date && time ? `${date}T${time}` : null;
}

function getEventIdentity(event: any): string {
  return String(
    event?.id ??
      `${getCitationDateTime(event)}-${event?.createdAt ?? ''}`,
  );
}

export function resolveCitationTypeCode(
  event: any,
  citationEvents: any[],
  citationTypes: any[],
): string {
  const explicitCode = getExplicitCitationCode(event);

  if (explicitCode) {
    return explicitCode;
  }

  const explicitCodes = new Set(
    citationEvents
      .map((item: any) => getExplicitCitationCode(item))
      .filter(Boolean),
  );

  const availableCodes = citationTypes
    .map((item: any) => String(item?.code ?? '').trim())
    .filter(
      (code: string) =>
        !!code && !explicitCodes.has(code),
    );

  const legacyEvents = citationEvents
    .filter(
      (item: any) => !getExplicitCitationCode(item),
    )
    .sort((left: any, right: any) => {
      const leftDate = getCitationDateTime(left) ?? '';
      const rightDate = getCitationDateTime(right) ?? '';

      if (leftDate !== rightDate) {
        return leftDate.localeCompare(rightDate);
      }

      return Number(left?.id ?? 0) - Number(right?.id ?? 0);
    });

  const eventIdentity = getEventIdentity(event);
  const legacyIndex = legacyEvents.findIndex(
    (item: any) =>
      getEventIdentity(item) === eventIdentity,
  );

  return legacyIndex >= 0
    ? availableCodes[legacyIndex] ?? ''
    : '';
}

function getCitationName(item: any): string {
  return String(item?.name ?? 'la citación registrada')
    .replace(/\.$/, '');
}

function normalizeAttendanceStatus(
  citation: any,
  episodeEvents: any[],
): string {
  const attendance = getAttendanceForCitation(
    citation,
    episodeEvents,
  );

  return String(
    attendance?.attendanceStatus?.code ??
      attendance?.attendanceStatusCode ??
      attendance?.attendanceStatus?.name ??
      attendance?.attendanceStatusName ??
      citation?.attendanceStatus?.code ??
      citation?.attendanceStatusCode ??
      citation?.attendanceStatus?.name ??
      citation?.attendanceStatusName ??
      '',
  )
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function allowsCitationTypeRetry(
  citation: any,
  episodeEvents: any[],
): boolean {
  const status = normalizeAttendanceStatus(
    citation,
    episodeEvents,
  );

  return (
    status.includes('REPROGRAM') ||
    (
      (
        status.includes('CANCELAD') ||
        status.includes('CANCELA')
      ) &&
      status.includes('PROGRAMA')
    )
  );
}

const CITATION_CODES = {
  c1e1: 'PRIMERA_CITACION_PRIMERA_ENTREVISTA',
  c2e1: 'SEGUNDA_CITACION_PRIMERA_ENTREVISTA',
  c1e2: 'PRIMERA_CITACION_SEGUNDA_ENTREVISTA',
  c2e2: 'SEGUNDA_CITACION_SEGUNDA_ENTREVISTA',
  c1e3: 'PRIMERA_CITACION_TERCERA_ENTREVISTA',
  c2e3: 'SEGUNDA_CITACION_TERCERA_ENTREVISTA',
} as const;

export interface CitationTypeAvailabilityInput {
  citationTypeCode: string;
  citationEvents: any[];
  episodeEvents: any[];
  citationTypes: any[];
}

export interface CitationTypeAvailabilityResult {
  available: boolean;
  reason: string | null;
  kind: 'available' | 'registered' | 'not-applicable' | 'previous-required';
}

function attendanceIsPresent(status: string): boolean {
  return (
    status === 'SE_PRESENTO' ||
    (
      !status.includes('NO_SE_PRESENT') &&
      status.includes('SE_PRESENT')
    )
  );
}

function attendanceIsAbsent(status: string): boolean {
  return (
    status === 'NO_SE_PRESENTO' ||
    status.includes('NO_SE_PRESENT')
  );
}

export function getCitationTypeAvailability(
  input: CitationTypeAvailabilityInput,
): CitationTypeAvailabilityResult {
  const {
    citationTypeCode,
    citationEvents,
    episodeEvents,
    citationTypes,
  } = input;

  const findCitation = (code: string): any | null =>
    [...citationEvents]
      .reverse()
      .find(
        (event: any) =>
          resolveCitationTypeCode(
            event,
            citationEvents,
            citationTypes,
          ) === code,
      ) ?? null;

  const existingCitation = findCitation(citationTypeCode);

  if (
    existingCitation &&
    !allowsCitationTypeRetry(existingCitation, episodeEvents)
  ) {
    return {
      available: false,
      reason: 'registrada',
      kind: 'registered',
    };
  }

  const statusOf = (code: string): string => {
    const citation = findCitation(code);

    return citation
      ? normalizeAttendanceStatus(citation, episodeEvents)
      : '';
  };

  const interviewCompleted = (
    firstCode: string,
    secondCode: string,
  ): boolean =>
    attendanceIsPresent(statusOf(firstCode)) ||
    attendanceIsPresent(statusOf(secondCode));

  if (citationTypeCode === CITATION_CODES.c2e1) {
    const firstStatus = statusOf(CITATION_CODES.c1e1);

    if (attendanceIsPresent(firstStatus)) {
      return {
        available: false,
        reason: 'no corresponde: primera entrevista completada',
        kind: 'not-applicable',
      };
    }

    if (!attendanceIsAbsent(firstStatus)) {
      return {
        available: false,
        reason: 'requiere inasistencia en C1-E1',
        kind: 'previous-required',
      };
    }
  }

  if (citationTypeCode === CITATION_CODES.c1e2) {
    if (
      !interviewCompleted(
        CITATION_CODES.c1e1,
        CITATION_CODES.c2e1,
      )
    ) {
      return {
        available: false,
        reason: 'complete primero la primera entrevista',
        kind: 'previous-required',
      };
    }
  }

  if (citationTypeCode === CITATION_CODES.c2e2) {
    const firstStatus = statusOf(CITATION_CODES.c1e2);

    if (attendanceIsPresent(firstStatus)) {
      return {
        available: false,
        reason: 'no corresponde: segunda entrevista completada',
        kind: 'not-applicable',
      };
    }

    if (!attendanceIsAbsent(firstStatus)) {
      return {
        available: false,
        reason: 'requiere inasistencia en C1-E2',
        kind: 'previous-required',
      };
    }
  }

  if (citationTypeCode === CITATION_CODES.c1e3) {
    if (
      !interviewCompleted(
        CITATION_CODES.c1e2,
        CITATION_CODES.c2e2,
      )
    ) {
      return {
        available: false,
        reason: 'complete primero la segunda entrevista',
        kind: 'previous-required',
      };
    }
  }

  if (citationTypeCode === CITATION_CODES.c2e3) {
    const firstStatus = statusOf(CITATION_CODES.c1e3);

    if (attendanceIsPresent(firstStatus)) {
      return {
        available: false,
        reason: 'no corresponde: tercera entrevista completada',
        kind: 'not-applicable',
      };
    }

    if (!attendanceIsAbsent(firstStatus)) {
      return {
        available: false,
        reason: 'requiere inasistencia en C1-E3',
        kind: 'previous-required',
      };
    }
  }

  return {
    available: true,
    reason: null,
    kind: 'available',
  };
}

export function validateCitationSchedule(
  input: CitationScheduleValidationInput,
): CitationScheduleValidationResult {
  const {
    citationTypeCode,
    citationDate,
    citationTime,
    citationEvents,
    episodeEvents,
    citationTypes,
  } = input;

  const selectedOrder = citationTypes.findIndex(
    (item: any) => item?.code === citationTypeCode,
  );

  if (selectedOrder < 0) {
    return {
      valid: false,
      errorMessage:
        'El tipo de citación no pertenece al catálogo vigente.',
    };
  }

  const availability = getCitationTypeAvailability({
    citationTypeCode,
    citationEvents,
    episodeEvents,
    citationTypes,
  });

  if (!availability.available) {
    return {
      valid: false,
      errorMessage:
        availability.kind === 'registered'
          ? 'Este tipo de citación ya fue registrado y continúa vigente.'
          : `No es posible registrar esta citación: ${availability.reason}.`,
    };
  }

  const selectedTime = normalizeTime(citationTime);

  for (const event of citationEvents) {
    const existingCode = resolveCitationTypeCode(
      event,
      citationEvents,
      citationTypes,
    );

    const existingOrder = citationTypes.findIndex(
      (item: any) => item?.code === existingCode,
    );

    if (existingOrder < 0) {
      continue;
    }

    if (existingCode === citationTypeCode) {
      if (
        !allowsCitationTypeRetry(
          event,
          episodeEvents,
        )
      ) {
        return {
          valid: false,
          errorMessage:
            'Este tipo de citación ya fue registrado y continúa vigente.',
        };
      }

      continue;
    }

    const existingDateTime = getCitationDateTime(event);

    if (!existingDateTime) {
      continue;
    }

    const existingName = getCitationName(
      citationTypes[existingOrder],
    );

    const existingDate = existingDateTime.slice(0, 10);
    const existingTime = existingDateTime.slice(11, 19);

    const selectedDateLabel =
      citationDate.split('-').reverse().join('/');

    const existingDateLabel =
      existingDate.split('-').reverse().join('/');

    if (existingOrder < selectedOrder) {
      if (citationDate < existingDate) {
        return {
          valid: false,
          errorMessage:
            `La fecha seleccionada (${selectedDateLabel}) no puede ser anterior ` +
            `a ${existingName} (${existingDateLabel}).`,
        };
      }

      if (
        citationDate === existingDate &&
        selectedTime <= existingTime
      ) {
        return {
          valid: false,
          errorMessage:
            `Para el ${selectedDateLabel}, la hora seleccionada ` +
            `(${selectedTime.slice(0, 5)}) debe ser posterior a ` +
            `${existingName} (${existingTime.slice(0, 5)}).`,
        };
      }
    }

    if (existingOrder > selectedOrder) {
      if (citationDate > existingDate) {
        return {
          valid: false,
          errorMessage:
            `La fecha seleccionada (${selectedDateLabel}) no puede ser posterior ` +
            `a ${existingName} (${existingDateLabel}).`,
        };
      }

      if (
        citationDate === existingDate &&
        selectedTime >= existingTime
      ) {
        return {
          valid: false,
          errorMessage:
            `Para el ${selectedDateLabel}, la hora seleccionada ` +
            `(${selectedTime.slice(0, 5)}) debe ser anterior a ` +
            `${existingName} (${existingTime.slice(0, 5)}).`,
        };
      }
    }
  }

  return { valid: true };
}
