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
      status.includes('CANCELAD') &&
      status.includes('PROGRAMA')
    )
  );
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

  const selectedDateTime =
    `${citationDate}T${normalizeTime(citationTime)}`;

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

    if (
      existingOrder < selectedOrder &&
      selectedDateTime < existingDateTime
    ) {
      return {
        valid: false,
        errorMessage:
          `La fecha y hora deben ser iguales o posteriores a ${existingName}.`,
      };
    }

    if (
      existingOrder > selectedOrder &&
      selectedDateTime > existingDateTime
    ) {
      return {
        valid: false,
        errorMessage:
          `La fecha y hora deben ser iguales o anteriores a ${existingName}.`,
      };
    }
  }

  return { valid: true };
}
