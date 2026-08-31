import {
  getAttendanceForCitation,
} from './demand-new-citation.utils';

import {
  DemandChronologyMilestoneType,
  DemandChronologyPoint,
  validateDemandChronology,
} from './demand-new-datetime-validation.utils';
export interface CitationScheduleValidationInput {
  citationTypeCode: string;
  citationDate: string;
  citationTime: string;
  stageReceivedAt?: string | null;

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

function resolveCitationChronologyType(
  citationTypeCode: string,
): DemandChronologyMilestoneType | null {
  const milestoneByCitationCode: Record<
    string,
    DemandChronologyMilestoneType
  > = {
    [CITATION_CODES.c1e1]: 'C1_E1',
    [CITATION_CODES.c2e1]: 'C2_E1',
    [CITATION_CODES.c1e2]: 'C1_E2',
    [CITATION_CODES.c2e2]: 'C2_E2',
    [CITATION_CODES.c1e3]: 'C1_E3',
    [CITATION_CODES.c2e3]: 'C2_E3',
    ENTREVISTA_OPCIONAL: 'OPTIONAL_INTERVIEW',
  };

  return milestoneByCitationCode[citationTypeCode] ?? null;
}

const CITATION_CHRONOLOGY_SEQUENCE: ReadonlyArray<{
  code: string;
  type: DemandChronologyMilestoneType;
  label: string;
}> = [
  {
    code: CITATION_CODES.c1e1,
    type: 'C1_E1',
    label: 'C1-E1',
  },
  {
    code: CITATION_CODES.c2e1,
    type: 'C2_E1',
    label: 'C2-E1',
  },
  {
    code: CITATION_CODES.c1e2,
    type: 'C1_E2',
    label: 'C1-E2',
  },
  {
    code: CITATION_CODES.c2e2,
    type: 'C2_E2',
    label: 'C2-E2',
  },
  {
    code: CITATION_CODES.c1e3,
    type: 'C1_E3',
    label: 'C1-E3',
  },
  {
    code: CITATION_CODES.c2e3,
    type: 'C2_E3',
    label: 'C2-E3',
  },
  {
    code: 'ENTREVISTA_OPCIONAL',
    type: 'OPTIONAL_INTERVIEW',
    label: 'Entrevista opcional',
  },
];

function resolveOriginalCitationByCode(
  citationTypeCode: string,
  citationEvents: any[],
  citationTypes: any[],
): any | null {
  const matchingEvents = citationEvents
    .filter(
      (event: any) =>
        resolveCitationTypeCode(
          event,
          citationEvents,
          citationTypes,
        ) === citationTypeCode,
    )
    .sort((left: any, right: any) => {
      const leftDateTime = getCitationDateTime(left) ?? '';
      const rightDateTime = getCitationDateTime(right) ?? '';

      if (leftDateTime !== rightDateTime) {
        return leftDateTime.localeCompare(rightDateTime);
      }

      return Number(left?.id ?? 0) - Number(right?.id ?? 0);
    });

  return matchingEvents[0] ?? null;
}

export function buildOriginalCitationChronologyPoints(
  citationEvents: any[],
  citationTypes: any[],
): DemandChronologyPoint[] {
  return CITATION_CHRONOLOGY_SEQUENCE
    .map((item): DemandChronologyPoint | null => {
      const originalCitation = resolveOriginalCitationByCode(
        item.code,
        citationEvents,
        citationTypes,
      );

      if (!originalCitation) {
        return null;
      }

      return {
        type: item.type,
        label: item.label,
        date:
          originalCitation?.eventDate ??
          originalCitation?.citationDate ??
          null,
        time:
          originalCitation?.eventTime ??
          originalCitation?.citationTime ??
          null,
      };
    })
    .filter(
      (
        point,
      ): point is DemandChronologyPoint =>
        point !== null,
    );
}

function buildPreviousCitationChronologyPoints(
  citationTypeCode: string,
  citationEvents: any[],
  citationTypes: any[],
): DemandChronologyPoint[] {
  const currentIndex = CITATION_CHRONOLOGY_SEQUENCE.findIndex(
    (item) => item.code === citationTypeCode,
  );

  if (currentIndex <= 0) {
    return [];
  }

  const previousTypes = new Set(
    CITATION_CHRONOLOGY_SEQUENCE
      .slice(0, currentIndex)
      .map((item) => item.type),
  );

  return buildOriginalCitationChronologyPoints(
    citationEvents,
    citationTypes,
  ).filter((point) => previousTypes.has(point.type));
}

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

export function getCitationTypeAvailability(
  input: CitationTypeAvailabilityInput,
): CitationTypeAvailabilityResult {
  const {
    citationTypeCode,
    citationEvents,
    episodeEvents,
    citationTypes,
  } = input;

  const firstCitationCodeBySecondCitation: Partial<
    Record<string, string>
  > = {
    [CITATION_CODES.c2e1]: CITATION_CODES.c1e1,
    [CITATION_CODES.c2e2]: CITATION_CODES.c1e2,
    [CITATION_CODES.c2e3]: CITATION_CODES.c1e3,
  };

  const firstCitationCode =
    firstCitationCodeBySecondCitation[citationTypeCode] ?? null;

  if (firstCitationCode) {
    const firstCitation =
      [...citationEvents]
        .reverse()
        .find(
          (event: any) =>
            resolveCitationTypeCode(
              event,
              citationEvents,
              citationTypes,
            ) === firstCitationCode,
        ) ?? null;

    if (!firstCitation) {
      return {
        available: false,
        reason:
          'la primera citación de esta entrevista aún no ha sido registrada',
        kind: 'previous-required',
      };
    }

    const firstCitationAttendanceStatus =
      normalizeAttendanceStatus(
        firstCitation,
        episodeEvents,
      );

    if (firstCitationAttendanceStatus !== 'NO_SE_PRESENTO') {
      return {
        available: false,
        reason:
          'la segunda citación solo corresponde cuando la primera registra NO SE PRESENTÓ',
        kind: 'not-applicable',
      };
    }
  }

  const existingCitation =
    [...citationEvents]
      .reverse()
      .find(
        (event: any) =>
          resolveCitationTypeCode(
            event,
            citationEvents,
            citationTypes,
          ) === citationTypeCode,
      ) ?? null;

  /*
   * Las citaciones pueden programarse anticipadamente y no
   * dependen de la asistencia ni del cierre de entrevistas previas.
   *
   * Solo se bloquea el mismo tipo cuando ya existe una citación
   * vigente. Reprogramaciones/cancelaciones pueden volver a utilizarlo.
   */
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
    stageReceivedAt,
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
  const chronologyType =
    resolveCitationChronologyType(citationTypeCode);

  const isCitationRetry = citationEvents.some(
    (event: any) =>
      resolveCitationTypeCode(
        event,
        citationEvents,
        citationTypes,
      ) === citationTypeCode,
  );

  /*
   * Solo las citaciones originales participan en la cronología.
   * Las reprogramaciones/repeticiones quedan expresamente excluidas.
   */
  if (chronologyType && !isCitationRetry) {
    const previousPoints: DemandChronologyPoint[] = [];

    if (stageReceivedAt) {
      previousPoints.push({
        type: 'STAGE_RECEPTION',
        label: 'el ingreso a la etapa',
        date: stageReceivedAt,
      });
    }

    previousPoints.push(
      ...buildPreviousCitationChronologyPoints(
        citationTypeCode,
        citationEvents,
        citationTypes,
      ),
    );

    const chronologyValidation = validateDemandChronology({
      current: {
        type: chronologyType,
        label: 'Citación',
        date: citationDate,
        time: citationTime,
      },
      previousPoints,
    });

    if (!chronologyValidation.valid) {
      return {
        valid: false,
        errorMessage:
          chronologyValidation.errorMessage ??
          'La fecha y hora de la citación no respetan la cronología del episodio.',
      };
    }
  }
/*
   * Aquí permanecen únicamente las reglas funcionales propias
   * de citaciones.
   *
   * La cronología de fecha/hora será resuelta por el util
   * central de cronología del episodio.
   */
  for (const event of citationEvents) {
    const existingCode = resolveCitationTypeCode(
      event,
      citationEvents,
      citationTypes,
    );

    if (existingCode !== citationTypeCode) {
      continue;
    }

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
  }
  return { valid: true };
}
