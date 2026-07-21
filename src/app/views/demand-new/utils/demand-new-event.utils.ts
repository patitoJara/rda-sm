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

export function normalizeSemaphoreColor(
  value: string | null | undefined,
): string {
  return normalizeText(value);
}