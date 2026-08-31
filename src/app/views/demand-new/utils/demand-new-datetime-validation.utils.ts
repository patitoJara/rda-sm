export type DemandChronologyMilestoneType =
  | 'EPISODE_CREATION'
  | 'STAGE_RECEPTION'
  | 'C1_E1'
  | 'C2_E1'
  | 'C1_E2'
  | 'C2_E2'
  | 'C1_E3'
  | 'C2_E3'
  | 'OPTIONAL_INTERVIEW'
  | 'FEEDBACK'
  | 'REFERENCE'
  | 'EPISODE_CLOSURE';

export interface DemandChronologyPoint {
  type: DemandChronologyMilestoneType;
  label: string;
  date: string | null | undefined;
  time?: string | null | undefined;
}

export interface DemandChronologyValidationInput {
  current: DemandChronologyPoint;
  previousPoints: DemandChronologyPoint[];
}

export interface DemandChronologyValidationResult {
  valid: boolean;
  errorMessage: string | null;
  previousPoint: DemandChronologyPoint | null;
}

interface NormalizedChronologyPoint {
  source: DemandChronologyPoint;
  date: string;
  time: string | null;
  comparableDate: number;
  comparableTime: number | null;
}

function normalizeDate(
  value: string | null | undefined,
): string | null {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return null;
  }

  const isoMatch = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  if (isoMatch) {
    const [, year, month, day] = isoMatch;

    return `${year}-${month}-${day}`;
  }

  const displayMatch = raw.match(
    /^(\d{2})[/-](\d{2})[/-](\d{4})$/,
  );

  if (displayMatch) {
    const [, day, month, year] = displayMatch;

    return `${year}-${month}-${day}`;
  }

  return null;
}

function normalizeTime(
  value: string | null | undefined,
): string | null {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return null;
  }

  const match = raw.match(
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = Number(match[3] ?? 0);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return [
    String(hour).padStart(2, '0'),
    String(minute).padStart(2, '0'),
    String(second).padStart(2, '0'),
  ].join(':');
}

function normalizePoint(
  point: DemandChronologyPoint,
): NormalizedChronologyPoint | null {
  const rawDate = String(point.date ?? '').trim();

  const combinedDateTimeMatch = rawDate.match(
    /^(\d{4}-\d{2}-\d{2})[T\s](\d{1,2}:\d{2}(?::\d{2})?)/,
  );

  const date = normalizeDate(
    combinedDateTimeMatch?.[1] ?? rawDate,
  );

  if (!date) {
    return null;
  }

  const time = normalizeTime(
    point.time ??
      combinedDateTimeMatch?.[2] ??
      null,
  );

  return {
    source: point,
    date,
    time,
    comparableDate: Number(date.replace(/-/g, '')),
    comparableTime:
      time !== null
        ? Number(time.replace(/:/g, ''))
        : null,
  };
}

function compareChronology(
  left: NormalizedChronologyPoint,
  right: NormalizedChronologyPoint,
): number {
  if (left.comparableDate !== right.comparableDate) {
    return left.comparableDate - right.comparableDate;
  }

  if (
    left.comparableTime !== null &&
    right.comparableTime !== null
  ) {
    return left.comparableTime - right.comparableTime;
  }

  /*
   * Si uno de los hitos no maneja hora,
   * la misma fecha se considera válida.
   */
  return 0;
}

function formatDisplayDate(date: string): string {
  const [year, month, day] = date.split('-');

  return `${day}/${month}/${year}`;
}

function formatDisplayTime(
  time: string | null,
): string | null {
  return time
    ? time.slice(0, 5)
    : null;
}

function formatPoint(
  point: NormalizedChronologyPoint,
): string {
  const date = formatDisplayDate(point.date);
  const time = formatDisplayTime(point.time);

  return time
    ? `${date} · ${time}`
    : date;
}

function buildChronologyErrorMessage(
  current: NormalizedChronologyPoint,
  previous: NormalizedChronologyPoint,
): string {
  return (
    `La fecha y hora ingresadas (${formatPoint(current)}) ` +
    `no pueden ser anteriores a ${previous.source.label} ` +
    `(${formatPoint(previous)}).`
  );
}

function resolveLatestPreviousPoint(
  previousPoints: DemandChronologyPoint[],
): NormalizedChronologyPoint | null {
  const normalizedPoints = previousPoints
    .map((point) => normalizePoint(point))
    .filter(
      (
        point,
      ): point is NormalizedChronologyPoint =>
        point !== null,
    );

  if (!normalizedPoints.length) {
    return null;
  }

  return normalizedPoints.reduce(
    (latest, current) =>
      compareChronology(current, latest) > 0
        ? current
        : latest,
  );
}

/**
 * Permite usar la misma regla cronológica en todo el episodio:
 *
 * - creación
 * - recepción de etapa/programa
 * - C1-E1
 * - C2-E1
 * - C1-E2
 * - C2-E2
 * - C1-E3
 * - C2-E3
 * - entrevista opcional
 * - retroalimentación
 * - referencia
 * - cierre
 *
 * No deben incluirse como previousPoints:
 * - asistencia
 * - observaciones
 * - reprogramaciones/repeticiones de citaciones
 *
 * Regla:
 * - fecha posterior: válida
 * - fecha igual: válida si la hora es igual o posterior
 * - fecha anterior: inválida
 * - misma fecha con hora anterior: inválida
 */
export function validateDemandChronology(
  input: DemandChronologyValidationInput,
): DemandChronologyValidationResult {
  const currentPoint = normalizePoint(input.current);

  if (!currentPoint) {
    return {
      valid: true,
      errorMessage: null,
      previousPoint: null,
    };
  }

  const previousPoint =
    resolveLatestPreviousPoint(input.previousPoints);

  if (!previousPoint) {
    return {
      valid: true,
      errorMessage: null,
      previousPoint: null,
    };
  }

  const comparison =
    compareChronology(
      currentPoint,
      previousPoint,
    );

  if (comparison < 0) {
    return {
      valid: false,
      errorMessage: buildChronologyErrorMessage(
        currentPoint,
        previousPoint,
      ),
      previousPoint: previousPoint.source,
    };
  }

  return {
    valid: true,
    errorMessage: null,
    previousPoint: previousPoint.source,
  };
}
