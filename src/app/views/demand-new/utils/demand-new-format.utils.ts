export function formatDateForBackend(
  value: Date | string | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      return normalized;
    }
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getTodayForDateInput(): string {
  const today = new Date();
  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60_000,
  );

  return localDate.toISOString().slice(0, 10);
}

export function toStringOrNull(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text.length ? text : null;
}

export function formatRut(value: string | null | undefined): string {
  const clean = String(value ?? '')
    .replace(/\./g, '')
    .replace(/-/g, '')
    .trim()
    .toUpperCase();

  if (clean.length < 2) {
    return clean;
  }

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedBody}-${dv}`;
}

export function parseBackendDate(
  value: string | null | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  const dateOnly = value.substring(0, 10);
  const [year, month, day] = dateOnly.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}